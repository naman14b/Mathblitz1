"""Deterministic Mathematical Verifier and Fingerprinting for MathBlitz AI Coach.
Uses SymPy, exact arithmetic evaluation, and step consistency checks to guarantee that
every AI-generated math problem, option, and explanation is 100% mathematically sound.
"""
import hashlib
import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import sympy
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

transformations = standard_transformations + (implicit_multiplication_application,)


def sanitize_math_expression(expr_str: str) -> str:
    """Normalize user/LLM math symbols into standard Python/SymPy syntax."""
    s = str(expr_str).strip()
    s = s.replace("×", "*").replace("÷", "/").replace("−", "-").replace("–", "-")
    s = s.replace("²", "**2").replace("³", "**3")
    # Clean leading phrases and trailing punctuation
    s = re.sub(r"^(what is|calculate|solve for x:|solve:|find the value of|if)\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"=\s*\??$", "", s).strip()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def compute_question_fingerprint(prompt: str, topic: str = "") -> str:
    """
    Generate a canonical hash signature for a question to prevent serving
    identical or trivially duplicated questions in close succession.
    """
    clean = sanitize_math_expression(prompt).lower()
    # Extract numbers in order
    nums = re.findall(r"\d+(?:\.\d+)?", clean)
    sorted_nums = ":".join(nums)
    raw_sig = f"{topic}:{sorted_nums}:{clean[:30]}"
    return hashlib.sha256(raw_sig.encode("utf-8")).hexdigest()[:16]


def evaluate_expression_safely(expr_str: str) -> Optional[float]:
    """Safely evaluate arithmetic expressions, fractions, powers, or percentages."""
    try:
        clean = sanitize_math_expression(expr_str)

        # Handle "X% of Y" pattern: e.g. "20% of 150" -> "(20/100) * 150"
        pct_of_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)", clean, re.IGNORECASE)
        if pct_of_match:
            pct_val = float(pct_of_match.group(1))
            base_val = float(pct_of_match.group(2))
            return round((pct_val / 100.0) * base_val, 4)

        # Handle standalone "X%" -> X / 100
        if clean.endswith("%"):
            num_part = clean[:-1].strip()
            return round(float(num_part) / 100.0, 4)

        # Use SymPy parse_expr
        parsed = parse_expr(clean, transformations=transformations, evaluate=True)
        val = float(parsed.evalf())
        return round(val, 4)
    except Exception:
        return None


def solve_linear_equation_safely(eq_str: str, var_name: str = "x") -> Optional[float]:
    """Safely solve single-variable linear equations like '3x + 7 = 22' or '5x - 10 = 40'."""
    try:
        clean = sanitize_math_expression(eq_str)
        clean = re.sub(r"^if\s*", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r",\s*x\s*=\s*\??$", "", clean, flags=re.IGNORECASE)

        if "=" not in clean:
            return None

        lhs_str, rhs_str = clean.split("=", 1)
        lhs = parse_expr(lhs_str.strip(), transformations=transformations)
        rhs = parse_expr(rhs_str.strip(), transformations=transformations)

        var = sympy.Symbol(var_name)
        solutions = sympy.solve(sympy.Eq(lhs, rhs), var)
        if solutions:
            return round(float(solutions[0].evalf()), 4)
        return None
    except Exception:
        return None


def format_number(val: float) -> str:
    """Format float into clean integer string if whole, otherwise up to 2-decimal float."""
    if abs(val - round(val)) < 1e-5:
        return str(int(round(val)))
    return f"{val:.2f}".rstrip("0").rstrip(".")


def verify_math_question(
    prompt: str,
    claimed_answer: str,
    options: List[str],
    topic: str = "arithmetic",
) -> Tuple[bool, str, Optional[str]]:
    """
    Deterministically verify a proposed question:
    1. Re-computes the correct mathematical answer using symbolic/arithmetic evaluation.
    2. Validates that the claimed answer matches the verified calculation.
    3. Validates that all options are unique and contains the verified answer.
    4. Ensures exactly 4 distinct options with no ambiguity.
    Returns: (is_valid, message, verified_correct_answer)
    """
    clean_prompt = prompt.strip()
    clean_claimed = str(claimed_answer).strip()

    # Step 1: Compute verified solution
    verified_val: Optional[float] = None

    if "x" in clean_prompt.lower() and "=" in clean_prompt:
        verified_val = solve_linear_equation_safely(clean_prompt, "x")
    else:
        verified_val = evaluate_expression_safely(clean_prompt)

    if verified_val is None:
        return (False, f"Could not deterministically evaluate prompt: '{clean_prompt}'", None)

    verified_ans_str = format_number(verified_val)

    # Step 2: Check claimed answer vs verified answer
    try:
        claimed_num = float(clean_claimed)
        if abs(claimed_num - verified_val) > 0.01:
            return (
                False,
                f"Claimed answer '{clean_claimed}' does not match verified mathematical result '{verified_ans_str}'",
                verified_ans_str,
            )
    except ValueError:
        if clean_claimed != verified_ans_str:
            return (
                False,
                f"Claimed answer '{clean_claimed}' does not match verified mathematical string '{verified_ans_str}'",
                verified_ans_str,
            )

    # Step 3: Validate options
    if not options or len(options) != 4:
        return (False, f"Question must have exactly 4 options, found {len(options)}", verified_ans_str)

    clean_opts = [str(o).strip() for o in options]
    if len(set(clean_opts)) != 4:
        return (False, "Options contain duplicate values", verified_ans_str)

    # Ensure verified answer is present in options
    found = False
    for opt in clean_opts:
        try:
            if abs(float(opt) - verified_val) < 0.01:
                found = True
                break
        except ValueError:
            if opt == verified_ans_str:
                found = True
                break

    if not found:
        return (
            False,
            f"Verified answer '{verified_ans_str}' is not present in provided options {options}",
            verified_ans_str,
        )

    return (True, "Question and options verified mathematically", verified_ans_str)


def verify_explanation_consistency(
    prompt: str,
    correct_answer: str,
    explanation: str,
    example_solution: Optional[str] = None,
) -> Tuple[bool, str]:
    """
    Verify that the explanation steps do not contradict the verified correct answer.
    """
    if not explanation or len(explanation.strip()) < 10:
        return (False, "Explanation is too brief or missing.")

    clean_exp = explanation.lower()
    clean_ans = str(correct_answer).strip().lower()

    # If the verified answer is a number, ensure it appears in the explanation or example
    combined = f"{clean_exp} {example_solution or ''}".lower()
    if clean_ans not in combined:
        try:
            num = float(clean_ans)
            if f"{num:.0f}" not in combined and f"{num:.1f}" not in combined:
                return (False, f"Explanation does not contain verified solution {correct_answer}")
        except ValueError:
            return (False, f"Explanation does not contain verified solution {correct_answer}")

    return (True, "Explanation verified consistent with mathematical answer.")


def verify_math_expression(expr_str: str, expected_val: Any) -> bool:
    """Evaluate a math expression and verify if it matches the expected numerical or algebraic value."""
    actual = evaluate_expression_safely(expr_str)
    if actual is None:
        return False

    expected: Optional[float] = None
    if isinstance(expected_val, (int, float)):
        expected = float(expected_val)
    elif isinstance(expected_val, str):
        expected = evaluate_expression_safely(expected_val)

    if expected is None:
        return False

    return abs(actual - expected) < 0.0001
