"""
Automated Simulated Player Test Harness for MathBlitz AI Coach Phase 2:
Tests synthetic telemetry sequences against 6 distinct student personas (A-F).
Verifies deterministic root-cause diagnosis, prerequisite DAG traversal, and coaching policy selection.
"""
import pytest
from backend.taxonomy import CONCEPT_TAXONOMY, ErrorCategory, classify_error
from backend.prerequisites import find_earliest_unmastered_prerequisite
from backend.root_cause import RootCauseEngine, RootCauseDiagnosis
from backend.coaching_policy import CoachingPolicyEngine, CoachingPolicyDecision
from backend.learning_engine import (
    LearningEngine,
    MasteryState,
    RawAttempt,
    TopicMetric,
    calculate_multi_factor_mastery,
    detect_regression,
)


# ==============================================================================
# PLAYER A: The Fraction Addition Struggler with Prerequisite Gap
# ==============================================================================
def test_player_a_prerequisite_gap():
    """
    Player A attempts fractions.addition_subtraction questions and fails, but has weak/unmastered
    foundational skills (fractions.equivalent / arithmetic.division).
    System must diagnose prerequisite gap and target the foundational skill.
    """
    player_id = "player_a_prereq_struggler"
    attempts = [
        # Arithmetic division attempts (weak)
        RawAttempt(prompt="72 / 8", player_answer="7", correct_answer="9", is_correct=False, topic="arithmetic", subtopic="division", response_time_ms=3000),
        RawAttempt(prompt="144 / 12", player_answer="14", correct_answer="12", is_correct=False, topic="arithmetic", subtopic="division", response_time_ms=3200),
        # Fraction addition attempts (failing)
        RawAttempt(prompt="1/4 + 2/4", player_answer="3/8", correct_answer="3/4", is_correct=False, topic="fractions", subtopic="addition_subtraction", response_time_ms=4500),
        RawAttempt(prompt="2/5 + 1/5", player_answer="3/10", correct_answer="3/5", is_correct=False, topic="fractions", subtopic="addition_subtraction", response_time_ms=5000),
        RawAttempt(prompt="1/3 + 1/3", player_answer="2/6", correct_answer="2/3", is_correct=False, topic="fractions", subtopic="addition_subtraction", response_time_ms=4200),
    ]

    metrics = LearningEngine.compute_topic_metrics(attempts)
    assert "fractions.addition_subtraction" in metrics
    assert "arithmetic.division" in metrics

    diagnosis = RootCauseEngine.diagnose(
        surface_concept_id="fractions.addition_subtraction",
        metrics=metrics,
        primary_error="calculation_error",
        recent_accuracy=0.0,
    )

    assert diagnosis.is_prerequisite_gap is True
    assert diagnosis.target_learning_concept_id in ["arithmetic.division", "fractions.equivalent"]

    policy = CoachingPolicyEngine.evaluate_policy(
        surface_concept_id="fractions.addition_subtraction",
        metrics=metrics,
        recent_accuracy=0.0,
        primary_error="calculation_error",
        mastery_score=20.0,
        sample_size=3,
        is_regression=False,
    )
    assert policy.is_prerequisite_gap is True
    assert policy.target_learning_concept_id == diagnosis.target_learning_concept_id


# ==============================================================================
# PLAYER B: The PEMDAS Violator with High Surface Accuracy
# ==============================================================================
def test_player_b_pemdas_violator():
    """
    Player B has >= 90% mastery on basic arithmetic, but calculates multi-step
    operations left-to-right (2 + 3 * 4 = 20 instead of 14).
    System must identify PEMDAS_VIOLATION and target arithmetic.order_of_operations.
    """
    attempts = [
        # High basic arithmetic accuracy
        RawAttempt(prompt="12 + 15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=1500),
        RawAttempt(prompt="7 x 8", player_answer="56", correct_answer="56", is_correct=True, topic="arithmetic", subtopic="multiplication", response_time_ms=1800),
        # PEMDAS failures
        RawAttempt(prompt="2 + 3 * 4", player_answer="20", correct_answer="14", is_correct=False, topic="arithmetic", subtopic="order_of_operations", response_time_ms=2200),
        RawAttempt(prompt="10 - 2 * 3", player_answer="24", correct_answer="4", is_correct=False, topic="arithmetic", subtopic="order_of_operations", response_time_ms=2100),
        RawAttempt(prompt="5 + 5 * 2", player_answer="20", correct_answer="15", is_correct=False, topic="arithmetic", subtopic="order_of_operations", response_time_ms=1900),
    ]

    # Verify error classification detects PEMDAS violation
    for att in attempts[2:]:
        cat, _, _ = classify_error(att.prompt, att.player_answer, att.correct_answer, att.topic, att.subtopic)
        assert cat == ErrorCategory.PEMDAS_VIOLATION

    metrics = LearningEngine.compute_topic_metrics(attempts)

    diagnosis = RootCauseEngine.diagnose(
        surface_concept_id="arithmetic.order_of_operations",
        metrics=metrics,
        primary_error=ErrorCategory.PEMDAS_VIOLATION.value,
        recent_accuracy=0.0,
    )

    assert diagnosis.is_prerequisite_gap is False
    assert diagnosis.target_learning_concept_id == "arithmetic.order_of_operations"
    assert diagnosis.recurring_error_category == ErrorCategory.PEMDAS_VIOLATION.value

    policy = CoachingPolicyEngine.evaluate_policy(
        surface_concept_id="arithmetic.order_of_operations",
        metrics=metrics,
        recent_accuracy=0.0,
        primary_error=ErrorCategory.PEMDAS_VIOLATION.value,
        mastery_score=25.0,
        sample_size=3,
        is_regression=False,
    )
    assert policy.target_learning_concept_id == "arithmetic.order_of_operations"


# ==============================================================================
# PLAYER C: The Fast Guesser with Erratic Off-by-One Mistakes
# ==============================================================================
def test_player_c_fast_guesser():
    """
    Player C answers very rapidly (< 1000ms) with frequent off-by-one errors.
    System identifies off-by-one pattern.
    """
    attempts = [
        RawAttempt(prompt="47 + 36", player_answer="84", correct_answer="83", is_correct=False, topic="arithmetic", subtopic="addition", response_time_ms=650),
        RawAttempt(prompt="28 + 19", player_answer="46", correct_answer="47", is_correct=False, topic="arithmetic", subtopic="addition", response_time_ms=700),
        RawAttempt(prompt="54 + 28", player_answer="81", correct_answer="82", is_correct=False, topic="arithmetic", subtopic="addition", response_time_ms=600),
    ]

    for att in attempts:
        cat, _, _ = classify_error(att.prompt, att.player_answer, att.correct_answer, att.topic, att.subtopic)
        assert cat == ErrorCategory.OFF_BY_ONE

    metrics = LearningEngine.compute_topic_metrics(attempts)

    diagnosis = RootCauseEngine.diagnose(
        surface_concept_id="arithmetic.addition",
        metrics=metrics,
        primary_error=ErrorCategory.OFF_BY_ONE.value,
        recent_accuracy=0.0,
    )

    assert diagnosis.target_learning_concept_id == "arithmetic.addition"
    assert diagnosis.recurring_error_category == ErrorCategory.OFF_BY_ONE.value


# ==============================================================================
# PLAYER D: The Regressing Master
# ==============================================================================
def test_player_d_regressing_master():
    """
    Player D had 90% historical mastery on arithmetic.multiplication, but recently failed
    2 of 3 questions.
    System marks is_regression = True and triggers regression refresher policy.
    """
    history = [
        RawAttempt(prompt="7x8", player_answer="56", correct_answer="56", is_correct=True, topic="arithmetic", subtopic="multiplication", response_time_ms=1500)
        for _ in range(8)
    ] + [
        RawAttempt(prompt="7x8", player_answer="54", correct_answer="56", is_correct=False, topic="arithmetic", subtopic="multiplication", response_time_ms=3200),
        RawAttempt(prompt="7x8", player_answer="54", correct_answer="56", is_correct=False, topic="arithmetic", subtopic="multiplication", response_time_ms=3400),
        RawAttempt(prompt="7x8", player_answer="56", correct_answer="56", is_correct=True, topic="arithmetic", subtopic="multiplication", response_time_ms=1600),
    ]

    is_regressing, reason = detect_regression(history, historical_mastery=90.0)
    assert is_regressing is True

    metrics = LearningEngine.compute_topic_metrics(history)
    policy = CoachingPolicyEngine.evaluate_policy(
        surface_concept_id="arithmetic.multiplication",
        metrics=metrics,
        recent_accuracy=33.3,
        primary_error="calculation_error",
        mastery_score=65.0,
        sample_size=11,
        is_regression=True,
    )
    assert policy.target_learning_concept_id == "arithmetic.multiplication"
    assert "refresher" in policy.intervention_type


# ==============================================================================
# PLAYER E: The Decimal / Percentage Conversion Error
# ==============================================================================
def test_player_e_percentage_conversion_error():
    """
    Player E calculates percentages treating 15% as 15 (e.g. 15% of 200 = 15).
    System detects percentage_conversion_error and provides targeted place-value lesson.
    """
    attempts = [
        RawAttempt(prompt="What is 15% of 200?", player_answer="15", correct_answer="30", is_correct=False, topic="percentages", subtopic="of_a_number", response_time_ms=3500),
        RawAttempt(prompt="What is 20% of 150?", player_answer="20", correct_answer="30", is_correct=False, topic="percentages", subtopic="of_a_number", response_time_ms=3200),
    ]

    for att in attempts:
        cat, _, _ = classify_error(att.prompt, att.player_answer, att.correct_answer, att.topic, att.subtopic)
        assert cat == ErrorCategory.PERCENTAGE_CONVERSION_ERROR

    metrics = LearningEngine.compute_topic_metrics(attempts)

    diagnosis = RootCauseEngine.diagnose(
        surface_concept_id="percentages.of_a_number",
        metrics=metrics,
        primary_error=ErrorCategory.PERCENTAGE_CONVERSION_ERROR.value,
        recent_accuracy=0.0,
    )

    assert diagnosis.target_learning_concept_id in ["percentages.of_a_number", "percentages.conversion"]


# ==============================================================================
# PLAYER F: The Pristine Ace
# ==============================================================================
def test_player_f_pristine_ace():
    """
    Player F answers 100% of questions correctly across multiple concepts.
    System detects no weaknesses and computes high confidence with MASTERED state.
    """
    history = [
        RawAttempt(prompt="12+15", player_answer="27", correct_answer="27", is_correct=True, topic="arithmetic", subtopic="addition", response_time_ms=1200)
        for _ in range(10)
    ]
    mastery, confidence, state = calculate_multi_factor_mastery(history)
    assert mastery >= 88.0
    assert confidence >= 0.8
    assert state == MasteryState.MASTERED

    is_regressing, _ = detect_regression(history, historical_mastery=mastery)
    assert is_regressing is False
