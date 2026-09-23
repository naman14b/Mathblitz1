/**
 * MathBlitz Kingdom - Deterministic Mental Math Validator
 *
 * Guarantees all Journey questions are realistically solvable mentally
 * without paper, calculator, or excessive working memory load.
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  cognitiveLoad: number; // 1 (Very Light) to 5 (Challenging but Mental)
}

export class MentalMathValidator {
  /**
   * Evaluates an arithmetic expression or question parameters
   */
  static validateArithmetic(
    op: string,
    a: number,
    b: number,
    difficulty: number = 1
  ): ValidationResult {
    // 1. Number magnitude safety
    if (Math.abs(a) > 1000 || Math.abs(b) > 1000) {
      return { isValid: false, reason: "Operands exceed mental limit (>1000)", cognitiveLoad: 5 };
    }

    if (op === "+" || op === "-") {
      // 2-digit + 2-digit or 3-digit + round 10s
      if (difficulty <= 2) {
        if (a > 100 || b > 100) {
          return { isValid: false, reason: "Operands too large for Diff 1-2 addition/subtraction", cognitiveLoad: 3 };
        }
      } else {
        if (a > 500 && b > 200) {
          return { isValid: false, reason: "Requires written column addition", cognitiveLoad: 4 };
        }
      }
      return { isValid: true, cognitiveLoad: Math.min(5, Math.max(1, difficulty)) };
    }

    if (op === "*" || op === "×") {
      // Mental multiplication facts: one operand should be <= 12, or friendly round 10s/5s
      const isFriendlyA = a <= 12 || a % 10 === 0 || a % 5 === 0 || a === 15 || a === 20 || a === 25;
      const isFriendlyB = b <= 12 || b % 10 === 0 || b % 5 === 0 || b === 15 || b === 20 || b === 25;

      if (!isFriendlyA && !isFriendlyB) {
        return { isValid: false, reason: "Multiplication lacks friendly mental anchors (neither operand is <=12 or multiple of 5/10)", cognitiveLoad: 5 };
      }

      if (a > 30 && b > 30) {
        return { isValid: false, reason: "Multiplication of two large numbers requires written paper calculation", cognitiveLoad: 5 };
      }

      return { isValid: true, cognitiveLoad: Math.min(5, Math.max(2, difficulty)) };
    }

    if (op === "/" || op === "÷") {
      if (b === 0) return { isValid: false, reason: "Division by zero", cognitiveLoad: 5 };
      if (a % b !== 0) {
        return { isValid: false, reason: "Division must yield clean integer quotient without remainder for mental arithmetic", cognitiveLoad: 5 };
      }
      const quotient = a / b;
      if (quotient > 50 && b > 12) {
        return { isValid: false, reason: "Long division required", cognitiveLoad: 5 };
      }
      return { isValid: true, cognitiveLoad: Math.min(5, Math.max(2, difficulty)) };
    }

    return { isValid: true, cognitiveLoad: 2 };
  }

  /**
   * Validates fraction questions
   */
  static validateFraction(
    numerator: number,
    denominator: number,
    secondNumerator?: number,
    secondDenominator?: number
  ): ValidationResult {
    const FRIENDLY_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 50, 100];

    if (!FRIENDLY_DENOMINATORS.includes(denominator)) {
      return { isValid: false, reason: `Unfriendly denominator: ${denominator}`, cognitiveLoad: 4 };
    }

    if (secondDenominator && !FRIENDLY_DENOMINATORS.includes(secondDenominator)) {
      return { isValid: false, reason: `Unfriendly second denominator: ${secondDenominator}`, cognitiveLoad: 4 };
    }

    if (secondNumerator !== undefined && secondDenominator !== undefined) {
      // Like denominators or simple multiples (e.g. 2 and 4, 3 and 6, 5 and 10)
      const commonMult = denominator === secondDenominator ||
        denominator % secondDenominator === 0 ||
        secondDenominator % denominator === 0 ||
        (denominator <= 5 && secondDenominator <= 5);

      if (!commonMult) {
        return { isValid: false, reason: "Fractions require awkward least common denominator", cognitiveLoad: 5 };
      }
    }

    return { isValid: true, cognitiveLoad: 3 };
  }

  /**
   * Validates percentage questions
   */
  static validatePercentage(percent: number, baseNumber: number): ValidationResult {
    const FRIENDLY_PERCENTAGES = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100, 150, 200];

    if (!FRIENDLY_PERCENTAGES.includes(percent)) {
      return { isValid: false, reason: `Arbitrary percentage (${percent}%) requires written calculation`, cognitiveLoad: 5 };
    }

    // Base number should be divisible by relevant denominator mentally
    if (percent === 10 && baseNumber % 1 !== 0) {
      return { isValid: false, reason: "10% of decimal requires extra precision", cognitiveLoad: 3 };
    }
    if (percent === 25 && baseNumber % 4 !== 0 && baseNumber % 2 !== 0) {
      return { isValid: false, reason: "25% yields awkward fraction", cognitiveLoad: 4 };
    }

    return { isValid: true, cognitiveLoad: percent % 10 === 0 ? 2 : 3 };
  }

  /**
   * Validates linear algebra equations (e.g. ax + b = c)
   */
  static validateEquation(a: number, b: number, c: number): ValidationResult {
    // ax + b = c  =>  ax = c - b  =>  x = (c - b) / a
    if (a === 0) return { isValid: false, reason: "Coefficient 'a' cannot be 0", cognitiveLoad: 5 };

    const numerator = c - b;
    if (numerator % a !== 0) {
      return { isValid: false, reason: "Equation does not have clean integer solution", cognitiveLoad: 5 };
    }

    const solution = numerator / a;
    if (Math.abs(solution) > 50) {
      return { isValid: false, reason: "Solution is too large for fast mental solving", cognitiveLoad: 4 };
    }

    return { isValid: true, cognitiveLoad: a === 1 ? 2 : 3 };
  }

  /**
   * Validates geometric shapes & dimensions
   */
  static validateGeometry(shape: string, dimensions: Record<string, number>): ValidationResult {
    if (shape === "rectangle" || shape === "square") {
      const { length, width } = dimensions;
      if (length > 50 || width > 50) {
        return { isValid: false, reason: "Dimensions too large for mental perimeter/area", cognitiveLoad: 4 };
      }
      return { isValid: true, cognitiveLoad: 2 };
    }

    if (shape === "triangle") {
      const { base, height } = dimensions;
      // Either base or height must be even for clean (1/2)*b*h integer area
      if (base % 2 !== 0 && height % 2 !== 0) {
        return { isValid: false, reason: "Triangle area yields fractional units", cognitiveLoad: 4 };
      }
      return { isValid: true, cognitiveLoad: 3 };
    }

    return { isValid: true, cognitiveLoad: 2 };
  }
}
