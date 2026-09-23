"""
Unit and integration tests for MathBlitz Adaptive Learning Intelligence:
- Multi-factor Mastery Calculation
- Sample Size & Exponential Confidence Scoring
- Deterministic Mastery States & State Transitions
- Regression Detection
- Prerequisite DAG Traversal
- Root-Cause Classification
- Mathematical Verifier (SymPy, Question Fingerprinting, Explanation Consistency)
"""
import pytest
import math
from backend.prerequisites import (
    get_direct_prerequisites,
    get_all_ancestor_prerequisites,
    find_earliest_unmastered_prerequisite,
)
from backend.taxonomy import (
    CONCEPT_TAXONOMY,
    ErrorCategory,
    classify_error,
)
from backend.root_cause import RootCauseEngine, RootCauseDiagnosis
from backend.coaching_policy import CoachingPolicyEngine, CoachingPolicyDecision
from backend.learning_engine import (
    MasteryState,
    RawAttempt,
    TopicMetric,
    compute_confidence,
    compute_mastery_state,
    calculate_multi_factor_mastery,
    detect_regression,
)
from backend.ai_coach.math_verifier import (
    verify_math_expression,
    verify_math_question,
    compute_question_fingerprint,
    verify_explanation_consistency,
)


# ==============================================================================
# 1. PREREQUISITE DAG TESTS
# ==============================================================================
def test_prerequisite_graph_integrity():
    """Verify that every concept in the taxonomy has valid prerequisite references."""
    for concept_id, node in CONCEPT_TAXONOMY.items():
        assert concept_id in CONCEPT_TAXONOMY
        for p in node.prerequisites:
            assert p in CONCEPT_TAXONOMY, f"Prerequisite {p} for {concept_id} not in taxonomy"


def test_prerequisite_dag_traversal():
    """Test ancestor traversal and earliest unmastered prerequisite identification."""
    ancestors = get_all_ancestor_prerequisites("fractions.addition_subtraction")
    assert "fractions.equivalent" in ancestors
    assert "arithmetic.addition" in ancestors

    # When arithmetic.division is unmastered (mastery < 60), it should be flagged
    mastery_map = {
        "arithmetic.addition": 90.0,
        "arithmetic.subtraction": 85.0,
        "arithmetic.multiplication": 80.0,
        "arithmetic.division": 40.0,
        "fractions.equivalent": 50.0,
    }
    earliest, reason = find_earliest_unmastered_prerequisite(
        "fractions.addition_subtraction",
        mastery_map,
        mastery_threshold=60.0
    )
    assert earliest in ["arithmetic.division", "fractions.equivalent"]

    # When all prerequisites are mastered, returns focus concept with None reason
    mastery_map["arithmetic.division"] = 85.0
    mastery_map["fractions.equivalent"] = 80.0
    earliest, reason = find_earliest_unmastered_prerequisite(
        "fractions.addition_subtraction",
        mastery_map,
        mastery_threshold=60.0
    )
    assert earliest == "fractions.addition_subtraction"
    assert reason is None


# ==============================================================================
# 2. CONFIDENCE & MASTERY CALCULATION TESTS
# ==============================================================================
def test_exponential_confidence_formula():
    """Verify C = 1 - e^(-N / 6) confidence curve."""
    assert compute_confidence(0) == 0.0
    assert 0.14 <= compute_confidence(1) <= 0.16
    assert 0.38 <= compute_confidence(3) <= 0.40
    assert 0.62 <= compute_confidence(6) <= 0.64
    assert 0.85 <= compute_confidence(12) <= 0.88
    assert compute_confidence(24) >= 0.98


def test_multi_factor_mastery_calculation():
    """Test mastery calculation with recency weighting and sample size confidence."""
    history = [
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=False, topic="arithmetic", subtopic="addition", response_time_ms=3000),
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=2500),
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=2200),
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=2000),
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=1800),
    ]
    mastery, confidence, state = calculate_multi_factor_mastery(history)
    assert mastery > 70.0
    assert confidence > 0.5
    assert state in [MasteryState.DEVELOPING, MasteryState.PROFICIENT]


def test_mastery_state_transitions():
    """Test deterministic mastery states according to mastery score and sample size."""
    # 0 sample size -> UNKNOWN
    assert compute_mastery_state(0, 50.0, False) == MasteryState.UNKNOWN

    # Small sample size (< 3) -> LEARNING
    assert compute_mastery_state(2, 75.0, False) == MasteryState.LEARNING

    # Low mastery (< 50) with sufficient samples -> LEARNING
    assert compute_mastery_state(5, 40.0, False) == MasteryState.LEARNING

    # Developing: 48 <= score < 72
    assert compute_mastery_state(5, 65.0, False) == MasteryState.DEVELOPING

    # Proficient: 72 <= score < 88
    assert compute_mastery_state(6, 82.0, False) == MasteryState.PROFICIENT

    # Mastered: score >= 88 with high confidence
    assert compute_mastery_state(6, 92.0, False, confidence_val=0.7) == MasteryState.MASTERED

    # Regression: is_regression overrides
    assert compute_mastery_state(6, 50.0, True) == MasteryState.REGRESSING


# ==============================================================================
# 3. REGRESSION DETECTION TESTS
# ==============================================================================
def test_regression_detection():
    """Detect regression when historical accuracy was high but recent 3 attempts show 2+ failures."""
    history = [
        RawAttempt(prompt="7x8", player_answer="56", correct_answer="56", is_correct=True, topic="arithmetic", subtopic="multiplication", response_time_ms=2000)
        for _ in range(7)
    ] + [
        RawAttempt(prompt="7x8", player_answer="54", correct_answer="56", is_correct=False, topic="arithmetic", subtopic="multiplication", response_time_ms=4000),
        RawAttempt(prompt="7x8", player_answer="54", correct_answer="56", is_correct=False, topic="arithmetic", subtopic="multiplication", response_time_ms=4500),
        RawAttempt(prompt="7x8", player_answer="56", correct_answer="56", is_correct=True, topic="arithmetic", subtopic="multiplication", response_time_ms=3000),
    ]
    is_regressing, reason = detect_regression(history, historical_mastery=88.0)
    assert is_regressing is True

    # Steady learner with 50% accuracy throughout should NOT be marked regression
    steady_history = [
        RawAttempt(prompt="7x8", player_answer="56" if i % 2 == 0 else "54", correct_answer="56", is_correct=(i % 2 == 0), topic="arithmetic", subtopic="multiplication", response_time_ms=2500)
        for i in range(8)
    ]
    is_regressing_steady, _ = detect_regression(steady_history, historical_mastery=50.0)
    assert is_regressing_steady is False


# ==============================================================================
# 4. ERROR CLASSIFICATION & ROOT CAUSE ENGINE TESTS
# ==============================================================================
def test_error_classification():
    """Test deterministic mathematical error classification."""
    # Off by one
    cat, _, _ = classify_error("47 + 36", "84", "83", "arithmetic", "addition")
    assert cat == ErrorCategory.OFF_BY_ONE

    # Sign reversal
    cat, _, _ = classify_error("-5 - 3", "8", "-8", "algebra", "negative_numbers")
    assert cat in [ErrorCategory.SIGN_REVERSAL, ErrorCategory.SIGN_ERROR]

    # PEMDAS violation: 2 + 3 * 4 = 14, user answers 20 ((2+3)*4)
    cat, _, _ = classify_error("2 + 3 * 4", "20", "14", "arithmetic", "order_of_operations")
    assert cat == ErrorCategory.PEMDAS_VIOLATION


def test_root_cause_diagnosis():
    """Test root cause engine diagnosing prerequisite gap vs recurring error."""
    metrics_map = {
        "arithmetic.addition": TopicMetric(
            topic="arithmetic", subtopic="addition", concept_id="arithmetic.addition", concept_name="Addition",
            total_attempts=10, correct_attempts=9, accuracy=90.0, recent_accuracy=90.0, trend="stable",
            avg_response_time_ms=2000, mastery_score=90.0, confidence=0.8, confidence_level="High", mastery_state="mastered"
        ),
        "arithmetic.division": TopicMetric(
            topic="arithmetic", subtopic="division", concept_id="arithmetic.division", concept_name="Division",
            total_attempts=5, correct_attempts=2, accuracy=40.0, recent_accuracy=40.0, trend="stable",
            avg_response_time_ms=3000, mastery_score=40.0, confidence=0.6, confidence_level="Medium", mastery_state="learning"
        ),
        "fractions.equivalent": TopicMetric(
            topic="fractions", subtopic="equivalent_fractions", concept_id="fractions.equivalent", concept_name="Equivalent Fractions",
            total_attempts=5, correct_attempts=2, accuracy=40.0, recent_accuracy=40.0, trend="stable",
            avg_response_time_ms=3000, mastery_score=40.0, confidence=0.6, confidence_level="Medium", mastery_state="learning"
        ),
    }

    diagnosis = RootCauseEngine.diagnose(
        surface_concept_id="fractions.addition_subtraction",
        metrics=metrics_map,
        primary_error="calculation_error",
        recent_accuracy=30.0,
    )
    assert diagnosis.is_prerequisite_gap is True
    assert diagnosis.target_learning_concept_id in ["arithmetic.division", "fractions.equivalent"]


# ==============================================================================
# 5. COACHING POLICY ENGINE TESTS
# ==============================================================================
def test_coaching_policy_decision():
    """Test policy decisions for new weakness vs regression vs prerequisite gap."""
    metrics_map = {
        "fractions.equivalent": TopicMetric(
            topic="fractions", subtopic="equivalent_fractions", concept_id="fractions.equivalent", concept_name="Equivalent Fractions",
            total_attempts=5, correct_attempts=2, accuracy=40.0, recent_accuracy=40.0, trend="stable",
            avg_response_time_ms=3000, mastery_score=40.0, confidence=0.6, confidence_level="Medium", mastery_state="learning"
        )
    }
    policy = CoachingPolicyEngine.evaluate_policy(
        surface_concept_id="fractions.addition_subtraction",
        metrics=metrics_map,
        recent_accuracy=30.0,
        primary_error="calculation_error",
        mastery_score=35.0,
        sample_size=5,
        is_regression=False,
    )
    assert policy.is_prerequisite_gap is True
    assert policy.target_learning_concept_id == "fractions.equivalent"
    assert policy.recommended_question_count >= 2


# ==============================================================================
# 6. MATHEMATICAL VERIFIER TESTS
# ==============================================================================
def test_sympy_math_verification():
    """Test that SymPy deterministic math verification accepts mathematically valid expressions."""
    # Simple arithmetic
    assert verify_math_expression("15 * 4", 60) is True
    assert verify_math_expression("15 * 4", 59) is False

    # Fraction equality
    assert verify_math_expression("2/4", "1/2") is True

    # Order of operations
    assert verify_math_expression("3 + 4 * 2", 11) is True
    assert verify_math_expression("3 + 4 * 2", 14) is False


def test_question_fingerprint():
    """Test that duplicate questions produce identical fingerprints."""
    fp1 = compute_question_fingerprint("What is 12 x 8?", "96")
    fp2 = compute_question_fingerprint("What is  12  x  8? ", "96")
    assert fp1 == fp2

    fp3 = compute_question_fingerprint("What is 12 x 7?", "84")
    assert fp1 != fp3


def test_explanation_consistency():
    """Test explanation consistency verification against correct answer."""
    valid, _ = verify_explanation_consistency(
        prompt="What is 15% of 80?",
        correct_answer="12",
        explanation="To calculate 15% of 80, first compute 10% which is 8, and half of that is 4. 8 + 4 = 12.",
    )
    assert valid is True
