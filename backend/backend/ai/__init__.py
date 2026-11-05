"""Centralized AI Service Package for FunGanit."""
from .cache import ai_cache
from .llm_service import llm_service
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

__all__ = [
    "ai_cache",
    "llm_service",
    "MATH_BOSS_SYSTEM_PROMPT",
    "COACH_LESSON_SYSTEM_PROMPT",
    "COACH_FEEDBACK_SYSTEM_PROMPT",
    "COACH_QA_SYSTEM_PROMPT",
    "build_boss_taunt_prompt",
    "build_boss_reaction_prompt",
    "build_coach_lesson_prompt",
    "build_coach_feedback_prompt",
    "build_coach_qa_prompt",
]
