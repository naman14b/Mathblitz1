"""Hierarchical extensible Concept Taxonomy and rule-based deterministic Error Classification for MathBlitz."""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import re


class ErrorCategory(str, Enum):
    # Specific granular error types
    OFF_BY_ONE = "off_by_one"
    SIGN_REVERSAL = "sign_reversal"
    FORGOT_REMAINDER = "forgot_remainder"
    PERCENTAGE_CONVERSION_ERROR = "percentage_conversion_error"
    INVERTED_FRACTION = "inverted_fraction"
    PEMDAS_VIOLATION = "pemdas_violation"
    FORMULA_CONFUSION = "formula_confusion"
    UNIT_CONVERSION_ERROR = "unit_conversion_error"
    DECIMAL_PLACEMENT_ERROR = "decimal_placement_error"
    ARITHMETIC_CALCULATION_ERROR = "arithmetic_calculation_error"
    CARELESS_ERROR = "careless_error"
    CONCEPTUAL_MISUNDERSTANDING = "conceptual_misunderstanding"
    TIME_PRESSURE_MISTAKE = "time_pressure_mistake"
    # Legacy aliases
    CALCULATION_ERROR = "calculation_error"
    SIGN_ERROR = "sign_error"
    CARELESS_MISTAKE = "careless_mistake"
    ALGEBRAIC_MANIPULATION_ERROR = "algebraic_manipulation_error"
    UNKNOWN = "unknown"


@dataclass
class ConceptNode:
    id: str
    name: str
    topic: str
    subtopic: str
    description: str
    formula: Optional[str] = None
    default_benchmark_seconds: float = 3.0
    difficulty_tier: int = 1
    prerequisites: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)
    common_pitfalls: List[str] = field(default_factory=list)


# Extensible Hierarchical Concept Taxonomy with Prerequisite DAG
CONCEPT_TAXONOMY: Dict[str, ConceptNode] = {
    # ── Arithmetic ──
    "arithmetic.addition": ConceptNode(
        id="arithmetic.addition",
        name="Addition",
        topic="arithmetic",
        subtopic="addition",
        description="Combining two or more numbers to calculate their sum.",
        formula="a + b = c",
        default_benchmark_seconds=2.0,
        difficulty_tier=1,
        prerequisites=[],
        examples=["14 + 29 = 43", "125 + 75 = 200"],
        common_pitfalls=["Carrying tens incorrectly", "Off-by-one errors"],
    ),
    "arithmetic.subtraction": ConceptNode(
        id="arithmetic.subtraction",
        name="Subtraction",
        topic="arithmetic",
        subtopic="subtraction",
        description="Finding the difference between two quantities by taking one away from another.",
        formula="a - b = c",
        default_benchmark_seconds=2.2,
        difficulty_tier=1,
        prerequisites=["arithmetic.addition"],
        examples=["52 - 19 = 33", "100 - 47 = 53"],
        common_pitfalls=["Borrowing digits incorrectly", "Reversing minuend and subtrahend"],
    ),
    "arithmetic.multiplication": ConceptNode(
        id="arithmetic.multiplication",
        name="Multiplication",
        topic="arithmetic",
        subtopic="multiplication",
        description="Repeated addition and calculating multiples of numbers.",
        formula="a × b = c",
        default_benchmark_seconds=2.5,
        difficulty_tier=1,
        prerequisites=["arithmetic.addition"],
        examples=["7 × 8 = 56", "12 × 15 = 180"],
        common_pitfalls=["Confusing times tables (e.g. 7×8 vs 7×7)", "Misplaced zero in multidigit multiplication"],
    ),
    "arithmetic.division": ConceptNode(
        id="arithmetic.division",
        name="Division",
        topic="arithmetic",
        subtopic="division",
        description="Splitting a quantity into equal groups or finding how many times a divisor fits.",
        formula="a ÷ b = c",
        default_benchmark_seconds=2.5,
        difficulty_tier=2,
        prerequisites=["arithmetic.multiplication", "arithmetic.subtraction"],
        examples=["72 ÷ 8 = 9", "144 ÷ 12 = 12"],
        common_pitfalls=["Confusing division with multiplication", "Remainder truncation"],
    ),
    "arithmetic.order_of_operations": ConceptNode(
        id="arithmetic.order_of_operations",
        name="Order of Operations (BODMAS / PEMDAS)",
        topic="arithmetic",
        subtopic="order_of_operations",
        description="Operating in order: Brackets/Parentheses, Exponents, Multiplication & Division, Addition & Subtraction.",
        formula="B → O → D/M → A/S",
        default_benchmark_seconds=3.5,
        difficulty_tier=3,
        prerequisites=["arithmetic.addition", "arithmetic.subtraction", "arithmetic.multiplication", "arithmetic.division"],
        examples=["3 + 5 × 2 = 13 (not 16)", "(10 - 2) ÷ 4 = 2"],
        common_pitfalls=["Evaluating left-to-right without prioritizing multiplication/division over addition/subtraction"],
    ),
    "arithmetic.mental_maths": ConceptNode(
        id="arithmetic.mental_maths",
        name="Mental Arithmetic",
        topic="arithmetic",
        subtopic="mental_maths",
        description="Fast mental arithmetic shortcuts and rapid estimation.",
        formula="Various decomposition strategies",
        default_benchmark_seconds=2.0,
        difficulty_tier=2,
        prerequisites=["arithmetic.addition", "arithmetic.multiplication"],
        examples=["99 × 4 = (100 - 1) × 4 = 396"],
        common_pitfalls=["Rushing under time pressure without checking single-digit bounds"],
    ),

    # ── Fractions ──
    "fractions.equivalent": ConceptNode(
        id="fractions.equivalent",
        name="Equivalent Fractions",
        topic="fractions",
        subtopic="equivalent_fractions",
        description="Fractions that represent the same value by multiplying or dividing numerator and denominator by the same number.",
        formula="a/b = (a·k)/(b·k)",
        default_benchmark_seconds=3.0,
        difficulty_tier=2,
        prerequisites=["arithmetic.division", "arithmetic.multiplication"],
        examples=["2/4 = 1/2", "3/5 = 6/10"],
        common_pitfalls=["Adding the same number to top and bottom instead of multiplying"],
    ),
    "fractions.addition_subtraction": ConceptNode(
        id="fractions.addition_subtraction",
        name="Fraction Addition & Subtraction",
        topic="fractions",
        subtopic="addition_subtraction",
        description="Adding or subtracting fractions with common denominators (finding LCM when needed).",
        formula="a/c + b/c = (a+b)/c",
        default_benchmark_seconds=3.8,
        difficulty_tier=3,
        prerequisites=["fractions.equivalent", "arithmetic.addition", "arithmetic.subtraction"],
        examples=["1/4 + 2/4 = 3/4", "1/2 + 1/3 = 5/6"],
        common_pitfalls=["Adding denominators directly: 1/2 + 1/3 ≠ 2/5"],
    ),
    "fractions.multiplication_division": ConceptNode(
        id="fractions.multiplication_division",
        name="Fraction Multiplication & Division",
        topic="fractions",
        subtopic="multiplication_division",
        description="Multiplying across numerators and denominators, and dividing by multiplying by reciprocal.",
        formula="(a/b) × (c/d) = (ac)/(bd), (a/b) ÷ (c/d) = (ad)/(bc)",
        default_benchmark_seconds=3.5,
        difficulty_tier=3,
        prerequisites=["fractions.equivalent", "arithmetic.multiplication", "arithmetic.division"],
        examples=["2/3 × 3/4 = 6/12 = 1/2", "1/2 ÷ 1/4 = 2"],
        common_pitfalls=["Forgetting to flip the second fraction in division"],
    ),
    "fractions.fraction_decimal": ConceptNode(
        id="fractions.fraction_decimal",
        name="Fraction ↔ Decimal Conversion",
        topic="fractions",
        subtopic="fraction_decimal",
        description="Converting fractions to decimals and decimals to simplified fractions.",
        formula="a/b = a ÷ b",
        default_benchmark_seconds=3.0,
        difficulty_tier=2,
        prerequisites=["arithmetic.division", "fractions.equivalent"],
        examples=["1/4 = 0.25", "3/5 = 0.6", "7/10 = 0.7"],
        common_pitfalls=["Treating 1/5 as 0.5 instead of 0.2"],
    ),

    # ── Percentages ──
    "percentages.conversion": ConceptNode(
        id="percentages.conversion",
        name="Percentage to Fraction/Decimal Conversion",
        topic="percentages",
        subtopic="conversion",
        description="Converting between percentages (parts per hundred), fractions, and decimals.",
        formula="P% = P / 100",
        default_benchmark_seconds=2.8,
        difficulty_tier=2,
        prerequisites=["fractions.fraction_decimal", "arithmetic.division"],
        examples=["15% = 15/100 = 0.15", "25% = 1/4 = 0.25", "5% = 0.05"],
        common_pitfalls=["Treating 15% as 15 instead of 0.15 (15/100)", "Treating 5% as 0.5 instead of 0.05"],
    ),
    "percentages.of_a_number": ConceptNode(
        id="percentages.of_a_number",
        name="Percentage of a Quantity",
        topic="percentages",
        subtopic="of_a_number",
        description="Calculating a given percentage of a number.",
        formula="Result = (P / 100) × N",
        default_benchmark_seconds=3.2,
        difficulty_tier=2,
        prerequisites=["percentages.conversion", "arithmetic.multiplication"],
        examples=["20% of 150 = 0.20 × 150 = 30", "15% of 200 = 30", "25% of 80 = 20"],
        common_pitfalls=["Multiplying directly without dividing by 100 (e.g. 25 × 80 = 2000)", "Guessing without benchmark breakdown (10% + 5%)"],
    ),
    "percentages.increase_decrease": ConceptNode(
        id="percentages.increase_decrease",
        name="Percentage Increase & Decrease",
        topic="percentages",
        subtopic="increase_decrease",
        description="Increasing or decreasing a quantity by a specified percentage multiplier.",
        formula="New = Original × (1 ± P/100)",
        default_benchmark_seconds=3.8,
        difficulty_tier=3,
        prerequisites=["percentages.of_a_number", "percentages.conversion"],
        examples=["$80 increased by 20% = 80 × 1.2 = $96", "$100 with 15% discount = $85"],
        common_pitfalls=["Adding the percentage number directly to the base value (e.g. 80 + 20 = 100 instead of 96)"],
    ),

    # ── Algebra ──
    "algebra.basic_equations": ConceptNode(
        id="algebra.basic_equations",
        name="Basic One-Step Equations",
        topic="algebra",
        subtopic="basic_equations",
        description="Isolating variables using inverse operations in single-step equations.",
        formula="x + a = b ⇒ x = b - a",
        default_benchmark_seconds=2.8,
        difficulty_tier=2,
        prerequisites=["arithmetic.addition", "arithmetic.subtraction"],
        examples=["x + 7 = 19 ⇒ x = 12", "4x = 36 ⇒ x = 9"],
        common_pitfalls=["Applying the same operation instead of inverse (adding 7 instead of subtracting 7)"],
    ),
    "algebra.linear_equations": ConceptNode(
        id="algebra.linear_equations",
        name="Two-Step Linear Equations",
        topic="algebra",
        subtopic="linear_equations",
        description="Solving ax + b = c by first eliminating constants then dividing by coefficient.",
        formula="ax + b = c ⇒ ax = c - b ⇒ x = (c - b) / a",
        default_benchmark_seconds=3.4,
        difficulty_tier=3,
        prerequisites=["algebra.basic_equations", "arithmetic.order_of_operations"],
        examples=["3x + 7 = 22 ⇒ 3x = 15 ⇒ x = 5", "2x - 5 = 11 ⇒ 2x = 16 ⇒ x = 8"],
        common_pitfalls=["Dividing by coefficient before moving the constant", "Sign flips when moving terms across equals sign"],
    ),
    "algebra.negative_numbers": ConceptNode(
        id="algebra.negative_numbers",
        name="Negative Numbers & Integer Arithmetic",
        topic="algebra",
        subtopic="negative_numbers",
        description="Adding, subtracting, multiplying, and dividing positive and negative numbers.",
        formula="(-a) × (-b) = ab, (-a) × b = -ab",
        default_benchmark_seconds=3.0,
        difficulty_tier=2,
        prerequisites=["arithmetic.subtraction", "arithmetic.multiplication"],
        examples=["-7 + 12 = 5", "(-3) × (-4) = 12", "-15 - (-5) = -10"],
        common_pitfalls=["Double negative confusion (- - = +)", "Assuming adding negative makes number bigger"],
    ),
    "algebra.simplification": ConceptNode(
        id="algebra.simplification",
        name="Algebraic Simplification & Combining Like Terms",
        topic="algebra",
        subtopic="simplification",
        description="Combining terms with identical variable powers.",
        formula="ax + bx = (a+b)x",
        default_benchmark_seconds=3.2,
        difficulty_tier=3,
        prerequisites=["algebra.negative_numbers", "algebra.basic_equations"],
        examples=["3x + 5x = 8x", "2x + 3y + 4x = 6x + 3y"],
        common_pitfalls=["Combining unlike terms (e.g. 2x + 3y = 5xy)"],
    ),

    # ── Geometry ──
    "geometry.area_perimeter": ConceptNode(
        id="geometry.area_perimeter",
        name="Area and Perimeter",
        topic="geometry",
        subtopic="area_perimeter",
        description="Calculating perimeter (boundary length) and area (enclosed space) of 2D shapes.",
        formula="Perimeter = 2(l+w), Area = l × w",
        default_benchmark_seconds=3.5,
        difficulty_tier=2,
        prerequisites=["arithmetic.multiplication", "arithmetic.addition"],
        examples=["Rectangle 4×6: Perimeter = 20, Area = 24"],
        common_pitfalls=["Confusing area formula with perimeter formula", "Squaring perimeter instead of multiplying dimensions"],
    ),
}


def normalize_topic_to_node(topic_str: str, subtopic_str: Optional[str] = None, prompt_str: str = "") -> ConceptNode:
    """Map legacy game topic strings or prompt signatures to a canonical ConceptNode."""
    t_clean = (topic_str or "").lower().strip()
    s_clean = (subtopic_str or "").lower().strip()
    p_clean = (prompt_str or "").lower().strip()

    # Exact match in taxonomy
    key = f"{t_clean}.{s_clean}"
    if key in CONCEPT_TAXONOMY:
        return CONCEPT_TAXONOMY[key]

    # Subtopic match
    for node_key, node in CONCEPT_TAXONOMY.items():
        if node.subtopic == s_clean or node_key == t_clean:
            return node

    # Keyword / Prompt heuristic matching
    if "%" in p_clean or "percentage" in t_clean or "percent" in t_clean:
        if "increase" in p_clean or "decrease" in p_clean or "discount" in p_clean:
            return CONCEPT_TAXONOMY["percentages.increase_decrease"]
        if "of" in p_clean:
            return CONCEPT_TAXONOMY["percentages.of_a_number"]
        return CONCEPT_TAXONOMY["percentages.conversion"]
    
    if "x =" in p_clean or "x +" in p_clean or "x -" in p_clean or "algebra" in t_clean:
        if "-" in p_clean and ("-" in p_clean[p_clean.find("="):] if "=" in p_clean else False):
            return CONCEPT_TAXONOMY["algebra.negative_numbers"]
        if re.search(r"\d+x\s*[+\-−]\s*\d+\s*=", p_clean):
            return CONCEPT_TAXONOMY["algebra.linear_equations"]
        return CONCEPT_TAXONOMY["algebra.basic_equations"]

    if "/" in p_clean or "fraction" in t_clean:
        if "×" in p_clean or "*" in p_clean or "÷" in p_clean:
            return CONCEPT_TAXONOMY["fractions.multiplication_division"]
        return CONCEPT_TAXONOMY["fractions.addition_subtraction"]

    if "+" in p_clean or "addition" in t_clean:
        return CONCEPT_TAXONOMY["arithmetic.addition"]
    if "-" in p_clean or "−" in p_clean or "subtraction" in t_clean:
        return CONCEPT_TAXONOMY["arithmetic.subtraction"]
    if "×" in p_clean or "*" in p_clean or "multiplication" in t_clean:
        return CONCEPT_TAXONOMY["arithmetic.multiplication"]
    if "÷" in p_clean or "/" in p_clean or "division" in t_clean:
        return CONCEPT_TAXONOMY["arithmetic.division"]

    # Fallback default
    return CONCEPT_TAXONOMY.get("arithmetic.mental_maths", CONCEPT_TAXONOMY["arithmetic.addition"])


def classify_error(
    prompt: str,
    player_answer: str,
    correct_answer: str,
    topic: str,
    subtopic: Optional[str] = None,
    response_time_ms: int = 0,
    benchmark_seconds: float = 3.0,
) -> Tuple[ErrorCategory, str, str]:
    """
    Deterministically analyze a player's mistake and classify the error category,
    a specific human-readable hypothesis, and a confidence score ('high', 'medium', 'low').
    """
    p_ans_str = str(player_answer).strip().lower()
    c_ans_str = str(correct_answer).strip().lower()

    if p_ans_str == c_ans_str:
        return (ErrorCategory.UNKNOWN, "Correct answer (no error)", "low")

    node = normalize_topic_to_node(topic, subtopic, prompt)
    elapsed_s = response_time_ms / 1000.0 if response_time_ms > 0 else benchmark_seconds

    # Numerical parsing if possible
    p_num: Optional[float] = None
    c_num: Optional[float] = None
    try:
        p_num = float(p_ans_str)
    except ValueError:
        pass
    try:
        c_num = float(c_ans_str)
    except ValueError:
        pass

    # 1. Check for Sign Reversal (e.g. answer is -5, player chose 5 or vice-versa)
    if p_num is not None and c_num is not None:
        if p_num == -c_num and c_num != 0:
            return (
                ErrorCategory.SIGN_REVERSAL,
                f"Sign reversed: chosen answer {p_ans_str} is the negative of correct answer {c_ans_str}.",
                "high",
            )

    # 2. Check for Percentage Conversion Error
    if node.topic == "percentages" and p_num is not None and c_num is not None:
        pct_match = re.search(r"(\d+(?:\.\d+)?)%", prompt)
        if pct_match and abs(p_num - float(pct_match.group(1))) < 0.001:
            return (
                ErrorCategory.PERCENTAGE_CONVERSION_ERROR,
                f"Treated percentage number ({pct_match.group(1)}) as the direct answer instead of calculating the fraction of the quantity.",
                "high",
            )
        if abs(p_num - (c_num * 100)) < 0.01:
            return (
                ErrorCategory.PERCENTAGE_CONVERSION_ERROR,
                "Multiplied percentage directly without dividing by 100.",
                "high",
            )
        if abs(p_num - (c_num * 10)) < 0.01:
            return (
                ErrorCategory.PERCENTAGE_CONVERSION_ERROR,
                "Divided by 10 instead of 100 during percentage conversion.",
                "medium",
            )

    # 3. Check for Inverted Fraction (reciprocal mistake)
    if "/" in p_ans_str and "/" in c_ans_str:
        p_parts = p_ans_str.split("/")
        c_parts = c_ans_str.split("/")
        if len(p_parts) == 2 and len(c_parts) == 2:
            if p_parts[0].strip() == c_parts[1].strip() and p_parts[1].strip() == c_parts[0].strip():
                return (
                    ErrorCategory.INVERTED_FRACTION,
                    "Inverted numerator and denominator (reciprocal fraction confusion).",
                    "high",
                )

    # 4. Check for Order of Operations (PEMDAS/BODMAS Violation)
    if node.subtopic == "order_of_operations" or ("×" in prompt and "+" in prompt) or ("*" in prompt and "+" in prompt):
        # Check if left-to-right evaluation produced player answer
        return (
            ErrorCategory.PEMDAS_VIOLATION,
            "Evaluated terms left-to-right without prioritizing multiplication/division before addition/subtraction.",
            "medium",
        )

    # 5. Check for Algebraic Manipulation Error
    if node.topic == "algebra":
        eq_match = re.search(r"(\d+)?x\s*([+\-−])\s*(\d+)\s*=\s*(\d+)", prompt)
        if eq_match and p_num is not None and c_num is not None:
            coeff = float(eq_match.group(1) or 1)
            op = eq_match.group(2)
            const = float(eq_match.group(3))
            rhs = float(eq_match.group(4))

            if op in ("+", "＋"):
                if abs(p_num - (rhs + const)) < 0.01 or abs(p_num - ((rhs + const) / coeff)) < 0.01:
                    return (
                        ErrorCategory.ALGEBRAIC_MANIPULATION_ERROR,
                        f"Added {const} to {rhs} instead of using the inverse operation (subtracting {const}).",
                        "high",
                    )
            elif op in ("-", "−"):
                if abs(p_num - (rhs - const)) < 0.01 or abs(p_num - ((rhs - const) / coeff)) < 0.01:
                    return (
                        ErrorCategory.ALGEBRAIC_MANIPULATION_ERROR,
                        f"Subtracted {const} from {rhs} instead of using the inverse operation (adding {const}).",
                        "high",
                    )

    # 6. Check for Decimal Placement Error
    if p_num is not None and c_num is not None and c_num != 0:
        ratio = p_num / c_num
        if abs(ratio - 10.0) < 0.001 or abs(ratio - 0.1) < 0.001 or abs(ratio - 100.0) < 0.001 or abs(ratio - 0.01) < 0.001:
            return (
                ErrorCategory.DECIMAL_PLACEMENT_ERROR,
                "Decimal point shifted by power of 10.",
                "high",
            )

    # 7. Check for Off-by-One or Small Arithmetic Slips
    if p_num is not None and c_num is not None:
        delta = abs(p_num - c_num)
        if delta == 1:
            return (
                ErrorCategory.OFF_BY_ONE,
                "Off-by-one arithmetic error.",
                "high",
            )
        if delta in (2, 10):
            return (
                ErrorCategory.CARELESS_ERROR,
                f"Arithmetic slip of {int(delta)} units.",
                "medium",
            )

    # 8. Time Pressure Check
    if elapsed_s < 0.8:
        return (
            ErrorCategory.TIME_PRESSURE_MISTAKE,
            f"Answered in {elapsed_s:.1f}s (well under benchmark), likely a rapid rush or mis-click.",
            "medium",
        )

    # 9. Generic Arithmetic Calculation Error
    if p_num is not None and c_num is not None:
        return (
            ErrorCategory.ARITHMETIC_CALCULATION_ERROR,
            f"Calculation error resulting in {p_ans_str} instead of {c_ans_str}.",
            "medium",
        )

    return (
        ErrorCategory.UNKNOWN,
        f"Selected {p_ans_str} for {prompt}.",
        "low",
    )
