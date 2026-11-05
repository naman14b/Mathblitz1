"""Centralized Backend AI / LLM Service for FunGanit.
Manages provider routing, timeouts, controlled retries, caching, token optimization, and graceful fallbacks.
"""
import asyncio
import json
import logging
import random
from typing import Any, Dict, List, Optional

import httpx

from ..config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
from .cache import ai_cache
from .prompts import (
    COACH_FEEDBACK_SYSTEM_PROMPT,
    COACH_LESSON_SYSTEM_PROMPT,
    COACH_QA_SYSTEM_PROMPT,
    MATH_BOSS_SYSTEM_PROMPT,
    build_boss_reaction_prompt,
    build_boss_taunt_prompt,
    build_coach_feedback_prompt,
    build_coach_lesson_prompt,
    build_coach_qa_prompt,
)

logger = logging.getLogger(__name__)

# ── Feature Configuration Profiles ───────────────────────────────────────────
FEATURE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "boss_taunt": {
        "timeout": 2.5,
        "max_tokens": 60,
        "temperature": 0.7,
        "cache_ttl": 3600,       # 1 hour
    },
    "boss_reaction": {
        "timeout": 2.5,
        "max_tokens": 60,
        "temperature": 0.7,
        "cache_ttl": 3600,       # 1 hour
    },
    "coach_lesson": {
        "timeout": 5.0,
        "max_tokens": 450,
        "temperature": 0.3,
        "cache_ttl": 86400,      # 24 hours
    },
    "coach_feedback": {
        "timeout": 2.0,
        "max_tokens": 80,
        "temperature": 0.3,
        "cache_ttl": 86400,      # 24 hours
    },
    "coach_qa": {
        "timeout": 3.5,
        "max_tokens": 150,
        "temperature": 0.3,
        "cache_ttl": 21600,      # 6 hours
    },
}

# ── Math Boss Curated Fallbacks ───────────────────────────────────────────────
FALLBACK_TAUNTS: Dict[int, List[str]] = {
    1: [
        "Oh look, a challenger! Think your fingers can keep up with mental arithmetic? Prove it!",
        "Welcome! Let's see if your human brain is faster than my calculator!",
        "A 10-win streak? Not bad! Now let's see how you handle real pressure!",
        "Ha! You think you're good at numbers? Let's dance with rapid arithmetic!",
    ],
    2: [
        "Back for more? I've upgraded my difficulty since last time. Good luck!",
        "The champion returns! Let's see if your speed holds against tougher numbers.",
        "Round 2! These equations don't play nice. Keep your focus sharp!",
    ],
    3: [
        "Still standing? Level {level} arithmetic moves fast. Don't blink!",
        "I've sharpened my questions to a razor's edge. Your tokens are on the line!",
    ],
}

FALLBACK_DEFEAT: List[str] = [
    "WHAT?! Impossible! You actually beat me! Take your tokens, I'll be back stronger!",
    "No... my calculations! You were too fast! Enjoy the victory, champion!",
    "Okay, you win this round! Next time I won't be so easy!",
]

FALLBACK_WIN: List[str] = [
    "HAHAHA! Too slow! Better luck next time, human!",
    "As expected! The Math Boss reigns supreme! Practice and try again!",
    "Crunching numbers is my specialty! Keep practicing your speed!",
]


class LLMService:
    """Centralized LLM router with intelligent caching, latency guardrails, and graceful fallbacks."""

    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.base_url = OPENROUTER_BASE_URL.rstrip("/")
        self.default_model = OPENROUTER_MODEL

    def get_model(self, feature: str) -> str:
        """Route to appropriate model by feature."""
        return self.default_model

    async def generate_response(
        self,
        feature: str,
        messages: List[Dict[str, str]],
        cache_key: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> Optional[str]:
        """Execute request to LLM with cache-lookup, strict timeout, and controlled single-retry."""
        # 1. Check in-memory TTL Cache
        if cache_key:
            cached_val = ai_cache.get(cache_key)
            if cached_val:
                logger.debug(f"[LLMService] Cache hit for key: {cache_key}")
                return cached_val

        # 2. Check API key availability
        if not self.api_key:
            logger.info(f"[LLMService] No API key configured. Bypassing network call for {feature}.")
            return None

        cfg = FEATURE_CONFIGS.get(feature, {
            "timeout": 3.0,
            "max_tokens": 100,
            "temperature": 0.4,
            "cache_ttl": 3600,
        })

        selected_model = model_override or self.get_model(feature)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://funganit.app",
            "X-Title": "FunGanit",
        }
        payload = {
            "model": selected_model,
            "messages": messages,
            "temperature": cfg["temperature"],
            "max_tokens": cfg["max_tokens"],
        }

        # 3. Network call with controlled retry (max 1 retry on transient network errors)
        attempts = 2
        for attempt in range(attempts):
            try:
                async with httpx.AsyncClient(timeout=cfg["timeout"]) as client:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices") or []
                        if choices:
                            msg = choices[0].get("message") or {}
                            raw_content = (msg.get("content") or "").strip()
                            if raw_content:
                                # Strip outer quotes if single-line string
                                if (raw_content.startswith('"') and raw_content.endswith('"')) or (
                                    raw_content.startswith("'") and raw_content.endswith("'")
                                ):
                                    raw_content = raw_content[1:-1].strip()

                                # Save into TTL cache
                                if cache_key and raw_content:
                                    ai_cache.set(cache_key, raw_content, ttl_seconds=cfg["cache_ttl"])

                                return raw_content

                    # Unrecoverable status codes: don't retry, fail fast
                    if resp.status_code in (401, 403, 429, 503):
                        logger.warning(
                            f"[LLMService] OpenRouter returned status {resp.status_code}. Aborting retry."
                        )
                        return None

                    logger.warning(
                        f"[LLMService] Attempt {attempt+1} failed with status {resp.status_code}"
                    )

            except (httpx.TimeoutException, httpx.RequestError) as exc:
                logger.warning(f"[LLMService] Attempt {attempt+1} network error: {exc}")
                if attempt < attempts - 1:
                    await asyncio.sleep(0.3)

            except Exception as exc:
                logger.warning(f"[LLMService] Unexpected error: {exc}")
                break

        return None

    # ── High-Level Feature Endpoints ──────────────────────────────────────────

    async def get_boss_taunt(self, level: int, player_name: str = "Player", wins: int = 10) -> str:
        """Fetch or generate dynamic Math Boss taunt with caching & deterministic fallback."""
        # Non-PII Cache key: level and bracketed wins (e.g., 10, 20, 30)
        wins_bracket = (wins // 10) * 10
        cache_key = f"boss_taunt:lvl_{level}:wins_{wins_bracket}"

        prompt = build_boss_taunt_prompt(level, player_name, wins)
        messages = [
            {"role": "system", "content": MATH_BOSS_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        result = await self.generate_response("boss_taunt", messages, cache_key=cache_key)
        if result and len(result) > 8:
            return result

        # Curated Fallback
        tier = min(level, 3)
        choices = FALLBACK_TAUNTS.get(tier, FALLBACK_TAUNTS[1])
        template = random.choice(choices)
        fallback_text = template.format(level=level, player=player_name, wins=wins)
        ai_cache.set(cache_key, fallback_text, ttl_seconds=FEATURE_CONFIGS["boss_taunt"]["cache_ttl"])
        return fallback_text

    async def get_boss_reaction(
        self,
        level: int,
        correct: int,
        total: int,
        won: bool,
        player_name: str = "Player",
    ) -> str:
        """Fetch or generate dynamic Math Boss reaction with caching & deterministic fallback."""
        # Score bracket for caching without player-specific leaks
        score_bracket = (correct * 10) // max(total, 1)
        cache_key = f"boss_reaction:lvl_{level}:won_{won}:b_{score_bracket}"

        prompt = build_boss_reaction_prompt(level, correct, total, won, player_name)
        messages = [
            {"role": "system", "content": MATH_BOSS_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        result = await self.generate_response("boss_reaction", messages, cache_key=cache_key)
        if result and len(result) > 8:
            return result

        fallback_reaction = random.choice(FALLBACK_DEFEAT if won else FALLBACK_WIN)
        ai_cache.set(cache_key, fallback_reaction, ttl_seconds=FEATURE_CONFIGS["boss_reaction"]["cache_ttl"])
        return fallback_reaction

    async def get_coach_feedback(
        self,
        prompt: str,
        student_ans: str,
        correct_ans: str,
        method: str,
    ) -> str:
        """Fetch or generate concise 1-sentence wrong-answer feedback with caching."""
        fingerprint = ai_cache.hash_str(f"{prompt}:{student_ans}:{correct_ans}")
        cache_key = f"coach_feedback:{fingerprint}"

        user_content = build_coach_feedback_prompt(prompt, student_ans, correct_ans, method)
        messages = [
            {"role": "system", "content": COACH_FEEDBACK_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        result = await self.generate_response("coach_feedback", messages, cache_key=cache_key)
        if result and len(result) > 5:
            return result

        # High quality deterministic fallback
        return f"The correct answer is {correct_ans}. Remember: {method}"

    async def get_coach_qa(
        self,
        prompt: str,
        correct_ans: str,
        student_ans: str,
        topic: str,
        query: str,
    ) -> str:
        """Answer student question about a specific problem step with caching."""
        fingerprint = ai_cache.hash_str(f"{prompt}:{student_ans}:{query}")
        cache_key = f"coach_qa:{fingerprint}"

        user_content = build_coach_qa_prompt(prompt, correct_ans, student_ans, topic, query)
        messages = [
            {"role": "system", "content": COACH_QA_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        result = await self.generate_response("coach_qa", messages, cache_key=cache_key)
        if result and len(result) > 10:
            return result

        return (
            f"For '{prompt}', the correct result is {correct_ans}. "
            "Double-check your inverse operations and arithmetic steps."
        )


# Global service instance
llm_service = LLMService()
