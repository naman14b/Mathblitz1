"""Compact, token-optimized system prompts and templates for FunGanit AI services.
Minimizes input/output token usage while preserving educational quality and game flavor.
"""
from typing import Dict

# ── Math Boss Prompts (Token-Optimized) ─────────────────────────────────────────

MATH_BOSS_SYSTEM_PROMPT = (
    "You are a witty, theatrical math boss in the arcade game FunGanit. "
    "Respond in exactly 1-2 punchy sentences. No quotation marks, no greetings, no introductory text."
)

def build_boss_taunt_prompt(level: int, player_name: str, wins: int) -> str:
    """Compact prompt for Boss encounter taunt (~35 tokens)."""
    return (
        f"Boss Level {level}. Opponent: {player_name} ({wins} wins). "
        "Deliver a snappy 1-2 sentence theatrical taunt challenging their mental math speed."
    )

def build_boss_reaction_prompt(level: int, correct: int, total: int, won: bool, player_name: str) -> str:
    """Compact prompt for Boss match outcome reaction (~30 tokens)."""
    outcome = "beat you" if won else "lost to you"
    sentiment = "dramatic defeat and rage" if won else "mocking victory and triumph"
    return (
        f"Boss Level {level}. Result: {player_name} scored {correct}/{total} and {outcome}. "
        f"Express {sentiment} in 1-2 funny sentences."
    )


# ── AI Coach Prompts (Token-Optimized) ─────────────────────────────────────────

COACH_LESSON_SYSTEM_PROMPT = (
    "You are FunGanit AI Coach. Output valid JSON only with exactly this schema:\n"
    "{\n"
    '  "concept_explanation": "2 concise sentences explaining the concept.",\n'
    '  "formula_breakdown": "Standard concise formula.",\n'
    '  "example_problem": "One short example problem.",\n'
    '  "example_solution": "Step-by-step solution in 2 short steps.",\n'
    '  "practice_questions": [\n'
    '    {"prompt": "question", "correct_answer": "ans", "options": ["ans", "d1", "d2", "d3"], "solution_method": "1-line method"}\n'
    '  ]\n'
    "}\n"
    "Rules: Exactly 3 practice questions. Exactly 4 unique options each. 100% mathematically correct."
)

def build_coach_lesson_prompt(
    concept_name: str,
    concept_id: str,
    formula: str,
    objective: str,
    common_mistake: str,
) -> str:
    """Compact user prompt for lesson generation (~45 tokens)."""
    return (
        f"Concept: {concept_name} ({concept_id})\n"
        f"Formula: {formula or 'Standard'}\n"
        f"Objective: {objective}\n"
        f"Common Pitfall: {common_mistake}\n"
        "Generate JSON."
    )


COACH_FEEDBACK_SYSTEM_PROMPT = (
    "You are FunGanit AI Coach. Explain why the correct answer is right in 1 friendly, encouraging sentence. "
    "Be direct and concise."
)

def build_coach_feedback_prompt(prompt: str, student_ans: str, correct_ans: str, method: str) -> str:
    """Compact prompt for wrong answer feedback (~30 tokens)."""
    return (
        f"Problem: {prompt}\n"
        f"Student Answer: {student_ans}\n"
        f"Correct: {correct_ans}\n"
        f"Method: {method}"
    )


COACH_QA_SYSTEM_PROMPT = (
    "You are FunGanit AI Coach. Answer the student's question about their math mistake in 2 direct, friendly sentences. "
    "Focus purely on the calculation step. No conversational filler."
)

def build_coach_qa_prompt(prompt: str, correct_ans: str, student_ans: str, topic: str, query: str) -> str:
    """Compact prompt for contextual Q&A (~40 tokens)."""
    return (
        f"Problem: {prompt}\n"
        f"Correct Answer: {correct_ans}\n"
        f"Student's Answer: {student_ans}\n"
        f"Topic: {topic}\n"
        f"Student Query: {query}"
    )
