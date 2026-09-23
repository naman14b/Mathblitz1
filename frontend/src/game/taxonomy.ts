/**
 * Frontend Math Concept Taxonomy & Category Definitions
 */

export type TaxonomyConcept = {
  id: string;
  name: string;
  topic: string;
  subtopic: string;
  description: string;
  formula?: string;
  icon: string;
};

export const FRONTEND_TAXONOMY: Record<string, TaxonomyConcept> = {
  "percentages.conversion": {
    id: "percentages.conversion",
    name: "Percentage ↔ Fraction Conversion",
    topic: "percentages",
    subtopic: "conversion",
    description: "Convert between percentages, fractions, and decimals.",
    formula: "P% = P / 100",
    icon: "pie-chart",
  },
  "percentages.of_a_number": {
    id: "percentages.of_a_number",
    name: "Percentage of a Number",
    topic: "percentages",
    subtopic: "of_a_number",
    description: "Calculate percentages of quantities.",
    formula: "Result = (P / 100) × Base",
    icon: "analytics",
  },
  "algebra.linear_equations": {
    id: "algebra.linear_equations",
    name: "Linear Equations",
    topic: "algebra",
    subtopic: "linear_equations",
    description: "Isolating variables in equations.",
    formula: "ax + b = c ⇒ x = (c - b)/a",
    icon: "calculator",
  },
  "algebra.negative_numbers": {
    id: "algebra.negative_numbers",
    name: "Negative Numbers",
    topic: "algebra",
    subtopic: "negative_numbers",
    description: "Arithmetic with negative and signed integers.",
    formula: "(-a) × (-b) = ab",
    icon: "remove-circle",
  },
  "arithmetic.multiplication": {
    id: "arithmetic.multiplication",
    name: "Multiplication Speed",
    topic: "arithmetic",
    subtopic: "multiplication",
    description: "Rapid mental multiplication facts.",
    formula: "a × b = c",
    icon: "close",
  },
  "arithmetic.division": {
    id: "arithmetic.division",
    name: "Division & Factors",
    topic: "arithmetic",
    subtopic: "division",
    description: "Mental division and factor decomposition.",
    formula: "a ÷ b = c",
    icon: "git-commit",
  },
  "fractions.addition_subtraction": {
    id: "fractions.addition_subtraction",
    name: "Fraction Arithmetic",
    topic: "fractions",
    subtopic: "addition_subtraction",
    description: "Adding and subtracting common fractions.",
    formula: "a/c + b/c = (a+b)/c",
    icon: "cut",
  },
};
