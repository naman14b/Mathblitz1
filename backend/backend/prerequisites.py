"""Prerequisite DAG Traversal and Dependency Engine for MathBlitz AI Coach.
Manages concept dependencies, identifies prerequisite chains, and finds the earliest
unmastered foundational skill contributing to player weaknesses.
"""
from typing import Dict, List, Optional, Set, Tuple
from .taxonomy import CONCEPT_TAXONOMY, ConceptNode


def get_direct_prerequisites(concept_id: str) -> List[str]:
    """Return direct prerequisite concept IDs for a given concept."""
    node = CONCEPT_TAXONOMY.get(concept_id)
    if not node or not hasattr(node, "prerequisites"):
        return []
    return list(node.prerequisites)


def get_all_ancestor_prerequisites(concept_id: str) -> List[str]:
    """
    Return all recursive prerequisite concept IDs in topological dependency order
    (earliest foundational prerequisites first).
    """
    visited: Set[str] = set()
    order: List[str] = []

    def _dfs(cid: str):
        if cid in visited:
            return
        visited.add(cid)
        node = CONCEPT_TAXONOMY.get(cid)
        if node and hasattr(node, "prerequisites"):
            for prereq in node.prerequisites:
                if prereq in CONCEPT_TAXONOMY and prereq not in visited:
                    _dfs(prereq)
        order.append(cid)

    # Run DFS on direct prerequisites
    node = CONCEPT_TAXONOMY.get(concept_id)
    if node and hasattr(node, "prerequisites"):
        for prereq in node.prerequisites:
            _dfs(prereq)

    return order


def find_earliest_unmastered_prerequisite(
    focus_concept_id: str,
    mastery_by_concept: Dict[str, float],
    mastery_threshold: float = 70.0,
    error_category: Optional[str] = None,
) -> Tuple[str, Optional[str]]:
    """
    Deterministically trace prerequisites of a struggling concept.
    Only recommends a prerequisite if:
    1. The prerequisite has mastery below `mastery_threshold` (or is unknown with 0 attempts), OR
    2. The recurring error category specifically points to a prerequisite gap
       (e.g., percentage_conversion_error on percentage_increase points to percentages.conversion).

    Returns:
        (recommended_concept_id, reason_summary)
    """
    ancestors = get_all_ancestor_prerequisites(focus_concept_id)
    if not ancestors:
        return (focus_concept_id, None)

    # 1. Check if specific error category maps directly to a prerequisite
    if error_category:
        if error_category == "percentage_conversion_error":
            if "percentages.conversion" in ancestors and mastery_by_concept.get("percentages.conversion", 100.0) < mastery_threshold:
                return (
                    "percentages.conversion",
                    "Recurring percentage conversion mistakes indicate a need to review percentage ↔ decimal conversions first.",
                )
        elif error_category == "pemdas_violation":
            if "arithmetic.order_of_operations" in ancestors and mastery_by_concept.get("arithmetic.order_of_operations", 100.0) < mastery_threshold:
                return (
                    "arithmetic.order_of_operations",
                    "Operator precedence mistakes indicate a need to strengthen Order of Operations (PEMDAS/BODMAS).",
                )
        elif error_category == "inverted_fraction":
            if "fractions.multiplication_division" in ancestors and mastery_by_concept.get("fractions.multiplication_division", 100.0) < mastery_threshold:
                return (
                    "fractions.multiplication_division",
                    "Reciprocal fraction errors indicate a need to practice fraction division rules.",
                )
        elif error_category == "sign_reversal":
            if "algebra.negative_numbers" in ancestors and mastery_by_concept.get("algebra.negative_numbers", 100.0) < mastery_threshold:
                return (
                    "algebra.negative_numbers",
                    "Sign confusion indicates a need to review negative number integer arithmetic.",
                )

    # 2. Otherwise check earliest unmastered ancestor in prerequisite chain with telemetry
    for ancestor_id in ancestors:
        if ancestor_id in mastery_by_concept:
            ancestor_mastery = mastery_by_concept[ancestor_id]
            # If the ancestor has low mastery, it is an unmastered prerequisite
            if ancestor_mastery < mastery_threshold:
                ancestor_node = CONCEPT_TAXONOMY.get(ancestor_id)
                ancestor_name = ancestor_node.name if ancestor_node else ancestor_id
                return (
                    ancestor_id,
                    f"Foundational prerequisite '{ancestor_name}' has mastery of only {ancestor_mastery:.0f}%, which is required for '{focus_concept_id}'.",
                )

    # All prerequisites are sufficiently mastered or unflagged
    return (focus_concept_id, None)
