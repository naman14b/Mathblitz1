"""LangGraph Stateful Workflow for MathBlitz AI Coach.
Orchestrates player analysis, root-cause diagnosis, policy execution, lesson generation,
deterministic math verification, fingerprinting, and targeted interactive practice.
"""
import json
import logging
import random
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from ..config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
from ..coaching_policy import CoachingPolicyDecision, CoachingPolicyEngine
from ..learning_engine import LearningEngine, RawAttempt, TopicMetric
from ..taxonomy import CONCEPT_TAXONOMY, ConceptNode
from .math_verifier import compute_question_fingerprint, format_number, verify_explanation_consistency, verify_math_question
from .state import CoachingState, PracticeQuestion

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.4, max_tokens: int = 700) -> Optional[ChatOpenAI]:
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
            request_timeout=8,
            default_headers={
                "HTTP-Referer": "https://mathblitz.app",
                "X-Title": "MathBlitz AI Coach",
            },
        )
    except Exception as exc:
        logger.warning(f"[AICoach] Could not initialize LLM: {exc}")
        return None


# ── Built-in Deterministic Curated Fallbacks ──────────────────────────────────
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
    "percentages.increase_decrease": {
        "concept_explanation": "To increase or decrease a quantity by a percentage, calculate the percentage amount and add or subtract it from the original base.",
        "formula_breakdown": "New Value = Original × (1 ± P/100)",
        "example_problem": "What is 80 increased by 20%?",
        "example_solution": "20% of 80 = 16. New value = 80 + 16 = 96.",
        "practice_templates": [
            {"prompt": "What is 50 increased by 10%?", "answer": "55", "options": ["55", "50", "60", "65"], "method": "50 + (0.10 × 50) = 55"},
            {"prompt": "What is 100 decreased by 25%?", "answer": "75", "options": ["75", "80", "70", "85"], "method": "100 - (0.25 × 100) = 75"},
            {"prompt": "What is 60 increased by 15%?", "answer": "69", "options": ["69", "75", "65", "70"], "method": "60 + 9 = 69"},
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
    "algebra.basic_equations": {
        "concept_explanation": "In single-step equations, isolate the variable by performing the opposite mathematical operation on both sides.",
        "formula_breakdown": "x + a = b ⇒ x = b - a,  a × x = b ⇒ x = b ÷ a",
        "example_problem": "Solve for x: x + 8 = 23",
        "example_solution": "Subtract 8 from both sides: x = 23 - 8 = 15.",
        "practice_templates": [
            {"prompt": "Solve for x: x + 12 = 30", "answer": "18", "options": ["18", "12", "22", "42"], "method": "x = 30 - 12 = 18"},
            {"prompt": "Solve for x: 6x = 48", "answer": "8", "options": ["8", "6", "9", "7"], "method": "x = 48 ÷ 6 = 8"},
            {"prompt": "Solve for x: x - 9 = 15", "answer": "24", "options": ["24", "6", "22", "18"], "method": "x = 15 + 9 = 24"},
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
    "fractions.multiplication_division": {
        "concept_explanation": "To multiply fractions, multiply across the top and bottom. To divide fractions, flip the second fraction (reciprocal) and multiply.",
        "formula_breakdown": "(a/b) × (c/d) = (ac)/(bd),  (a/b) ÷ (c/d) = (ad)/(bc)",
        "example_problem": "Calculate: 2/3 × 3/4",
        "example_solution": "Multiply numerators: 2 × 3 = 6. Multiply denominators: 3 × 4 = 12. Simplify: 6/12 = 1/2.",
        "practice_templates": [
            {"prompt": "Calculate: 1/2 × 4/5", "answer": "2/5", "options": ["2/5", "4/10", "1/5", "5/8"], "method": "4/10 = 2/5"},
            {"prompt": "Calculate: 3/4 ÷ 1/2", "answer": "3/2", "options": ["3/2", "3/8", "1/2", "2/3"], "method": "3/4 × 2/1 = 6/4 = 3/2"},
            {"prompt": "Calculate: 2/5 × 5/6", "answer": "1/3", "options": ["1/3", "2/6", "1/2", "10/30"], "method": "10/30 = 1/3"},
        ],
    },
    "arithmetic.order_of_operations": {
        "concept_explanation": "Always evaluate mathematical expressions in PEMDAS/BODMAS order: Brackets first, then Exponents, then Multiplication & Division left-to-right, then Addition & Subtraction.",
        "formula_breakdown": "Parentheses → Exponents → Multiplication/Division → Addition/Subtraction",
        "example_problem": "Calculate: 4 + 6 × 3",
        "example_solution": "Multiplication first: 6 × 3 = 18. Then addition: 4 + 18 = 22 (NOT (4+6)×3=30).",
        "practice_templates": [
            {"prompt": "Calculate: 5 + 3 × 4", "answer": "17", "options": ["17", "32", "20", "15"], "method": "3 × 4 = 12, 5 + 12 = 17"},
            {"prompt": "Calculate: 20 - 8 ÷ 2", "answer": "16", "options": ["16", "6", "14", "18"], "method": "8 ÷ 2 = 4, 20 - 4 = 16"},
            {"prompt": "Calculate: 2 × 5 + 4 × 3", "answer": "22", "options": ["22", "42", "26", "18"], "method": "10 + 12 = 22"},
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
            game_mode=a.get("game_mode", "classic"),
            error_category=a.get("error_category"),
            error_hypothesis=a.get("error_hypothesis"),
        )
        for a in state.get("recent_performance", [])
    ]

    profile = LearningEngine.build_profile(state.get("player_id", "anon"), raw_attempts)

    # Determine focus concept
    focus_cid = state.get("current_concept_id")
    weakness_match = next((w for w in profile.weak_areas if w.concept_id == focus_cid), None)

    if not weakness_match:
        if profile.weak_areas:
            weakness_match = profile.weak_areas[0]
            focus_cid = weakness_match.concept_id
        else:
            focus_cid = focus_cid or "percentages.conversion"
            node = CONCEPT_TAXONOMY.get(focus_cid)
            weakness_match = None

    node = CONCEPT_TAXONOMY.get(focus_cid) or CONCEPT_TAXONOMY["percentages.conversion"]
    metric = profile.topic_metrics.get(focus_cid)

    # Execute Coaching Policy
    policy: CoachingPolicyDecision = CoachingPolicyEngine.evaluate_policy(
        surface_concept_id=focus_cid,
        metrics=profile.topic_metrics,
        recent_accuracy=metric.recent_accuracy if metric else 0.0,
        primary_error=metric.primary_error if metric else None,
        mastery_score=metric.mastery_score if metric else 50.0,
        sample_size=metric.total_attempts if metric else 0,
        is_regression=metric.regression_detected if metric else False,
    )

    target_node = CONCEPT_TAXONOMY.get(policy.target_learning_concept_id) or node

    return {
        "topic_metrics": {k: vars(v) for k, v in profile.topic_metrics.items()},
        "weak_topics": [vars(w) for w in profile.weak_areas],
        "current_concept_id": focus_cid,
        "current_concept_name": node.name,
        "current_topic": node.topic,
        "current_subtopic": node.subtopic,
        "target_learning_concept_id": policy.target_learning_concept_id,
        "target_learning_concept_name": policy.target_learning_concept_name,
        "is_prerequisite_gap": policy.is_prerequisite_gap,
        "root_cause_error": policy.root_cause_error,
        "common_mistake": (metric.primary_mistake_desc if metric and metric.primary_mistake_desc else (node.common_pitfalls[0] if node.common_pitfalls else "Formula calculation errors")),
        "learning_objective": policy.learning_objective,
        "evidence_summary": policy.evidence_summary,
        "intervention_type": policy.intervention_type,
        "mastery_before": metric.mastery_score if metric else 50.0,
        "confidence_before": metric.confidence if metric else 0.3,
        "retry_count": 0,
    }


def node_generate_and_verify_lesson(state: CoachingState) -> Dict[str, Any]:
    """Generate structured lesson and practice with deterministic SymPy verification & fingerprinting."""
    target_cid = state.get("target_learning_concept_id") or state.get("current_concept_id") or "percentages.conversion"
    target_node = CONCEPT_TAXONOMY.get(target_cid) or CONCEPT_TAXONOMY["percentages.conversion"]
    common_mistake = state.get("common_mistake", "")
    objective = state.get("learning_objective", "")
    fingerprints_seen: List[str] = list(state.get("fingerprints_seen") or [])

    llm = get_llm(temperature=0.3)

    if llm:
        system_prompt = (
            "You are MathBlitz AI Coach, a world-class, engaging mathematics coach. "
            "Generate an interactive, crystal-clear 5-step math lesson in strict JSON format.\n\n"
            "Format schema:\n"
            "{\n"
            '  "concept_explanation": "2-3 intuitive sentences explaining the core concept.",\n'
            '  "formula_breakdown": "Clear standard formula.",\n'
            '  "example_problem": "An explicit math question (e.g. Solve for x: 3x + 7 = 22).",\n'
            '  "example_solution": "Step 1: ... Step 2: ... Final answer: ...",\n'
            '  "practice_questions": [\n'
            '    {\n'
            '      "prompt": "Exact math question string",\n'
            '      "correct_answer": "Exact numerical or simplified answer",\n'
            '      "options": ["correct_answer", "distractor1", "distractor2", "distractor3"],\n'
            '      "solution_method": "1-sentence calculation step"\n'
            '    }\n'
            '  ]\n'
            "}\n"
            "CRITICAL RULES:\n"
            "1. practice_questions MUST contain exactly 3 questions.\n"
            "2. All options MUST be mathematically distinct and contain the exact correct_answer.\n"
            "3. Calculations MUST be 100% accurate."
        )

        user_content = (
            f"Concept: {target_node.name} ({target_cid})\n"
            f"Formula: {target_node.formula or 'Standard'}\n"
            f"Target Learning Objective: {objective}\n"
            f"Student Common Pitfall: {common_mistake}\n"
            f"Examples for reference: {target_node.examples}\n"
            "Output JSON only."
        )

        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_content),
            ])

            raw_json = response.content.strip()
            if raw_json.startswith("```json"):
                raw_json = raw_json[7:]
            if raw_json.endswith("```"):
                raw_json = raw_json[:-3]
            raw_json = raw_json.strip()

            parsed = json.loads(raw_json)

            # Deterministic Verification Pipeline
            verified_practice: List[PracticeQuestion] = []
            cand_questions = parsed.get("practice_questions", [])

            for idx, q in enumerate(cand_questions):
                prompt = q.get("prompt", "")
                claimed_ans = str(q.get("correct_answer", "")).strip()
                options = [str(o).strip() for o in q.get("options", [])]
                method = q.get("solution_method", "")

                is_valid, msg, verified_ans = verify_math_question(prompt, claimed_ans, options, topic=target_node.topic)

                if is_valid and verified_ans:
                    fp = compute_question_fingerprint(prompt, target_cid)
                    # Check fingerprint to prevent repetition
                    if fp not in fingerprints_seen:
                        fingerprints_seen.append(fp)
                        verified_practice.append(
                            PracticeQuestion(
                                id=f"q_{idx+1}_{random.randint(100, 999)}",
                                difficulty=idx + 1,
                                prompt=prompt,
                                options=options,
                                correct_answer=verified_ans,
                                solution_method=method or f"Verified solution = {verified_ans}",
                                concept_tested=target_node.name,
                                verified=True,
                                fingerprint=fp,
                            )
                        )

            # If all 3 practice questions passed SymPy validation
            if len(verified_practice) == 3:
                # Verify explanation consistency
                exp_valid, _ = verify_explanation_consistency(
                    prompt=parsed.get("example_problem", ""),
                    correct_answer=verified_practice[0]["correct_answer"],
                    explanation=parsed.get("concept_explanation", ""),
                    example_solution=parsed.get("example_solution", ""),
                )

                return {
                    "concept_explanation": parsed.get("concept_explanation", target_node.description),
                    "formula_breakdown": parsed.get("formula_breakdown", target_node.formula or "Standard formula"),
                    "example_problem": parsed.get("example_problem", target_node.examples[0] if target_node.examples else ""),
                    "example_solution": parsed.get("example_solution", ""),
                    "verified_practice": verified_practice,
                    "fingerprints_seen": fingerprints_seen,
                    "next_action": "show_step_1",
                }
            else:
                logger.warning(f"[AICoach] LLM produced only {len(verified_practice)}/3 verified questions. Using curated fallback.")
        except Exception as exc:
            logger.warning(f"[AICoach] Lesson generation failed: {exc}. Using curated fallback.")

    # ── Deterministic Curated Fallback ──
    fallback_data = CURATED_LESSONS.get(target_cid) or CURATED_LESSONS.get("percentages.conversion")
    curated_practice: List[PracticeQuestion] = []

    for idx, item in enumerate(fallback_data["practice_templates"]):
        fp = compute_question_fingerprint(item["prompt"], target_cid)
        fingerprints_seen.append(fp)
        curated_practice.append(
            PracticeQuestion(
                id=f"curated_{idx+1}",
                difficulty=idx + 1,
                prompt=item["prompt"],
                options=item["options"],
                correct_answer=item["answer"],
                solution_method=item["method"],
                concept_tested=target_node.name,
                verified=True,
                fingerprint=fp,
            )
        )

    return {
        "concept_explanation": fallback_data["concept_explanation"],
        "formula_breakdown": fallback_data["formula_breakdown"],
        "example_problem": fallback_data["example_problem"],
        "example_solution": fallback_data["example_solution"],
        "verified_practice": curated_practice,
        "fingerprints_seen": fingerprints_seen,
        "next_action": "show_step_1",
    }


def node_evaluate_practice_answer(state: CoachingState) -> Dict[str, Any]:
    """Deterministically evaluate student answer and calculate mastery delta."""
    idx = state.get("current_question_index", 0)
    practice_list = state.get("verified_practice", [])

    if idx < 0 or idx >= len(practice_list):
        return {"next_action": "complete_session"}

    question = practice_list[idx]
    student_ans = str(state.get("student_response", "")).strip().lower()
    correct_ans = str(question["correct_answer"]).strip().lower()

    is_correct = False
    try:
        s_num = float(student_ans)
        c_num = float(correct_ans)
        is_correct = abs(s_num - c_num) < 0.001
    except ValueError:
        is_correct = student_ans == correct_ans

    # Mastery Delta Calculation
    before = state.get("mastery_before", 50.0)
    conf_before = state.get("confidence_before", 0.3)

    if is_correct:
        delta = 6.0 + (question["difficulty"] * 2.0)  # +8 to +12
        conf_after = min(1.0, conf_before + 0.08)
        feedback = f"✨ Correct! {question['solution_method']}"
    else:
        delta = -2.0
        conf_after = conf_before
        feedback = f"Incorrect. Correct answer was {question['correct_answer']}. Method: {question['solution_method']}"

    after = min(100.0, max(0.0, before + delta))

    return {
        "is_response_correct": is_correct,
        "pedagogical_feedback": feedback,
        "mastery_after": after,
        "confidence_after": conf_after,
        "mastery_delta": delta,
        "next_action": "give_feedback",
    }


# ── LangGraph Workflow Construction ──────────────────────────────────────────

def build_coaching_graph():
    """Build the stateful LangGraph for MathBlitz AI Coach."""
    workflow = StateGraph(CoachingState)

    workflow.add_node("analyze_profile", node_load_player_profile)
    workflow.add_node("generate_lesson", node_generate_and_verify_lesson)
    workflow.add_node("evaluate_answer", node_evaluate_practice_answer)

    workflow.set_entry_point("analyze_profile")
    workflow.add_edge("analyze_profile", "generate_lesson")
    workflow.add_edge("generate_lesson", END)
    workflow.add_edge("evaluate_answer", END)

    return workflow.compile()


coaching_graph = build_coaching_graph()
coaching_workflow = coaching_graph


def run_coaching_graph(initial_state: CoachingState) -> CoachingState:
    """Execute stateful LangGraph workflow synchronously."""
    return coaching_graph.invoke(initial_state)
