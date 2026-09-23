"""Comprehensive test suite for MathBlitz AI Coach:
Taxonomy, Learning Engine, Math Verifier, LangGraph Workflow, and Server API endpoints.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.ai_coach.graph import build_coaching_graph, coaching_workflow
from backend.ai_coach.math_verifier import (
    evaluate_expression_safely,
    solve_linear_equation_safely,
    verify_math_question,
)
from backend.learning_engine import LearningEngine, RawAttempt
from backend.models import Base
from backend.server import app
from backend.taxonomy import (
    CONCEPT_TAXONOMY,
    ErrorCategory,
    classify_error,
    normalize_topic_to_node,
)


# ── 1. Taxonomy & Error Classifier Tests ──────────────────────────────────────

def test_concept_taxonomy_structure():
    assert "arithmetic.addition" in CONCEPT_TAXONOMY
    assert "percentages.conversion" in CONCEPT_TAXONOMY
    assert "algebra.linear_equations" in CONCEPT_TAXONOMY

    node = CONCEPT_TAXONOMY["percentages.conversion"]
    assert node.topic == "percentages"
    assert node.subtopic == "conversion"
    assert len(node.examples) > 0


def test_normalize_topic():
    node = normalize_topic_to_node("percentages", None, "What is 25% of 80?")
    assert node.topic == "percentages"

    alg_node = normalize_topic_to_node("algebra", None, "If 3x + 7 = 22, x = ?")
    assert alg_node.topic == "algebra"


def test_error_classification_percentage():
    # Player treats 15% as 15
    cat, hyp, conf = classify_error(
        prompt="What is 15% of 200?",
        player_answer="15",
        correct_answer="30",
        topic="percentages",
        subtopic="of_a_number",
    )
    assert cat == ErrorCategory.PERCENTAGE_CONVERSION_ERROR
    assert conf in ("high", "medium")


def test_error_classification_algebra():
    # Player adds instead of subtracting in 3x + 7 = 22
    cat, hyp, conf = classify_error(
        prompt="If 3x + 7 = 22, x = ?",
        player_answer="29",
        correct_answer="5",
        topic="algebra",
        subtopic="linear_equations",
    )
    assert cat == ErrorCategory.ALGEBRAIC_MANIPULATION_ERROR
    assert conf == "high"


def test_error_classification_sign_error():
    cat, hyp, conf = classify_error(
        prompt="Calculate: -7 + 2",
        player_answer="5",
        correct_answer="-5",
        topic="algebra",
        subtopic="negative_numbers",
    )
    assert cat in (ErrorCategory.SIGN_REVERSAL, ErrorCategory.SIGN_ERROR)
    assert conf == "high"


# ── 2. Learning Engine Deterministic Tests ────────────────────────────────────

def test_learning_engine_metrics_and_weakness():
    # Create 5 attempts with 3 wrong in percentages
    attempts = [
        RawAttempt(prompt="15% of 200", player_answer="15", correct_answer="30", is_correct=False, topic="percentages", subtopic="conversion"),
        RawAttempt(prompt="20% of 150", player_answer="20", correct_answer="30", is_correct=False, topic="percentages", subtopic="conversion"),
        RawAttempt(prompt="10% of 80", player_answer="8", correct_answer="8", is_correct=True, topic="percentages", subtopic="conversion"),
        RawAttempt(prompt="50% of 60", player_answer="50", correct_answer="30", is_correct=False, topic="percentages", subtopic="conversion"),
        # 3 correct in arithmetic
        RawAttempt(prompt="12 + 15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition"),
        RawAttempt(prompt="30 + 45", player_answer="75", correct_answer="75", is_correct=True, topic="arithmetic", subtopic="addition"),
    ]

    profile = LearningEngine.build_profile("player_123", attempts)

    assert profile.total_attempts == 6
    assert profile.total_correct == 3
    assert profile.overall_accuracy == 50.0

    # Weak areas should detect percentages
    assert len(profile.weak_areas) >= 1
    top_weakness = profile.weak_areas[0]
    assert top_weakness.topic == "percentages"
    assert top_weakness.accuracy == 25.0
    assert top_weakness.primary_error_category == ErrorCategory.PERCENTAGE_CONVERSION_ERROR.value


# ── 3. Math Verifier Tests ───────────────────────────────────────────────────

def test_evaluate_expression():
    assert evaluate_expression_safely("15 * 6 - 25") == 65.0
    assert evaluate_expression_safely("20% of 150") == 30.0
    assert evaluate_expression_safely("12 ** 2 - 10 ** 2") == 44.0


def test_solve_equation():
    assert solve_linear_equation_safely("3x + 7 = 22") == 5.0
    assert solve_linear_equation_safely("5x - 10 = 40") == 10.0


def test_verify_math_question_valid():
    is_valid, msg, ans = verify_math_question(
        prompt="What is 20% of 150?",
        claimed_answer="30",
        options=["30", "20", "25", "35"],
        topic="percentages",
    )
    assert is_valid is True
    assert ans == "30"


def test_verify_math_question_reject_invalid():
    # Claimed answer 40 is incorrect for 20% of 150 (=30)
    is_valid, msg, ans = verify_math_question(
        prompt="What is 20% of 150?",
        claimed_answer="40",
        options=["40", "20", "25", "35"],
        topic="percentages",
    )
    assert is_valid is False


# ── 4. LangGraph Workflow Tests ───────────────────────────────────────────────

def test_langgraph_coaching_execution():
    initial_state = {
        "player_id": "test_student",
        "player_name": "Alex",
        "current_concept_id": "percentages.conversion",
        "recent_performance": [
            {
                "prompt": "15% of 200",
                "player_answer": "15",
                "correct_answer": "30",
                "is_correct": False,
                "topic": "percentages",
                "subtopic": "conversion",
                "response_time_ms": 2500,
            }
        ],
        "topic_metrics": {},
        "weak_topics": [],
        "detected_errors": [],
        "practice_questions": [],
        "verified_practice": [],
        "current_question_index": 0,
        "mastery_before": 42.0,
        "mastery_after": 42.0,
        "mastery_delta": 0.0,
        "next_action": "show_step_1",
    }

    result = coaching_workflow.invoke(initial_state)

    assert result["current_concept_id"] == "percentages.conversion"
    assert len(result["concept_explanation"]) > 10
    assert len(result["formula_breakdown"]) > 0
    assert len(result["example_problem"]) > 0
    assert len(result["verified_practice"]) == 3
    # Check that practice questions are verified
    for q in result["verified_practice"]:
        assert q["verified"] is True
        assert len(q["options"]) == 4


# ── 5. Server API Integration Tests ──────────────────────────────────────────

from fastapi.testclient import TestClient
import uuid

def test_coach_api_record_and_profile():
    with TestClient(app) as client:
        test_player_id = f"test_user_{uuid.uuid4().hex[:8]}"

        # 1. Record attempts
        payload = {
            "player_id": test_player_id,
            "player_name": "Sam",
            "game_mode": "classic",
            "attempts": [

                {
                    "prompt": "What is 15% of 200?",
                    "player_answer": "15",
                    "correct_answer": "30",
                    "is_correct": False,
                    "topic": "percentages",
                    "subtopic": "conversion",
                    "difficulty": 1,
                    "response_time_ms": 2200,
                    "game_mode": "classic",
                },
                {
                    "prompt": "What is 20% of 150?",
                    "player_answer": "20",
                    "correct_answer": "30",
                    "is_correct": False,
                    "topic": "percentages",
                    "subtopic": "conversion",
                    "difficulty": 1,
                    "response_time_ms": 2100,
                    "game_mode": "classic",
                },
                {
                    "prompt": "What is 25% of 80?",
                    "player_answer": "25",
                    "correct_answer": "20",
                    "is_correct": False,
                    "topic": "percentages",
                    "subtopic": "conversion",
                    "difficulty": 1,
                    "response_time_ms": 1900,
                    "game_mode": "classic",
                },
            ],
        }

        res = client.post("/api/coach/record-attempts", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["recorded"] == 3
        assert data["weak_areas_count"] >= 1

        # 2. Fetch Profile
        prof_res = client.get(f"/api/coach/profile/{test_player_id}")
        assert prof_res.status_code == 200
        prof_data = prof_res.json()
        assert prof_data["total_attempts"] == 3
        assert prof_data["overall_accuracy"] == 0
        assert len(prof_data["weak_areas"]) >= 1

        # 3. Fetch Proactive Insight
        insight_res = client.get(f"/api/coach/proactive-insight/{test_player_id}")
        assert insight_res.status_code == 200
        insight_data = insight_res.json()
        assert insight_data["has_insight"] is True
        assert insight_data["concept_id"] == "percentages.conversion"
        assert "MathBlitz Coach" in insight_data["headline"]

        # 4. Start Coaching Session
        session_res = client.post(
            "/api/coach/start-session",
            json={"player_id": test_player_id, "concept_id": "percentages.conversion"},
        )
        assert session_res.status_code == 200
        session_data = session_res.json()
        assert "session_id" in session_data
        assert len(session_data["concept_explanation"]) > 0
        assert len(session_data["verified_practice"]) == 3

        # 5. Submit Practice Answer
        sess_id = session_data["session_id"]
        practice_res = client.post(
            "/api/coach/submit-practice",
            json={
                "session_id": sess_id,
                "player_id": test_player_id,
                "question_index": 0,
                "student_answer": session_data["verified_practice"][0]["correct_answer"],
            },
        )
        assert practice_res.status_code == 200
        practice_data = practice_res.json()
        assert practice_data["is_correct"] is True
        assert practice_data["mastery_delta"] > 0
        assert "feedback" in practice_data

        # 6. Contextual Q&A
        contextual_res = client.post(
            "/api/coach/contextual-query",
            json={
                "player_id": test_player_id,
                "prompt": "What is 15% of 200?",
                "correct_answer": "30",
                "player_answer": "15",
                "topic": "percentages",
                "query": "Why was my answer 15 wrong?",
            },
        )
        assert contextual_res.status_code == 200
        assert "answer" in contextual_res.json()

        # 7. Internal Debug Endpoint
        debug_res = client.get(f"/api/coach/debug/{test_player_id}")
        assert debug_res.status_code == 200
        debug_data = debug_res.json()
        assert debug_data["player_id"] == test_player_id
        assert "raw_telemetry" in debug_data
        assert "mastery_map" in debug_data
        assert "interventions_history" in debug_data
        assert len(debug_data["raw_telemetry"]) >= 3

        # 8. Idempotency Test (attempt_id deduplication)
        idempotent_attempt_id = "test_uuid_idempotent_12345"
        dup_payload = {
            "player_id": test_player_id,
            "attempts": [
                {
                    "prompt": "What is 50% of 100?",
                    "player_answer": "50",
                    "correct_answer": "50",
                    "is_correct": True,
                    "topic": "percentages",
                    "subtopic": "conversion",
                    "attempt_id": idempotent_attempt_id,
                    "response_time_ms": 1500,
                }
            ]
        }
        # First post records 1
        res1 = client.post("/api/coach/record-attempts", json=dup_payload)
        assert res1.status_code == 200
        assert res1.json()["recorded"] == 1

        # Second post with identical attempt_id is ignored (0 new recorded)
        res2 = client.post("/api/coach/record-attempts", json=dup_payload)
        assert res2.status_code == 200
        assert res2.json()["recorded"] == 0



