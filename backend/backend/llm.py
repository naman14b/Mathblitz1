"""OpenRouter AI integration for FunGanit.
Delegates to centralized LLMService with caching, token pruning, and graceful fallbacks.
"""
import logging
from typing import Any, Dict, List, Optional

from .ai.llm_service import (
    FALLBACK_DEFEAT,
    FALLBACK_TAUNTS,
    FALLBACK_WIN,
    llm_service,
)
from .config import OPENROUTER_MODEL

logger = logging.getLogger(__name__)


async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.8,
    max_tokens: int = 150,
    timeout: float = 5.0,
) -> Optional[str]:
    """Call OpenRouter Chat Completions API with caching & controlled retry."""
    return await llm_service.generate_response(
        feature="boss_taunt",
        messages=messages,
        model_override=model,
    )


async def generate_boss_taunt(level: int, player_name: str = "Player", wins: int = 10) -> str:
    """Generate a dynamic, sassy Math Boss taunt using centralized LLMService with caching and fallback."""
    return await llm_service.get_boss_taunt(level=level, player_name=player_name, wins=wins)


async def generate_boss_reaction(
    level: int,
    correct: int,
    total: int,
    won: bool,
    player_name: str = "Player",
) -> str:
    """Generate dynamic reaction when player finishes the Math Boss encounter using centralized LLMService."""
    return await llm_service.get_boss_reaction(
        level=level,
        correct=correct,
        total=total,
        won=won,
        player_name=player_name,
    )
