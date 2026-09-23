"""Coaching Policy Engine for MathBlitz AI Coach.
Deterministic policy layer between the Learning Engine / Root Cause Engine and LangGraph.
Decides the exact learning objective, intervention strategy, difficulty, and question count.
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from .root_cause import RootCauseDiagnosis, RootCauseEngine
from .taxonomy import CONCEPT_TAXONOMY


@dataclass
class CoachingPolicyDecision:
    surface_concept_id: str
    target_learning_concept_id: str
    target_learning_concept_name: str
    root_cause_error: str
    learning_objective: str
    intervention_type: str  # "teach_then_practice" | "rapid_remedial" | "refresher" | "challenge_check"
    recommended_difficulty: int  # 1 to 4
    recommended_question_count: int  # e.g. 3
    evidence_summary: str
    is_prerequisite_gap: bool


class CoachingPolicyEngine:
    """Computes deterministic coaching directives based on statistical evidence."""

    @classmethod
    def evaluate_policy(
        cls,
        surface_concept_id: str,
        metrics: Dict[str, Any],
        recent_accuracy: float = 0.0,
        primary_error: Optional[str] = None,
        mastery_score: float = 0.0,
        sample_size: int = 0,
        is_regression: bool = False,
    ) -> CoachingPolicyDecision:
        # Step 1: Diagnose root cause
        diag: RootCauseDiagnosis = RootCauseEngine.diagnose(
            surface_concept_id=surface_concept_id,
            metrics=metrics,
            primary_error=primary_error,
            recent_accuracy=recent_accuracy,
        )

        target_node = CONCEPT_TAXONOMY.get(diag.target_learning_concept_id)
        target_name = target_node.name if target_node else diag.target_learning_concept_id

        # Step 2: Determine Adaptive Difficulty
        # Difficulty rules:
        # accuracy < 40% -> 1
        # 40% - 70% -> 2
        # 70% - 85% -> 3
        # > 85% -> 4
        if recent_accuracy < 40.0:
            rec_difficulty = 1
        elif recent_accuracy < 70.0:
            rec_difficulty = max(1, (target_node.difficulty_tier if target_node else 2) - 1)
        elif recent_accuracy < 85.0:
            rec_difficulty = target_node.difficulty_tier if target_node else 2
        else:
            rec_difficulty = min(4, (target_node.difficulty_tier if target_node else 3) + 1)

        # Step 3: Determine Intervention Strategy
        if is_regression:
            intervention = "refresher"
            objective = f"Refresh and solidify core mechanics for {target_name} to recover mastery."
            q_count = 3
        elif diag.is_prerequisite_gap:
            intervention = "teach_then_practice"
            objective = f"Master foundational skill '{target_name}' before returning to '{diag.surface_concept_name}'."
            q_count = 3
        elif recent_accuracy < 45.0:
            intervention = "teach_then_practice"
            objective = f"Break down {target_name} step-by-step to eliminate recurring {diag.recurring_error_category.replace('_', ' ')}."
            q_count = 3
        else:
            intervention = "rapid_remedial"
            objective = f"Targeted practice on {target_name} to achieve high-accuracy consistency."
            q_count = 3

        return CoachingPolicyDecision(
            surface_concept_id=surface_concept_id,
            target_learning_concept_id=diag.target_learning_concept_id,
            target_learning_concept_name=target_name,
            root_cause_error=diag.recurring_error_category,
            learning_objective=objective,
            intervention_type=intervention,
            recommended_difficulty=rec_difficulty,
            recommended_question_count=q_count,
            evidence_summary=diag.evidence_summary,
            is_prerequisite_gap=diag.is_prerequisite_gap,
        )
