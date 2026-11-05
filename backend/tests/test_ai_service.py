"""Unit and integration tests for FunGanit Centralized AI Service & Cache."""
import asyncio
import pytest
from backend.ai.cache import TTLCache, ai_cache
from backend.ai.llm_service import llm_service, FEATURE_CONFIGS
from backend.ai.prompts import (
    build_boss_reaction_prompt,
    build_boss_taunt_prompt,
    build_coach_feedback_prompt,
    build_coach_lesson_prompt,
    build_coach_qa_prompt,
)


def test_ttl_cache_basics():
    cache = TTLCache(max_size=5)
    cache.set("k1", "val1", ttl_seconds=10)
    assert cache.get("k1") == "val1"
    assert cache.get("nonexistent") is None

    # Expired check
    cache.set("k2", "val2", ttl_seconds=-1)
    assert cache.get("k2") is None


def test_ttl_cache_lru_eviction():
    cache = TTLCache(max_size=3)
    cache.set("a", 1, ttl_seconds=100)
    cache.set("b", 2, ttl_seconds=100)
    cache.set("c", 3, ttl_seconds=100)
    # Access "a" so it is most recently used
    _ = cache.get("a")
    # Add "d", should evict "b" (least recently used)
    cache.set("d", 4, ttl_seconds=100)
    assert cache.get("b") is None
    assert cache.get("a") == 1
    assert cache.get("c") == 3
    assert cache.get("d") == 4


def test_ttl_cache_hash_helper():
    h1 = TTLCache.hash_str("Solve for x: 2x = 10")
    h2 = TTLCache.hash_str("solve for x: 2x = 10  ")
    assert h1 == h2
    assert len(h1) == 16


def test_boss_taunt_with_fallback_and_cache():
    async def _run():
        ai_cache.clear()
        taunt1 = await llm_service.get_boss_taunt(level=1, player_name="Tester", wins=10)
        assert isinstance(taunt1, str)
        assert len(taunt1) > 8

        # Second call for same level and wins bracket MUST hit cache instantly
        taunt2 = await llm_service.get_boss_taunt(level=1, player_name="Tester", wins=10)
        assert taunt2 == taunt1
    asyncio.run(_run())


def test_boss_reaction_with_fallback_and_cache():
    async def _run():
        ai_cache.clear()
        react1 = await llm_service.get_boss_reaction(level=2, correct=15, total=20, won=True, player_name="Tester")
        assert isinstance(react1, str)
        assert len(react1) > 8

        # Second call should match cached
        react2 = await llm_service.get_boss_reaction(level=2, correct=15, total=20, won=True, player_name="Tester")
        assert react2 == react1
    asyncio.run(_run())


def test_coach_feedback_caching():
    async def _run():
        ai_cache.clear()
        feed1 = await llm_service.get_coach_feedback(
            prompt="What is 20% of 150?",
            student_ans="20",
            correct_ans="30",
            method="(20/100) * 150 = 30",
        )
        assert "30" in feed1

        feed2 = await llm_service.get_coach_feedback(
            prompt="What is 20% of 150?",
            student_ans="20",
            correct_ans="30",
            method="(20/100) * 150 = 30",
        )
        assert feed2 == feed1
    asyncio.run(_run())


def test_coach_qa_caching():
    async def _run():
        ai_cache.clear()
        qa1 = await llm_service.get_coach_qa(
            prompt="Solve for x: 3x = 12",
            correct_ans="4",
            student_ans="3",
            topic="algebra",
            query="Why did I get 3 instead of 4?",
        )
        assert isinstance(qa1, str)
        assert len(qa1) > 5

        qa2 = await llm_service.get_coach_qa(
            prompt="Solve for x: 3x = 12",
            correct_ans="4",
            student_ans="3",
            topic="algebra",
            query="Why did I get 3 instead of 4?",
        )
        assert qa2 == qa1
    asyncio.run(_run())


def test_compact_prompts():
    taunt_p = build_boss_taunt_prompt(2, "Alex", 20)
    assert "Alex" in taunt_p
    assert len(taunt_p.split()) < 30

    reaction_p = build_boss_reaction_prompt(1, 15, 20, True, "Alex")
    assert "Alex" in reaction_p
    assert len(reaction_p.split()) < 30

    lesson_p = build_coach_lesson_prompt("Percentages", "percentages.conversion", "P/100", "Master conversion", "Adding 100")
    assert len(lesson_p.split()) < 40
