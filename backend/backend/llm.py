"""OpenRouter AI integration for MathBlitz using Qwen and other LLM models."""
import asyncio
import logging
import random
from typing import Any, Dict, List, Optional

import httpx

from .config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL

logger = logging.getLogger(__name__)

# Built-in fallback taunts if OpenRouter is unreachable or rate-limited
FALLBACK_TAUNTS: Dict[int, List[str]] = {
    1: [
        "Oh look, a tiny mathematician! Think you can handle 20 questions in 2 minutes? I doubt it.",
        "Welcome, human! I've been waiting. Let's see if your brain is faster than my calculator.",
        "So you've won {wins} games? Cute. Now face a REAL challenge!",
        "Ha! You think you're good at maths? I eat numbers for breakfast!",
        "Surprise! Your winning streak caught my attention. Prove you deserve those tokens!",
    ],
    2: [
        "Back for more? I've upgraded my questions since last time. Good luck — you'll need it!",
        "Oh, the little champion returns! Let's see if your luck holds against HARDER numbers.",
        "You beat my minion, but I'm the real deal. These numbers don't play nice!",
        "Impressed you survived round 1. Round 2 won't be so forgiving!",
        "Remember me? I've been studying your weaknesses. Prepare for pain!",
    ],
    3: [
        "Still here? Most humans run away by now. But fine, let's dance with BIG numbers!",
        "Level {level}? You're either brave or foolish. Let me guess — both!",
        "I've sharpened my questions to a razor's edge. Your tokens are MINE!",
        "The legends spoke of a human who could defeat me three times. Spoiler: they couldn't.",
        "Every operation, every number — all designed to crush your confidence!",
    ],
}

FALLBACK_DEFEAT: List[str] = [
    "WHAT?! Impossible! You... you actually beat me! Fine, take your tokens. I'll be back STRONGER!",
    "No... NO! My beautiful equations! You demolished them! I'll have my revenge!",
    "Okay okay, you win THIS time. But mark my words — next time, NO MERCY!",
    "I can't believe it. A human outsmarted me. I need to recalibrate...",
    "*explodes in mathematical fury* Take your 10 tokens and GO!",
    "You... you monster! Those were my best questions! I'll be back with HARDER ones!",
]

FALLBACK_WIN: List[str] = [
    "HAHAHA! Too slow! Your tokens are MINE now! Better luck next time, human!",
    "As expected! No human can defeat the mighty Math Boss! *eats 10 tokens*",
    "Pathetic! My grandmother calculates faster, and she's an abacus!",
    "That's right, hand over those tokens! Come back when you've actually studied!",
    "CRUSHED! Your math skills need serious work. I'll be waiting for round 2!",
    "Another victim! Your tokens taste delicious. Practice more and try again!",
]


async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.8,
    max_tokens: int = 150,
    timeout: float = 5.0,
) -> Optional[str]:
    """Call OpenRouter Chat Completions API. Returns None on failure/rate limit."""
    if not OPENROUTER_API_KEY:
        logger.warning("[OpenRouter] No OPENROUTER_API_KEY configured.")
        return None

    selected_model = model or OPENROUTER_MODEL
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mathblitz.app",
        "X-Title": "MathBlitz",
    }
    payload = {
        "model": selected_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Clean any outer quotes
                if (content.startswith('"') and content.endswith('"')) or (content.startswith("'") and content.endswith("'")):
                    content = content[1:-1].strip()
                return content
            else:
                logger.warning(
                    f"[OpenRouter] API returned status {resp.status_code} for model {selected_model}: {resp.text[:120]}"
                )
                return None
    except Exception as exc:
        logger.warning(f"[OpenRouter] Request failed: {exc}")
        return None


async def generate_boss_taunt(level: int, player_name: str = "Player", wins: int = 10) -> str:
    """Generate a dynamic, sassy Math Boss taunt using OpenRouter with fallback."""
    prompt = (
        f"You are the Math Boss (Level {level}) in MathBlitz. "
        f"The player {player_name} has won {wins} games and now faces you in a rapid 2-minute arithmetic showdown. "
        f"Deliver a short, funny, 1-to-2 sentence theatrical taunt mocking their speed and challenging their math skills. "
        f"Do not include quotes or intro text, just the taunt."
    )
    messages = [
        {"role": "system", "content": "You are a witty, dramatic, competitive math boss in an arcade math game."},
        {"role": "user", "content": prompt},
    ]

    llm_taunt = await chat_completion(messages, timeout=4.0)
    if llm_taunt and len(llm_taunt) > 10:
        return llm_taunt

    # Fallback to curated templates
    tier = min(level, 3)
    template = random.choice(FALLBACK_TAUNTS[tier])
    return template.format(player=player_name, wins=wins, level=level)


async def generate_boss_reaction(
    level: int,
    correct: int,
    total: int,
    won: bool,
    player_name: str = "Player",
) -> str:
    """Generate dynamic reaction when player finishes the Math Boss encounter."""
    outcome = "lost to" if won else "defeated"
    sentiment = "devastated, dramatic rage and shock" if won else "gloating, mocking triumph"
    prompt = (
        f"You are the Math Boss (Level {level}) in MathBlitz. "
        f"Player {player_name} scored {correct}/{total} questions and {outcome} you. "
        f"Express {sentiment} in 1 to 2 funny, punchy sentences. "
        f"Do not include quotes or intro text."
    )
    messages = [
        {"role": "system", "content": "You are a theatrical arcade math boss reacting to a match result."},
        {"role": "user", "content": prompt},
    ]

    llm_reaction = await chat_completion(messages, timeout=4.0)
    if llm_reaction and len(llm_reaction) > 10:
        return llm_reaction

    return random.choice(FALLBACK_DEFEAT if won else FALLBACK_WIN)
