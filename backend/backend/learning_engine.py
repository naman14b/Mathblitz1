"""Deterministic Statistical Learning Engine for MathBlitz AI Coach.
Implements multi-factor mastery modeling, confidence scoring, deterministic mastery states,
regression detection, and root-cause weakness synthesis.
"""
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
import math
from typing import Any, Dict, List, Optional, Tuple

from .coaching_policy import CoachingPolicyDecision, CoachingPolicyEngine
from .root_cause import RootCauseDiagnosis, RootCauseEngine
from .taxonomy import CONCEPT_TAXONOMY, ConceptNode, ErrorCategory, classify_error, normalize_topic_to_node


class MasteryState(str, Enum):
    UNKNOWN = "unknown"
    LEARNING = "learning"
    DEVELOPING = "developing"
    PROFICIENT = "proficient"
    MASTERED = "mastered"
    REGRESSING = "regressing"


def compute_confidence(total: int) -> float:
    """Exponential confidence curve C = 1 - e^(-N / 6)."""
    if total <= 0:
        return 0.0
    return round(1.0 - math.exp(-total / 6.0), 2)


def compute_mastery_state(
    total: int,
    mastery_score: float,
    is_regression: bool = False,
    confidence_val: Optional[float] = None,
) -> MasteryState:
    """Deterministic mastery state calculation."""
    if is_regression:
        return MasteryState.REGRESSING
    if total <= 0:
        return MasteryState.UNKNOWN
    if total < 3:
        return MasteryState.LEARNING

    conf = confidence_val if confidence_val is not None else compute_confidence(total)
    if mastery_score >= 88.0 and conf >= 0.60:
        return MasteryState.MASTERED
    elif mastery_score >= 72.0:
        return MasteryState.PROFICIENT
    elif mastery_score >= 48.0:
        return MasteryState.DEVELOPING
    else:
        return MasteryState.LEARNING


def calculate_multi_factor_mastery(
    history: List["RawAttempt"],
) -> Tuple[float, float, MasteryState]:
    """Calculate multi-factor mastery score, confidence, and mastery state for a sequence of attempts."""
    total = len(history)
    if total == 0:
        return 0.0, 0.0, MasteryState.UNKNOWN

    correct = sum(1 for a in history if a.is_correct)
    accuracy = (correct / total) * 100.0

    recent_attempts = history[-5:] if total >= 5 else history
    recent_correct = sum(1 for a in recent_attempts if a.is_correct)
    recent_acc = (recent_correct / len(recent_attempts)) * 100.0 if recent_attempts else accuracy

    weighted_points = 0.0
    max_points = 0.0
    for a in history:
        diff_weight = 0.8 + (a.difficulty * 0.2)
        max_points += diff_weight
        if a.is_correct:
            weighted_points += diff_weight

    weighted_acc = (weighted_points / max_points * 100.0) if max_points > 0 else accuracy
    confidence_val = compute_confidence(total)
    base_mastery = (weighted_acc * 0.50) + (recent_acc * 0.35) + (confidence_val * 15.0)
    mastery_score = round(min(100.0, max(0.0, base_mastery)), 1)

    state = compute_mastery_state(total, mastery_score, False, confidence_val)
    return mastery_score, confidence_val, state


def detect_regression(
    history: List["RawAttempt"],
    historical_mastery: float,
) -> Tuple[bool, str]:
    """Detect mastery regression when historical performance was high but recent accuracy plunged."""
    total = len(history)
    if total < 6 or historical_mastery < 75.0:
        return False, ""

    recent_3 = history[-3:]
    recent_fails = sum(1 for a in recent_3 if not a.is_correct)
    recent_acc = ((3 - recent_fails) / 3.0) * 100.0

    if recent_fails >= 2 or recent_acc < 50.0:
        reason = f"Historical mastery was high ({historical_mastery}%), but recent 3 attempts showed a drop to {round(recent_acc, 1)}%."
        return True, reason

    return False, ""


@dataclass
class RawAttempt:
    prompt: str
    player_answer: str
    correct_answer: str
    is_correct: bool
    topic: str
    subtopic: Optional[str] = None
    difficulty: int = 1
    response_time_ms: int = 0
    game_mode: str = "classic"
    timestamp: Optional[datetime] = None
    error_category: Optional[str] = None
    error_hypothesis: Optional[str] = None
    attempt_id: Optional[str] = None


@dataclass
class TopicMetric:
    topic: str
    subtopic: str
    concept_id: str
    concept_name: str
    total_attempts: int
    correct_attempts: int
    accuracy: float  # 0.0 - 100.0%
    recent_accuracy: float  # Last 5 attempts accuracy %
    trend: str  # "improving" | "declining" | "stable"
    avg_response_time_ms: float
    mastery_score: float  # 0.0 - 100.0
    confidence: float  # 0.0 - 1.0 (numerical confidence)
    confidence_level: str  # "High" | "Medium" | "Low"
    mastery_state: str  # MasteryState string value
    historical_peak_mastery: float = 0.0
    regression_detected: bool = False
    regression_severity: Optional[str] = None  # "low" | "medium" | "high" | None
    error_distribution: Dict[str, int] = field(default_factory=dict)
    primary_error: Optional[str] = None
    primary_mistake_desc: Optional[str] = None


@dataclass
class DetectedWeakness:
    concept_id: str
    concept_name: str
    topic: str
    subtopic: str
    accuracy: float
    recent_accuracy: float
    total_attempts: int
    severity: str  # "high" | "medium" | "low"
    primary_error_category: str
    common_mistake: str
    recommended_action: str
    mastery_score: float
    confidence: float = 0.0
    is_regression: bool = False
    # Root Cause & Coaching Policy details
    target_learning_concept_id: Optional[str] = None
    target_learning_concept_name: Optional[str] = None
    is_prerequisite_gap: bool = False
    learning_objective: Optional[str] = None
    evidence_summary: Optional[str] = None
    recommended_difficulty: int = 2


@dataclass
class LearningProfileData:
    player_id: str
    total_attempts: int
    total_correct: int
    overall_accuracy: float
    topic_metrics: Dict[str, TopicMetric]
    weak_areas: List[DetectedWeakness]
    active_intervention: Optional[DetectedWeakness] = None
    last_analyzed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LearningEngine:
    """Calculates multi-factor statistical metrics, mastery states, and weaknesses."""

    @staticmethod
    def process_attempts(attempts: List[RawAttempt]) -> List[RawAttempt]:
        """Enrich raw attempts with deterministic error categorization."""
        enriched: List[RawAttempt] = []
        for att in attempts:
            if not att.is_correct and not att.error_category:
                cat, hyp, _ = classify_error(
                    prompt=att.prompt,
                    player_answer=att.player_answer,
                    correct_answer=att.correct_answer,
                    topic=att.topic,
                    subtopic=att.subtopic,
                    response_time_ms=att.response_time_ms,
                )
                att.error_category = cat.value
                att.error_hypothesis = hyp
            enriched.append(att)
        return enriched

    @classmethod
    def compute_topic_metrics(cls, attempts: List[RawAttempt]) -> Dict[str, TopicMetric]:
        """Group attempts by canonical concept and compute multi-factor metrics."""
        grouped: Dict[str, List[RawAttempt]] = {}

        for att in attempts:
            node = normalize_topic_to_node(att.topic, att.subtopic, att.prompt)
            if node.id not in grouped:
                grouped[node.id] = []
            grouped[node.id].append(att)

        metrics: Dict[str, TopicMetric] = {}

        for concept_id, group in grouped.items():
            node = CONCEPT_TAXONOMY.get(concept_id) or ConceptNode(
                id=concept_id,
                name=concept_id.replace(".", " ").title(),
                topic=concept_id.split(".")[0],
                subtopic=concept_id.split(".")[1] if "." in concept_id else concept_id,
                description="Math concept",
            )

            total = len(group)
            correct = sum(1 for a in group if a.is_correct)
            accuracy = round((correct / total) * 100.0, 1) if total > 0 else 0.0

            # 1. Recent accuracy (last 5 attempts)
            recent_attempts = group[-5:] if len(group) >= 5 else group
            recent_correct = sum(1 for a in recent_attempts if a.is_correct)
            recent_acc = round((recent_correct / len(recent_attempts)) * 100.0, 1) if recent_attempts else accuracy

            # 2. Trend calculation
            if total >= 6:
                diff = recent_acc - accuracy
                if diff >= 10.0:
                    trend = "improving"
                elif diff <= -10.0:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            # 3. Response time & Benchmark
            times = [a.response_time_ms for a in group if a.response_time_ms > 0]
            avg_time = round(sum(times) / len(times), 1) if times else (node.default_benchmark_seconds * 1000)

            # 4. Error distribution
            err_dist: Dict[str, int] = {}
            mistake_samples: Dict[str, str] = {}
            for a in group:
                if not a.is_correct:
                    err_cat = a.error_category or "unknown"
                    err_dist[err_cat] = err_dist.get(err_cat, 0) + 1
                    if a.error_hypothesis and err_cat not in mistake_samples:
                        mistake_samples[err_cat] = a.error_hypothesis

            primary_err = max(err_dist.items(), key=lambda x: x[1])[0] if err_dist else None
            primary_desc = mistake_samples.get(primary_err) if primary_err else None

            # 5. Multi-factor Mastery Score & Confidence
            # Difficulty-weighted accuracy:
            weighted_points = 0.0
            max_points = 0.0
            for a in group:
                diff_weight = 0.8 + (a.difficulty * 0.2)  # Diff 1: 1.0, Diff 2: 1.2, Diff 3: 1.4, Diff 4: 1.6
                max_points += diff_weight
                if a.is_correct:
                    weighted_points += diff_weight

            weighted_acc = (weighted_points / max_points * 100.0) if max_points > 0 else accuracy

            # Confidence exponential function: C = 1 - exp(-N / 6)
            confidence_val = round(1.0 - math.exp(-total / 6.0), 2)

            # Blended mastery score:
            # 50% weighted overall accuracy + 35% recent accuracy + 15% confidence stability
            base_mastery = (weighted_acc * 0.50) + (recent_acc * 0.35) + (confidence_val * 15.0)
            mastery_score = round(min(100.0, max(0.0, base_mastery)), 1)

            # Historical peak tracking (simulated from sequence)
            peak_mastery = max(mastery_score, accuracy)

            # 6. Deterministic Mastery State & Regression
            is_regression = False
            reg_severity: Optional[str] = None

            if total < 3:
                state = MasteryState.UNKNOWN
            elif total >= 6 and (peak_mastery >= 75.0 or accuracy >= 75.0) and recent_acc < 60.0:
                state = MasteryState.REGRESSING
                is_regression = True
                reg_severity = "high" if recent_acc < 40.0 else "medium"
            elif mastery_score >= 88.0 and confidence_val >= 0.65:
                state = MasteryState.MASTERED
            elif mastery_score >= 72.0:
                state = MasteryState.PROFICIENT
            elif mastery_score >= 48.0:
                state = MasteryState.DEVELOPING
            else:
                state = MasteryState.LEARNING

            conf_label = "High" if confidence_val >= 0.70 else "Medium" if confidence_val >= 0.40 else "Low"

            metrics[concept_id] = TopicMetric(
                topic=node.topic,
                subtopic=node.subtopic,
                concept_id=concept_id,
                concept_name=node.name,
                total_attempts=total,
                correct_attempts=correct,
                accuracy=accuracy,
                recent_accuracy=recent_acc,
                trend=trend,
                avg_response_time_ms=avg_time,
                mastery_score=mastery_score,
                confidence=confidence_val,
                confidence_level=conf_label,
                mastery_state=state.value,
                historical_peak_mastery=peak_mastery,
                regression_detected=is_regression,
                regression_severity=reg_severity,
                error_distribution=err_dist,
                primary_error=primary_err,
                primary_mistake_desc=primary_desc,
            )

        return metrics

    @classmethod
    def identify_weaknesses(cls, metrics: Dict[str, TopicMetric]) -> List[DetectedWeakness]:
        """
        Identify statistically validated weak areas and execute Coaching Policy
        to determine exact learning objectives and root causes.
        """
        weaknesses: List[DetectedWeakness] = []

        for cid, met in metrics.items():
            is_weak = False
            severity = "low"

            # Threshold 1: Regression from previously strong performance
            if met.regression_detected:
                is_weak = True
                severity = met.regression_severity or "medium"

            # Threshold 2: Low accuracy with sufficient attempts
            elif met.total_attempts >= 3 and met.accuracy < 65.0:
                is_weak = True
                if met.accuracy < 45.0 or (met.total_attempts >= 6 and met.accuracy < 55.0):
                    severity = "high"
                else:
                    severity = "medium"

            # Threshold 3: Declining recent performance
            elif met.total_attempts >= 4 and met.trend == "declining" and met.recent_accuracy < 60.0:
                is_weak = True
                severity = "medium"

            if is_weak:
                node = CONCEPT_TAXONOMY.get(cid)
                common_pitfall = met.primary_mistake_desc or (
                    node.common_pitfalls[0] if node and node.common_pitfalls else "Mistakes on core formula"
                )

                # Evaluate Coaching Policy
                policy: CoachingPolicyDecision = CoachingPolicyEngine.evaluate_policy(
                    surface_concept_id=cid,
                    metrics=metrics,
                    recent_accuracy=met.recent_accuracy,
                    primary_error=met.primary_error,
                    mastery_score=met.mastery_score,
                    sample_size=met.total_attempts,
                    is_regression=met.regression_detected,
                )

                rec_action = f"Focus on {policy.target_learning_concept_name} → {policy.recommended_question_count} practice questions"

                weaknesses.append(
                    DetectedWeakness(
                        concept_id=cid,
                        concept_name=met.concept_name,
                        topic=met.topic,
                        subtopic=met.subtopic,
                        accuracy=met.accuracy,
                        recent_accuracy=met.recent_accuracy,
                        total_attempts=met.total_attempts,
                        severity=severity,
                        primary_error_category=met.primary_error or "calculation_error",
                        common_mistake=common_pitfall,
                        recommended_action=rec_action,
                        mastery_score=met.mastery_score,
                        confidence=met.confidence,
                        is_regression=met.regression_detected,
                        target_learning_concept_id=policy.target_learning_concept_id,
                        target_learning_concept_name=policy.target_learning_concept_name,
                        is_prerequisite_gap=policy.is_prerequisite_gap,
                        learning_objective=policy.learning_objective,
                        evidence_summary=policy.evidence_summary,
                        recommended_difficulty=policy.recommended_difficulty,
                    )
                )

        # Sort: Regressions and high severity first, then lowest accuracy
        weaknesses.sort(
            key=lambda w: (
                0 if w.is_regression else (1 if w.severity == "high" else 2 if w.severity == "medium" else 3),
                w.accuracy,
            )
        )
        return weaknesses

    @classmethod
    def build_profile(cls, player_id: str, attempts: List[RawAttempt]) -> LearningProfileData:
        """Construct complete structured learning profile from attempts."""
        enriched = cls.process_attempts(attempts)
        metrics = cls.compute_topic_metrics(enriched)
        weaknesses = cls.identify_weaknesses(metrics)

        total_att = len(enriched)
        total_cor = sum(1 for a in enriched if a.is_correct)
        overall_acc = round((total_cor / total_att) * 100.0, 1) if total_att > 0 else 0.0

        active_intervention = weaknesses[0] if weaknesses else None

        return LearningProfileData(
            player_id=player_id,
            total_attempts=total_att,
            total_correct=total_cor,
            overall_accuracy=overall_acc,
            topic_metrics=metrics,
            weak_areas=weaknesses,
            active_intervention=active_intervention,
        )
