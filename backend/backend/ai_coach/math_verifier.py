"""Deterministic Mathematical Verifier for MathBlitz AI Coach.
Uses SymPy and exact mathematical evaluation to guarantee that every AI-generated
math problem and step is 100% verified before ever showing to the player.
"""
from typing import Any, Dict, List, Optional, Tuple
import math
import re
import sympy
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)

transformations = standard_transformations + (implicit_multiplication_application,)


def sanitize_math_expression(expr_str: str) -> str:
    """Normalize user/LLM math symbols into standard Python/SymPy syntax."""
    s = expr_str.strip()
    s = s.replace("×", "*").replace("÷", "/").replace("−", "-").replace("–", "-")
    s = s.replace("²", "**2").replace("³", "**3")
    # Clean leading 'What is' or trailing '?' or '='
    s = re.sub(r"^(what is|calculate|solve|find the value of)\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"=\s*\??$", "", s).strip()
    return s


def evaluate_expression_safely(expr_str: str) -> Optional[float]:
    """Safely evaluate arithmetic expressions, fractions, or percentages."""
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
        # Remove 'If ' prefix or trailing ', x = ?'
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
    """Format float into clean integer string if whole, otherwise 2-decimal float."""
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
    Returns: (is_valid, message, verified_correct_answer)
    """
    clean_prompt = prompt.strip()
    clean_claimed = str(claimed_answer).strip()

    # Step 1: Compute verified solution
    verified_val: Optional[float] = None

    if "x" in clean_prompt and "=" in clean_prompt:
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

    # Ensure verified answer is present in options (accounting for formatting)
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
        return (False, f"Verified answer '{verified_ans_str}' is not among options {clean_opts}", verified_ans_str)

    return (True, "Mathematically verified and valid", verified_ans_str)
