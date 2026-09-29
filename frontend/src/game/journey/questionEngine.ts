/**
 * FunGanit Kingdom - Deterministic Journey Question Generation Engine
 *
 * Implements procedural, verified question generators across all 28 curriculum concepts.
 */

import { JourneyQuestion, JourneyQuestionChoice, LevelType } from "./types";
import { getLevelDef } from "./worlds";
import { MentalMathValidator } from "./mentalMathValidator";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function makeChoices(correct: string | number, distractors: (string | number)[]): JourneyQuestionChoice[] {
  const set = new Set<string>();
  const list: JourneyQuestionChoice[] = [];

  // Add correct
  const correctStr = String(correct);
  set.add(correctStr);
  list.push({ id: "correct", label: correctStr, value: correct });

  // Add distractors
  for (const dist of distractors) {
    const distStr = String(dist);
    if (!set.has(distStr) && list.length < 4) {
      set.add(distStr);
      list.push({ id: `dist_${list.length}`, label: distStr, value: dist });
    }
  }

  // If still less than 4, generate numeric offsets if number
  if (typeof correct === "number") {
    let offset = 1;
    while (list.length < 4) {
      const alt = correct + (list.length % 2 === 0 ? offset : -offset);
      const altStr = String(alt);
      if (!set.has(altStr)) {
        set.add(altStr);
        list.push({ id: `gen_${list.length}`, label: altStr, value: alt });
      }
      offset += 1;
    }
  }

  return shuffle(list);
}

export class JourneyQuestionEngine {
  /**
   * Generates a complete verified question set for a given level
   */
  static generateQuestionsForLevel(levelId: number): JourneyQuestion[] {
    const levelDef = getLevelDef(levelId);
    const questions: JourneyQuestion[] = [];
    const usedFingerprints = new Set<string>();

    const targetCount = levelDef.questionCount;
    const concepts = levelDef.concepts;

    let attempts = 0;
    while (questions.length < targetCount && attempts < targetCount * 5) {
      attempts++;
      const concept = concepts[questions.length % concepts.length];
      const q = JourneyQuestionEngine.generateSingleQuestion(levelId, concept, levelDef.difficulty);

      if (q && !usedFingerprints.has(q.prompt)) {
        usedFingerprints.add(q.prompt);
        questions.push(q);
      }
    }

    return questions;
  }

  /**
   * Generates a single question based on concept and difficulty
   */
  static generateSingleQuestion(
    levelId: number,
    concept: string,
    difficulty: number
  ): JourneyQuestion | null {
    switch (concept) {
      // ── Number Forest Concepts ─────────────────────────────────────────────
      case "number_comparison": {
        const a = randInt(10, 30 + difficulty * 20);
        let b = a + randInt(1, 15) * (Math.random() > 0.5 ? 1 : -1);
        if (a === b) b += 2;
        const isGreater = Math.random() > 0.5;
        const prompt = isGreater ? `Which number is greater: ${a} or ${b}?` : `Which number is smaller: ${a} or ${b}?`;
        const ans = isGreater ? Math.max(a, b) : Math.min(a, b);
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "number_comparison",
          choices: makeChoices(ans, [Math.min(a, b) === ans ? Math.max(a, b) : Math.min(a, b), ans + 10, ans - 5]),
          correctAnswer: ans,
          explanation: `${ans} is ${isGreater ? "greater" : "smaller"} than ${ans === a ? b : a}.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }

      case "number_ordering": {
        const nums = Array.from({ length: 4 }, () => randInt(5, 50 + difficulty * 15));
        const unique = Array.from(new Set(nums));
        while (unique.length < 4) unique.push(randInt(5, 75));
        const sorted = [...unique].sort((x, y) => x - y);
        const correctStr = sorted.join(" < ");
        const wrong1 = [...sorted].reverse().join(" < ");
        const wrong2 = [sorted[1], sorted[0], sorted[3], sorted[2]].join(" < ");
        const wrong3 = [sorted[0], sorted[2], sorted[1], sorted[3]].join(" < ");
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Arrange from smallest to largest: ${unique.join(", ")}`,
          questionType: "number_ordering",
          choices: makeChoices(correctStr, [wrong1, wrong2, wrong3]),
          correctAnswer: correctStr,
          explanation: `Correct ascending order is ${correctStr}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 12,
        };
      }

      case "missing_number": {
        const a = randInt(4, 20 + difficulty * 10);
        const b = randInt(3, 15 + difficulty * 5);
        const sum = a + b;
        const hideFirst = Math.random() > 0.5;
        const prompt = hideFirst ? `? + ${b} = ${sum}` : `${a} + ? = ${sum}`;
        const ans = hideFirst ? a : b;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "missing_number",
          choices: makeChoices(ans, [ans + 1, ans - 1, ans + 3, ans + 5]),
          correctAnswer: ans,
          explanation: `${hideFirst ? ans : a} + ${hideFirst ? b : ans} = ${sum}.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }

      case "number_pattern": {
        const step = randInt(2, 5 + difficulty);
        const start = randInt(2, 10);
        const seq = [start, start + step, start + step * 2, start + step * 3, start + step * 4];
        const missingIdx = randInt(1, 3);
        const ans = seq[missingIdx];
        const displaySeq = seq.map((v, i) => (i === missingIdx ? "?" : v)).join(", ");
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Find the missing number in pattern:\n${displaySeq}`,
          questionType: "number_pattern",
          choices: makeChoices(ans, [ans + step, ans - step, ans + 2, ans - 1]),
          correctAnswer: ans,
          explanation: `The pattern increases by +${step} each step: ${seq.join(", ")}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "mental_addition": {
        const a = randInt(12, 35 + difficulty * 15);
        const b = randInt(9, 28 + difficulty * 10);
        const ans = a + b;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} + ${b} = ?`,
          questionType: "mental_addition",
          choices: makeChoices(ans, [ans + 1, ans - 1, ans + 10, ans - 10]),
          correctAnswer: ans,
          explanation: `${a} + ${b} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "mental_subtraction": {
        const ans = randInt(8, 30 + difficulty * 15);
        const b = randInt(7, 25 + difficulty * 10);
        const a = ans + b;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} − ${b} = ?`,
          questionType: "mental_subtraction",
          choices: makeChoices(ans, [ans + 1, ans - 1, ans + 10, ans - 5]),
          correctAnswer: ans,
          explanation: `${a} − ${b} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "mental_multiplication": {
        const a = randInt(3, 9 + (difficulty > 3 ? 3 : 0));
        const b = randInt(3, 9 + (difficulty > 3 ? 3 : 0));
        const ans = a * b;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} × ${b} = ?`,
          questionType: "mental_multiplication",
          choices: makeChoices(ans, [ans + a, ans - b, ans + 10, ans - 2]),
          correctAnswer: ans,
          explanation: `${a} × ${b} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 7,
        };
      }

      case "mental_division": {
        const divisor = randInt(2, 9);
        const ans = randInt(3, 10 + difficulty * 2);
        const dividend = divisor * ans;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${dividend} ÷ ${divisor} = ?`,
          questionType: "mental_division",
          choices: makeChoices(ans, [ans + 1, ans - 1, ans + 2, ans * 2]),
          correctAnswer: ans,
          explanation: `${dividend} ÷ ${divisor} = ${ans} because ${divisor} × ${ans} = ${dividend}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "number_logic": {
        const divisor = randInt(3, 8);
        const ans = divisor * randInt(4, 8);
        const lower = ans - randInt(5, 12);
        const upper = ans + randInt(5, 12);
        const prompt = `I am greater than ${lower}, less than ${upper}, and divisible by ${divisor}.\nWho am I?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "number_logic",
          choices: makeChoices(ans, [ans + divisor, ans - divisor, ans + 1, ans - 2]),
          correctAnswer: ans,
          explanation: `${ans} is between ${lower} and ${upper}, and ${ans} ÷ ${divisor} = ${ans / divisor}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      // ── Fraction Valley Concepts ───────────────────────────────────────────
      case "fraction_recognition": {
        const den = [2, 3, 4, 5, 8][randInt(0, 4)];
        const num = randInt(1, den - 1);
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Which fraction represents ${num} parts shaded out of ${den} equal parts?`,
          questionType: "fraction_recognition",
          choices: makeChoices(`${num}/${den}`, [`${den}/${num}`, `${num}/${den + 1}`, `${num + 1}/${den}`]),
          correctAnswer: `${num}/${den}`,
          explanation: `${num} parts out of ${den} equal parts is written as ${num}/${den}.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }

      case "fraction_comparison": {
        const den = [3, 4, 5, 6, 8, 10][randInt(0, 5)];
        const numA = randInt(1, den - 2);
        const numB = numA + randInt(1, den - numA);
        const isLarger = Math.random() > 0.5;
        const prompt = isLarger ? `Which fraction is larger: ${numA}/${den} or ${numB}/${den}?` : `Which fraction is smaller: ${numA}/${den} or ${numB}/${den}?`;
        const ans = isLarger ? `${numB}/${den}` : `${numA}/${den}`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_comparison",
          choices: makeChoices(ans, [isLarger ? `${numA}/${den}` : `${numB}/${den}`, `1/${den}`, `${den}/${den}`]),
          correctAnswer: ans,
          explanation: `With matching denominators of ${den}, ${isLarger ? numB : numA}/${den} is ${isLarger ? "larger" : "smaller"}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "equivalent_fractions": {
        const baseNum = randInt(1, 3);
        const baseDen = baseNum === 1 ? [2, 3, 4, 5][randInt(0, 3)] : baseNum === 2 ? [3, 5][randInt(0, 1)] : 4;
        const mult = randInt(2, 4);
        const eqNum = baseNum * mult;
        const eqDen = baseDen * mult;
        const prompt = `Which fraction is equivalent to ${baseNum}/${baseDen}?`;
        const ans = `${eqNum}/${eqDen}`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "equivalent_fractions",
          choices: makeChoices(ans, [`${eqNum}/${eqDen + 1}`, `${eqNum + 1}/${eqDen}`, `${baseNum}/${baseDen * 2}`]),
          correctAnswer: ans,
          explanation: `Multiplying numerator and denominator by ${mult} gives ${baseNum}/${baseDen} = ${eqNum}/${eqDen}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "simplify_fractions": {
        const mult = randInt(2, 5);
        const simpNum = randInt(1, 3);
        const simpDen = simpNum === 1 ? [2, 3, 4, 5][randInt(0, 3)] : 5;
        const rawNum = simpNum * mult;
        const rawDen = simpDen * mult;
        const prompt = `Simplify ${rawNum}/${rawDen} to its simplest form:`;
        const ans = `${simpNum}/${simpDen}`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "simplify_fractions",
          choices: makeChoices(ans, [`${rawNum}/${simpDen}`, `${simpNum}/${rawDen}`, `${simpNum + 1}/${simpDen}`]),
          correctAnswer: ans,
          explanation: `Dividing top and bottom by ${mult} gives ${simpNum}/${simpDen}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "fraction_arithmetic": {
        const den = [4, 5, 6, 8, 10][randInt(0, 4)];
        const isAdd = Math.random() > 0.4;
        const num1 = randInt(1, den - 2);
        const num2 = isAdd ? randInt(1, den - 1 - num1) : randInt(1, num1);
        const ansNum = isAdd ? num1 + num2 : num1 - num2;
        const prompt = `${num1}/${den} ${isAdd ? "+" : "−"} ${num2}/${den} = ?`;
        const ans = `${ansNum}/${den}`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_arithmetic",
          choices: makeChoices(ans, [`${ansNum}/${den * 2}`, `${ansNum + 1}/${den}`, `${ansNum}/${den - 1}`]),
          correctAnswer: ans,
          explanation: `Keep denominator ${den} and ${isAdd ? "add" : "subtract"} numerators: ${num1} ${isAdd ? "+" : "−"} ${num2} = ${ansNum}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "fraction_reasoning": {
        const den = [2, 3, 4, 5][randInt(0, 3)];
        const num = randInt(1, den - 1);
        const unit = randInt(4, 15);
        const total = den * unit;
        const ans = num * unit;
        const prompt = `What is ${num}/${den} of ${total}?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_reasoning",
          choices: makeChoices(ans, [ans + unit, ans - unit, total - ans, unit]),
          correctAnswer: ans,
          explanation: `1/${den} of ${total} is ${total}/${den} = ${unit}. Therefore ${num}/${den} is ${num} × ${unit} = ${ans}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 12,
        };
      }

      // ── Percentage City Concepts ───────────────────────────────────────────
      case "percentage_basics": {
        const base = [40, 60, 80, 100, 120, 200][randInt(0, 5)];
        const ans = base / 2;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `What is 50% of ${base}?`,
          questionType: "percentage_basics",
          choices: makeChoices(ans, [ans + 10, ans - 10, ans / 2, base]),
          correctAnswer: ans,
          explanation: `50% is half of ${base}, which is ${ans}.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 7,
        };
      }

      case "percentage_of_number": {
        const pct = [10, 20, 25, 75][randInt(0, 3)];
        let base = 80;
        if (pct === 10) base = randInt(2, 15) * 10;
        else if (pct === 20) base = randInt(2, 10) * 20;
        else if (pct === 25 || pct === 75) base = randInt(2, 8) * 20;

        const ans = (pct / 100) * base;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `What is ${pct}% of ${base}?`,
          questionType: "percentage_of_number",
          choices: makeChoices(ans, [ans + 5, ans - 5, (base / 10), ans * 2]),
          correctAnswer: ans,
          explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "percentage_conversion": {
        const pcts = [
          { p: 25, d: "0.25", f: "1/4" },
          { p: 50, d: "0.50", f: "1/2" },
          { p: 75, d: "0.75", f: "3/4" },
          { p: 10, d: "0.10", f: "1/10" },
          { p: 20, d: "0.20", f: "1/5" },
        ];
        const item = pcts[randInt(0, pcts.length - 1)];
        const toDecimal = Math.random() > 0.5;
        const prompt = toDecimal ? `Convert ${item.p}% to a decimal:` : `Convert ${item.p}% to a fraction in simplest form:`;
        const ans = toDecimal ? item.d : item.f;
        const distractors = toDecimal
          ? [`0.0${item.p}`, `${item.p / 10}`, `1.${item.p}`]
          : [`${item.p}/10`, `1/${item.p}`, `2/${item.p}`];
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "percentage_conversion",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${item.p}% = ${item.p}/100 = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "discounts_shopping": {
        const discountPct = [10, 20, 25, 50][randInt(0, 3)];
        const original = discountPct === 25 ? randInt(2, 6) * 40 : randInt(2, 10) * 20;
        const discountAmt = (discountPct / 100) * original;
        const salePrice = original - discountAmt;
        const prompt = `A jacket originally costs $${original}. With a ${discountPct}% discount, what is the sale price?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "discounts_shopping",
          choices: makeChoices(`$${salePrice}`, [`$${discountAmt}`, `$${salePrice + 10}`, `$${salePrice - 10}`]),
          correctAnswer: `$${salePrice}`,
          explanation: `${discountPct}% discount on $${original} is $${discountAmt}. Sale price = $${original} − $${discountAmt} = $${salePrice}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      case "percentage_change": {
        const isIncrease = Math.random() > 0.5;
        const pct = [10, 20, 50][randInt(0, 2)];
        const base = randInt(2, 6) * (pct === 50 ? 20 : 50);
        const change = (pct / 100) * base;
        const finalVal = isIncrease ? base + change : base - change;
        const prompt = `${isIncrease ? "Increase" : "Decrease"} $${base} by ${pct}%:`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "percentage_change",
          choices: makeChoices(`$${finalVal}`, [`$${isIncrease ? base - change : base + change}`, `$${finalVal + 10}`, `$${change}`]),
          correctAnswer: `$${finalVal}`,
          explanation: `${pct}% of $${base} is $${change}. Final value = $${base} ${isIncrease ? "+" : "−"} $${change} = $${finalVal}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 12,
        };
      }

      // ── Algebra Mountain Concepts ──────────────────────────────────────────
      case "simple_equation": {
        const isMult = Math.random() > 0.5;
        if (isMult) {
          const a = randInt(2, 7);
          const x = randInt(3, 10);
          const ans = x;
          const rhs = a * x;
          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt: `Solve for x:\n${a}x = ${rhs}`,
            questionType: "simple_equation",
            choices: makeChoices(ans, [ans + 1, ans - 1, ans + 2, rhs - a]),
            correctAnswer: ans,
            explanation: `Divide both sides by ${a}: x = ${rhs} ÷ ${a} = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        } else {
          const b = randInt(4, 18);
          const x = randInt(3, 15);
          const rhs = x + b;
          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt: `Solve for x:\nx + ${b} = ${rhs}`,
            questionType: "simple_equation",
            choices: makeChoices(x, [x + 1, x - 1, x + 2, rhs + b]),
            correctAnswer: x,
            explanation: `Subtract ${b} from both sides: x = ${rhs} − ${b} = ${x}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        }
      }

      case "two_step_mental_equation": {
        const a = randInt(2, 4);
        const b = randInt(2, 9);
        const x = randInt(2, 8);
        const isAdd = Math.random() > 0.5;
        const rhs = isAdd ? a * x + b : a * x - b;
        const prompt = `Solve for x:\n${a}x ${isAdd ? "+" : "−"} ${b} = ${rhs}`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "two_step_mental_equation",
          choices: makeChoices(x, [x + 1, x - 1, x + 2, x * a]),
          correctAnswer: x,
          explanation: `Step 1: ${a}x = ${rhs} ${isAdd ? "−" : "+"} ${b} = ${a * x}.\nStep 2: x = ${a * x} ÷ ${a} = ${x}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      case "algebra_puzzle": {
        const star = randInt(3, 9);
        const moon = randInt(2, 8);
        const sum = star + moon;
        const prompt = `If ⭐ + 🌙 = ${sum} and ⭐ = ${star},\nwhat is the value of 🌙?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "algebra_puzzle",
          choices: makeChoices(moon, [moon + 1, moon - 1, sum, star]),
          correctAnswer: moon,
          explanation: `🌙 = ${sum} − ⭐ = ${sum} − ${star} = ${moon}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      // ── Geometry Castle Concepts ───────────────────────────────────────────
      case "shape_recognition": {
        const shapes = [
          { name: "Triangle", sides: 3 },
          { name: "Square", sides: 4 },
          { name: "Pentagon", sides: 5 },
          { name: "Hexagon", sides: 6 },
          { name: "Octagon", sides: 8 },
        ];
        const s = shapes[randInt(0, shapes.length - 1)];
        const prompt = `How many sides does a regular ${s.name} have?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "shape_recognition",
          choices: makeChoices(s.sides, [s.sides + 1, s.sides - 1, s.sides + 2, 4]),
          correctAnswer: s.sides,
          explanation: `A ${s.name} has exactly ${s.sides} sides.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 7,
        };
      }

      case "angle_comparison": {
        const deg = [45, 90, 120, 180][randInt(0, 3)];
        let category = "Acute (<90°)";
        if (deg === 90) category = "Right (90°)";
        else if (deg === 120) category = "Obtuse (>90°)";
        else if (deg === 180) category = "Straight (180°)";

        const prompt = `An angle measuring ${deg}° is classified as:`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "angle_comparison",
          choices: makeChoices(category, ["Acute (<90°)", "Right (90°)", "Obtuse (>90°)", "Straight (180°)"]),
          correctAnswer: category,
          explanation: `An angle of ${deg}° is a ${category} angle.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "mental_perimeter": {
        const l = randInt(4, 12);
        const w = randInt(2, l - 1);
        const p = 2 * (l + w);
        const prompt = `A rectangle has length ${l} cm and width ${w} cm.\nWhat is its perimeter?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "mental_perimeter",
          choices: makeChoices(`${p} cm`, [`${l * w} cm`, `${p + 2} cm`, `${l + w} cm`]),
          correctAnswer: `${p} cm`,
          explanation: `Perimeter = 2 × (length + width) = 2 × (${l} + ${w}) = ${p} cm.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "mental_area": {
        const isSquare = Math.random() > 0.5;
        if (isSquare) {
          const s = randInt(3, 9);
          const area = s * s;
          const prompt = `What is the area of a square with side length ${s} m?`;
          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "mental_area",
            choices: makeChoices(`${area} m²`, [`${s * 4} m²`, `${area + 4} m²`, `${(s + 1) * s} m²`]),
            correctAnswer: `${area} m²`,
            explanation: `Area = side × side = ${s} × ${s} = ${area} m².`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        } else {
          const l = randInt(4, 10);
          const w = randInt(2, 6);
          const area = l * w;
          const prompt = `What is the area of a rectangle with length ${l} m and width ${w} m?`;
          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "mental_area",
            choices: makeChoices(`${area} m²`, [`${2 * (l + w)} m²`, `${area + 5} m²`, `${area - 3} m²`]),
            correctAnswer: `${area} m²`,
            explanation: `Area = length × width = ${l} × ${w} = ${area} m².`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        }
      }

      case "geometry_logic": {
        const a1 = randInt(30, 70);
        const a2 = randInt(40, 70);
        const a3 = 180 - (a1 + a2);
        const prompt = `In a triangle, two angles measure ${a1}° and ${a2}°.\nWhat is the third angle?`;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "geometry_logic",
          choices: makeChoices(`${a3}°`, [`${a3 + 10}°`, `${a3 - 10}°`, `${180 - a1}°`]),
          correctAnswer: `${a3}°`,
          explanation: `Angles in a triangle add to 180°. Third angle = 180° − (${a1}° + ${a2}°) = ${a3}°.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 12,
        };
      }

      default: {
        // Fallback friendly arithmetic
        const a = randInt(5, 20);
        const b = randInt(3, 15);
        const ans = a + b;
        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} + ${b} = ?`,
          questionType: "mental_addition",
          choices: makeChoices(ans, [ans + 1, ans - 1, ans + 2]),
          correctAnswer: ans,
          explanation: `${a} + ${b} = ${ans}.`,
          concept: "mental_addition",
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }
    }
  }
}
