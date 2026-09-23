"""LangGraph Typed State for MathBlitz AI Coach."""
from typing import Any, Dict, List, Optional, TypedDict


class PracticeQuestion(TypedDict):
    id: str
    difficulty: int  # 1 (Warmup), 2 (Core), 3 (Challenge)
    prompt: str
    options: List[str]
    correct_answer: str
    solution_method: str
    concept_tested: str
    verified: bool


class CoachingState(TypedDict, total=False):
    # Player identifiers and history
    player_id: str
    player_name: str
    recent_performance: List[Dict[str, Any]]
    topic_metrics: Dict[str, Any]
    weak_topics: List[Dict[str, Any]]
    detected_errors: List[Dict[str, Any]]

    # Current coaching target
    current_concept_id: str
    current_concept_name: str
    current_topic: str
    current_subtopic: str
    common_mistake: str
    learning_objective: str

    # Teaching material generated
    concept_explanation: str
    formula_breakdown: str
    example_problem: str
    example_solution: str
    teaching_notes: List[str]

    # Practice items (verified deterministically)
    practice_questions: List[PracticeQuestion]
    verified_practice: List[PracticeQuestion]

    # Student interactive response & evaluation
    current_question_index: int
    student_response: Optional[str]
    is_response_correct: Optional[bool]
    pedagogical_feedback: Optional[str]

    # Mastery scores
    mastery_before: float
    mastery_after: float
    mastery_delta: float

    # Workflow controls
    next_action: str  # "show_step_1" | "await_student_answer" | "give_feedback" | "complete_session" | "fallback"
    error_message: Optional[str]
