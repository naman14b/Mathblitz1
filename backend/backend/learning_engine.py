"""Deterministic Learning Engine for MathBlitz.
Calculates statistical player performance, mastery scores, error distributions,
and detects weak areas purely in application code without LLM hallucination.
"""
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import math

from .taxonomy import CONCEPT_TAXONOMY, ConceptNode, ErrorCategory, classify_error, normalize_topic_to_node


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
    mastery_score: float  # 0 - 100
    confidence_level: str  # "High" | "Medium" | "Low"
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
    """Calculates deterministic statistics and identifies learning gaps."""

    @staticmethod
    def process_attempts(attempts: List[RawAttempt]) -> List[RawAttempt]:
        """Enrich attempts with deterministic error classification if missed."""
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
        """Group attempts by canonical concept and compute deterministic statistical metrics."""
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

            # Calculate recent accuracy (last 5 attempts)
            recent_attempts = group[-5:] if len(group) >= 5 else group
            recent_correct = sum(1 for a in recent_attempts if a.is_correct)
            recent_acc = round((recent_correct / len(recent_attempts)) * 100.0, 1) if recent_attempts else accuracy

            # Calculate trend
            if total >= 6:
                diff = recent_acc - accuracy
                if diff >= 12.0:
                    trend = "improving"
                elif diff <= -12.0:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            # Average response time
            times = [a.response_time_ms for a in group if a.response_time_ms > 0]
            avg_time = round(sum(times) / len(times), 1) if times else (node.default_benchmark_seconds * 1000)

            # Error distribution
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

            # Confidence & Mastery Calculation
            # Mastery weighted by accuracy (65%), recent performance (25%), sample confidence (10%)
            sample_weight = min(1.0, total / 10.0)
            mastery = round((accuracy * 0.65) + (recent_acc * 0.25) + (sample_weight * 10.0), 1)
            mastery = min(100.0, max(0.0, mastery))

            if total >= 8:
                confidence = "High" if accuracy >= 75 or accuracy <= 40 else "Medium"
            elif total >= 3:
                confidence = "Medium"
            else:
                confidence = "Low"

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
                mastery_score=mastery,
                confidence_level=confidence,
                error_distribution=err_dist,
                primary_error=primary_err,
                primary_mistake_desc=primary_desc,
            )

        return metrics

    @classmethod
    def identify_weaknesses(cls, metrics: Dict[str, TopicMetric]) -> List[DetectedWeakness]:
        """
        Identify statistically significant weak areas.
        Filters for concepts where accuracy is below threshold with sufficient attempts,
        or where recent performance has sharply declined.
        """
        weaknesses: List[DetectedWeakness] = []

        for cid, met in metrics.items():
            is_weak = False
            severity = "low"

            # Threshold 1: Low overall accuracy with at least 3 attempts
            if met.total_attempts >= 3 and met.accuracy < 65.0:
                is_weak = True
                if met.accuracy < 45.0 or (met.total_attempts >= 6 and met.accuracy < 55.0):
                    severity = "high"
                else:
                    severity = "medium"

            # Threshold 2: Sharp recent decline with at least 4 attempts
            elif met.total_attempts >= 4 and met.trend == "declining" and met.recent_accuracy < 60.0:
                is_weak = True
                severity = "medium"

            if is_weak:
                node = CONCEPT_TAXONOMY.get(cid)
                common_pitfall = met.primary_mistake_desc or (node.common_pitfalls[0] if node and node.common_pitfalls else "Repeated mistakes on core formula")
                recommended = f"Review {met.concept_name} fundamentals → 3 step-by-step practice questions"

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
                        recommended_action=recommended,
                        mastery_score=met.mastery_score,
                    )
                )

        # Sort weaknesses: High severity first, then lowest accuracy
        weaknesses.sort(key=lambda w: (0 if w.severity == "high" else 1 if w.severity == "medium" else 2, w.accuracy))
        return weaknesses

    @classmethod
    def build_profile(cls, player_id: str, attempts: List[RawAttempt]) -> LearningProfileData:
        """Construct full structured learning profile from attempts."""
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
