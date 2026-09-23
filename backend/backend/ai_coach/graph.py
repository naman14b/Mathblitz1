"""LangGraph Stateful Workflow for MathBlitz AI Coach.
Orchestrates player analysis, lesson generation, deterministic math verification,
and targeted interactive practice.
"""
import json
import logging
import random
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from ..config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
from ..learning_engine import LearningEngine, RawAttempt, TopicMetric
from ..taxonomy import CONCEPT_TAXONOMY, ConceptNode
from .math_verifier import format_number, verify_math_question
from .state import CoachingState, PracticeQuestion

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.5, max_tokens: int = 700) -> Optional[ChatOpenAI]:
    """Instantiate LangChain ChatOpenAI configured for OpenRouter."""
    if not OPENROUTER_API_KEY:
        return None
    try:
        return ChatOpenAI(
            model=OPENROUTER_MODEL,
            openai_api_key=OPENROUTER_API_KEY,
            openai_api_base=OPENROUTER_BASE_URL,
            temperature=temperature,
            max_tokens=max_tokens,
            default_headers={
                "HTTP-Referer": "https://mathblitz.app",
                "X-Title": "MathBlitz AI Coach",
            },
        )
    except Exception as exc:
        logger.warning(f"[AICoach] Could not initialize LLM: {exc}")
        return None


# ── Built-in Deterministic Curated Fallbacks ──────────────────────────────────
# Used for instantaneous zero-latency response or when OpenRouter is offline
CURATED_LESSONS: Dict[str, Dict[str, Any]] = {
    "percentages.conversion": {
        "concept_explanation": "A percentage literally means 'parts per hundred'. To convert a percentage to a fraction or decimal, divide the number by 100.",
        "formula_breakdown": "P% = P / 100 = 0.0P",
        "example_problem": "What is 15% of 200?",
        "example_solution": "15% means 15/100. (15/100) × 200 = 0.15 × 200 = 30.",
        "practice_templates": [
            {"prompt": "What is 20% of 150?", "answer": "30", "options": ["30", "20", "25", "35"], "method": "(20/100) × 150 = 30"},
            {"prompt": "What is 25% of 80?", "answer": "20", "options": ["20", "25", "16", "30"], "method": "(25/100) × 80 = 20"},
            {"prompt": "What is 15% of 120?", "answer": "18", "options": ["18", "15", "22", "12"], "method": "(15/100) × 120 = 18"},
        ],
    },
    "percentages.of_a_number": {
        "concept_explanation": "To find a percentage of any number, convert the percentage into a decimal or fraction and multiply it by the base value.",
        "formula_breakdown": "Result = (Percentage ÷ 100) × Base",
        "example_problem": "What is 30% of 90?",
        "example_solution": "30% = 0.30. Multiply 0.30 × 90 = 27.",
        "practice_templates": [
            {"prompt": "What is 10% of 240?", "answer": "24", "options": ["24", "10", "28", "20"], "method": "0.10 × 240 = 24"},
            {"prompt": "What is 50% of 76?", "answer": "38", "options": ["38", "35", "42", "50"], "method": "Half of 76 = 38"},
            {"prompt": "What is 15% of 60?", "answer": "9", "options": ["9", "15", "6", "12"], "method": "0.15 × 60 = 9"},
        ],
    },
    "algebra.linear_equations": {
        "concept_explanation": "To solve two-step linear equations, apply inverse operations in reverse order: first undo addition/subtraction, then undo multiplication/division.",
        "formula_breakdown": "ax + b = c ⇒ ax = c - b ⇒ x = (c - b) / a",
        "example_problem": "Solve for x: 3x + 7 = 22",
        "example_solution": "Subtract 7 from both sides: 3x = 15. Then divide both sides by 3: x = 5.",
        "practice_templates": [
            {"prompt": "Solve for x: 2x + 5 = 17", "answer": "6", "options": ["6", "5", "8", "11"], "method": "2x = 12 ⇒ x = 6"},
            {"prompt": "Solve for x: 4x - 6 = 18", "answer": "6", "options": ["6", "4", "7", "3"], "method": "4x = 24 ⇒ x = 6"},
            {"prompt": "Solve for x: 5x + 10 = 45", "answer": "7", "options": ["7", "9", "8", "5"], "method": "5x = 35 ⇒ x = 7"},
        ],
    },
    "algebra.negative_numbers": {
        "concept_explanation": "When multiplying two negative numbers, the result is positive. When multiplying a positive and negative, the result is negative.",
        "formula_breakdown": "(-) × (-) = (+),  (-) × (+) = (-)",
        "example_problem": "Calculate: (-4) × (-6) + (-5)",
        "example_solution": "(-4) × (-6) = +24. Then 24 + (-5) = 24 - 5 = 19.",
        "practice_templates": [
            {"prompt": "Calculate: (-3) × (-7)", "answer": "21", "options": ["21", "-21", "10", "-10"], "method": "Negative × Negative = +21"},
            {"prompt": "Calculate: -12 + (-8)", "answer": "-20", "options": ["-20", "-4", "20", "4"], "method": "-12 - 8 = -20"},
            {"prompt": "Calculate: 15 - (-9)", "answer": "24", "options": ["24", "6", "-24", "-6"], "method": "Subtracting negative adds: 15 + 9 = 24"},
        ],
    },
}


# ── Workflow Node Implementations ─────────────────────────────────────────────

def node_load_player_profile(state: CoachingState) -> Dict[str, Any]:
    """Analyze player's recent gameplay attempts deterministically."""
    raw_attempts = [
        RawAttempt(
            prompt=a.get("prompt", ""),
            player_answer=str(a.get("player_answer", "")),
            correct_answer=str(a.get("correct_answer", "")),
            is_correct=bool(a.get("is_correct", False)),
            topic=a.get("topic", "arithmetic"),
            subtopic=a.get("subtopic"),
            difficulty=a.get("difficulty", 1),
            response_time_ms=a.get("response_time_ms", 0),
            error_category=a.get("error_category"),
            error_hypothesis=a.get("error_hypothesis"),
        )
        for a in state.get("recent_performance", [])
    ]

    profile = LearningEngine.build_profile(state.get("player_id", "guest"), raw_attempts)

    # Convert topic metrics to serializable dicts
    serialized_metrics = {
        cid: {
            "concept_id": m.concept_id,
            "concept_name": m.concept_name,
            "topic": m.topic,
            "subtopic": m.subtopic,
            "accuracy": m.accuracy,
            "recent_accuracy": m.recent_accuracy,
            "trend": m.trend,
            "mastery_score": m.mastery_score,
            "confidence_level": m.confidence_level,
            "primary_error": m.primary_error,
            "primary_mistake_desc": m.primary_mistake_desc,
            "total_attempts": m.total_attempts,
            "correct_attempts": m.correct_attempts,
        }
        for cid, m in profile.topic_metrics.items()
    }

    weak_list = [
        {
            "concept_id": w.concept_id,
            "concept_name": w.concept_name,
            "topic": w.topic,
            "subtopic": w.subtopic,
            "accuracy": w.accuracy,
            "recent_accuracy": w.recent_accuracy,
            "severity": w.severity,
            "primary_error_category": w.primary_error_category,
            "common_mistake": w.common_mistake,
            "recommended_action": w.recommended_action,
            "mastery_score": w.mastery_score,
            "total_attempts": w.total_attempts,
        }
        for w in profile.weak_areas
    ]

    return {
        "topic_metrics": serialized_metrics,
        "weak_topics": weak_list,
    }


def node_identify_weakness(state: CoachingState) -> Dict[str, Any]:
    """Select the target concept to coach."""
    target_cid = state.get("current_concept_id")
    weak_topics = state.get("weak_topics", [])
    topic_metrics = state.get("topic_metrics", {})

    chosen_weakness: Optional[Dict[str, Any]] = None

    if target_cid and target_cid in topic_metrics:
        # User explicitly requested this concept
        m = topic_metrics[target_cid]
        chosen_weakness = {
            "concept_id": m["concept_id"],
            "concept_name": m["concept_name"],
            "topic": m["topic"],
            "subtopic": m["subtopic"],
            "accuracy": m["accuracy"],
            "mastery_score": m["mastery_score"],
            "common_mistake": m.get("primary_mistake_desc") or "Core formula application",
            "primary_error_category": m.get("primary_error") or "calculation_error",
        }
    elif weak_topics:
        # Pick the most severe detected weakness
        chosen_weakness = weak_topics[0]
    else:
        # Default to a core high-value concept
        chosen_weakness = {
            "concept_id": "percentages.conversion",
            "concept_name": "Percentage to Fraction Conversion",
            "topic": "percentages",
            "subtopic": "conversion",
            "accuracy": 50.0,
            "mastery_score": 50.0,
            "common_mistake": "Treating percentage number as direct multiplier",
            "primary_error_category": "percentage_conversion_error",
        }

    concept_id = chosen_weakness["concept_id"]
    mastery_before = chosen_weakness.get("mastery_score", 50.0)

    return {
        "current_concept_id": concept_id,
        "current_concept_name": chosen_weakness["concept_name"],
        "current_topic": chosen_weakness["topic"],
        "current_subtopic": chosen_weakness["subtopic"],
        "common_mistake": chosen_weakness.get("common_mistake", ""),
        "mastery_before": mastery_before,
        "learning_objective": f"Master {chosen_weakness['concept_name']} and prevent {chosen_weakness.get('common_mistake', 'mistakes')}",
    }


def node_generate_lesson(state: CoachingState) -> Dict[str, Any]:
    """Generate Step 1 (Understand) and Step 2 (Example) using LangChain with fallback."""
    concept_id = state.get("current_concept_id", "percentages.conversion")
    concept_name = state.get("current_concept_name", "Math Concept")
    common_mistake = state.get("common_mistake", "")
    llm = get_llm(temperature=0.3, max_tokens=600)

    lesson_data: Optional[Dict[str, Any]] = None

    if llm:
        system_prompt = (
            "You are MathBlitz AI Coach, a friendly, concise, expert math tutor. "
            "Your output must be strict valid JSON with keys: "
            "'concept_explanation' (2-3 punchy sentences), 'formula_breakdown' (key rule/formula), "
            "'example_problem' (short question), 'example_solution' (clear 1-2 line solution showing the step)."
        )
        user_prompt = (
            f"Concept: {concept_name} (ID: {concept_id})\n"
            f"Observed Player Mistake: {common_mistake}\n"
            "Teach the player how to fix this exact mistake. Provide clear, simple math."
        )

        try:
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ])
            text = resp.content.strip()
            # Parse JSON block
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            lesson_data = json.loads(text.strip())
        except Exception as exc:
            logger.warning(f"[AICoach] Lesson LLM generation failed: {exc}")

    # Fallback to curated lesson template if LLM failed or offline
    if not lesson_data or not lesson_data.get("concept_explanation"):
        template = CURATED_LESSONS.get(concept_id) or CURATED_LESSONS["percentages.conversion"]
        lesson_data = {
            "concept_explanation": template["concept_explanation"],
            "formula_breakdown": template["formula_breakdown"],
            "example_problem": template["example_problem"],
            "example_solution": template["example_solution"],
        }

    return {
        "concept_explanation": lesson_data["concept_explanation"],
        "formula_breakdown": lesson_data["formula_breakdown"],
        "example_problem": lesson_data["example_problem"],
        "example_solution": lesson_data["example_solution"],
    }


def node_generate_practice(state: CoachingState) -> Dict[str, Any]:
    """Generate 3 targeted practice questions for the interactive coaching session."""
    concept_id = state.get("current_concept_id", "percentages.conversion")
    concept_name = state.get("current_concept_name", "Math Concept")
    llm = get_llm(temperature=0.4, max_tokens=700)

    practice_items: List[PracticeQuestion] = []

    if llm:
        system_prompt = (
            "You are MathBlitz Question Generator. Output strict valid JSON array containing exactly 3 practice questions. "
            "Each question object must have: "
            "'id' (string), 'difficulty' (1=warmup, 2=core, 3=challenge), 'prompt' (string), "
            "'options' (array of 4 distinct numerical strings), 'correct_answer' (string matching one option), "
            "'solution_method' (1-sentence explanation), 'concept_tested' (string)."
        )
        user_prompt = f"Generate 3 progressive questions for concept '{concept_name}'."

        try:
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ])
            text = resp.content.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())
            if isinstance(parsed, list) and len(parsed) >= 3:
                practice_items = [
                    {
                        "id": f"coach-q-{i+1}",
                        "difficulty": q.get("difficulty", i + 1),
                        "prompt": str(q.get("prompt", "")),
                        "options": [str(opt) for opt in q.get("options", [])],
                        "correct_answer": str(q.get("correct_answer", "")),
                        "solution_method": str(q.get("solution_method", "")),
                        "concept_tested": concept_name,
                        "verified": False,
                    }
                    for i, q in enumerate(parsed[:3])
                ]
        except Exception as exc:
            logger.warning(f"[AICoach] Practice LLM generation failed: {exc}")

    # Fallback to curated templates if generation failed
    if len(practice_items) < 3:
        template = CURATED_LESSONS.get(concept_id) or CURATED_LESSONS["percentages.conversion"]
        practice_items = [
            {
                "id": f"curated-{i+1}",
                "difficulty": i + 1,
                "prompt": t["prompt"],
                "options": t["options"],
                "correct_answer": t["answer"],
                "solution_method": t["method"],
                "concept_tested": concept_name,
                "verified": True,
            }
            for i, t in enumerate(template["practice_templates"][:3])
        ]

    return {
        "practice_questions": practice_items,
        "current_question_index": 0,
    }


def node_verify_math(state: CoachingState) -> Dict[str, Any]:
    """
    Deterministically verify all generated practice questions.
    Filters or replaces any question with a verified mathematical result.
    """
    raw_questions = state.get("practice_questions", [])
    concept_id = state.get("current_concept_id", "percentages.conversion")
    verified_list: List[PracticeQuestion] = []

    for q in raw_questions:
        is_valid, msg, calculated_ans = verify_math_question(
            prompt=q["prompt"],
            claimed_answer=q["correct_answer"],
            options=q["options"],
        )

        if is_valid:
            q["verified"] = True
            verified_list.append(q)
        else:
            logger.warning(f"[AICoach] Question failed verification: {q['prompt']} ({msg}). Using certified fallback.")
            # Fall back to a guaranteed certified template
            template = CURATED_LESSONS.get(concept_id) or CURATED_LESSONS["percentages.conversion"]
            idx = min(len(verified_list), len(template["practice_templates"]) - 1)
            t = template["practice_templates"][idx]
            verified_list.append({
                "id": f"certified-{len(verified_list)+1}",
                "difficulty": len(verified_list) + 1,
                "prompt": t["prompt"],
                "options": t["options"],
                "correct_answer": t["answer"],
                "solution_method": t["method"],
                "concept_tested": state.get("current_concept_name", "Math"),
                "verified": True,
            })

    return {
        "verified_practice": verified_list,
        "practice_questions": verified_list,
        "next_action": "show_step_1",
    }


def node_evaluate_response(state: CoachingState) -> Dict[str, Any]:
    """Evaluate player's practice attempt and provide supportive pedagogical feedback."""
    q_idx = state.get("current_question_index", 0)
    questions = state.get("verified_practice", [])
    student_ans = str(state.get("student_response", "")).strip()

    if not questions or q_idx >= len(questions):
        return {
            "is_response_correct": False,
            "pedagogical_feedback": "Session complete.",
            "next_action": "complete_session",
        }

    curr_q = questions[q_idx]
    correct_ans = str(curr_q["correct_answer"]).strip()
    is_correct = student_ans == correct_ans

    llm = get_llm(temperature=0.3, max_tokens=250)
    feedback_text = ""

    if is_correct:
        feedback_text = f"Spot on! {curr_q['solution_method']}. You applied the concept perfectly."
    else:
        if llm:
            try:
                system_prompt = (
                    "You are MathBlitz AI Coach. The student made a mistake on a practice question. "
                    "In 1 to 2 warm, encouraging sentences: explain WHY the correct answer is right and guide them gently."
                )
                user_prompt = (
                    f"Question: {curr_q['prompt']}\n"
                    f"Student chosen answer: {student_ans}\n"
                    f"Correct answer: {correct_ans}\n"
                    f"Method: {curr_q['solution_method']}"
                )
                resp = llm.invoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt),
                ])
                feedback_text = resp.content.strip()
            except Exception:
                pass

        if not feedback_text:
            feedback_text = f"The correct answer is {correct_ans}. Remember: {curr_q['solution_method']}. Keep this rule in mind for the next one!"

    return {
        "is_response_correct": is_correct,
        "pedagogical_feedback": feedback_text,
    }


def node_update_learning_profile(state: CoachingState) -> Dict[str, Any]:
    """Calculate mastery score delta and prepare session completion."""
    mastery_before = state.get("mastery_before", 50.0)
    is_correct = state.get("is_response_correct", False)

    # Positive boost on correct answer (+15% to +20%), modest adjustment on mistake (+5% for effort/review)
    gain = 18.0 if is_correct else 6.0
    mastery_after = min(100.0, round(mastery_before + gain, 1))
    delta = round(mastery_after - mastery_before, 1)

    return {
        "mastery_after": mastery_after,
        "mastery_delta": delta,
        "next_action": "complete_session",
    }


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_coaching_graph():
    """Construct the LangGraph StateGraph with explicit nodes and transitions."""
    builder = StateGraph(CoachingState)

    # Add nodes
    builder.add_node("load_player_profile", node_load_player_profile)
    builder.add_node("identify_weakness", node_identify_weakness)
    builder.add_node("generate_lesson", node_generate_lesson)
    builder.add_node("generate_practice", node_generate_practice)
    builder.add_node("verify_math", node_verify_math)
    builder.add_node("evaluate_response", node_evaluate_response)
    builder.add_node("update_learning_profile", node_update_learning_profile)

    # Set entry point
    builder.set_entry_point("load_player_profile")

    # Transitions for lesson generation
    builder.add_edge("load_player_profile", "identify_weakness")
    builder.add_edge("identify_weakness", "generate_lesson")
    builder.add_edge("generate_lesson", "generate_practice")
    builder.add_edge("generate_practice", "verify_math")
    builder.add_edge("verify_math", END)

    # Transitions for answer evaluation
    builder.add_edge("evaluate_response", "update_learning_profile")
    builder.add_edge("update_learning_profile", END)

    return builder.compile()


# Singleton compiled graph instance
coaching_workflow = build_coaching_graph()
