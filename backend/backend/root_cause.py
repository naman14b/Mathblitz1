"""Root-Cause Learning Engine for MathBlitz AI Coach.
Distinguishes surface weaknesses from underlying foundational skill gaps and recurring error patterns.
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from .prerequisites import find_earliest_unmastered_prerequisite, get_all_ancestor_prerequisites
from .taxonomy import CONCEPT_TAXONOMY, ConceptNode


@dataclass
class RootCauseDiagnosis:
    surface_concept_id: str
    surface_concept_name: str
    recurring_error_category: str
    target_learning_concept_id: str
    target_learning_concept_name: str
    is_prerequisite_gap: bool
    evidence_summary: str
    confidence: float  # 0.0 - 1.0


class RootCauseEngine:
    """Analyzes player performance patterns to determine underlying root causes."""

    @classmethod
    def diagnose(
        cls,
        surface_concept_id: str,
        metrics: Dict[str, Any],  # Dict of concept_id -> TopicMetric
        primary_error: Optional[str] = None,
        recent_accuracy: float = 0.0,
    ) -> RootCauseDiagnosis:
        surface_node = CONCEPT_TAXONOMY.get(surface_concept_id)
        surface_name = surface_node.name if surface_node else surface_concept_id

        mastery_map: Dict[str, float] = {}
        for cid, met in metrics.items():
            if hasattr(met, "mastery_score"):
                mastery_map[cid] = float(met.mastery_score)
            elif isinstance(met, dict) and "mastery_score" in met:
                mastery_map[cid] = float(met["mastery_score"])

        # Check prerequisite DAG
        target_concept_id, prereq_reason = find_earliest_unmastered_prerequisite(
            focus_concept_id=surface_concept_id,
            mastery_by_concept=mastery_map,
            mastery_threshold=65.0,
            error_category=primary_error,
        )

        is_prereq_gap = target_concept_id != surface_concept_id
        target_node = CONCEPT_TAXONOMY.get(target_concept_id)
        target_name = target_node.name if target_node else target_concept_id

        if is_prereq_gap:
            evidence = prereq_reason or f"Foundational skill '{target_name}' must be strengthened to master '{surface_name}'."
            confidence = 0.85
        else:
            if primary_error and primary_error != "unknown":
                evidence = f"Recurring {primary_error.replace('_', ' ')} detected on '{surface_name}' (recent accuracy: {recent_accuracy:.0f}%)."
                confidence = 0.80
            else:
                evidence = f"Low recent accuracy ({recent_accuracy:.0f}%) on '{surface_name}' fundamentals."
                confidence = 0.70

        return RootCauseDiagnosis(
            surface_concept_id=surface_concept_id,
            surface_concept_name=surface_name,
            recurring_error_category=primary_error or "unknown",
            target_learning_concept_id=target_concept_id,
            target_learning_concept_name=target_name,
            is_prerequisite_gap=is_prereq_gap,
            evidence_summary=evidence,
            confidence=confidence,
        )
