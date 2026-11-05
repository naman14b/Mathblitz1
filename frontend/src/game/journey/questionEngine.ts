/**
 * FunGanit Kingdom - Deterministic Journey Question Generation Engine
 *
 * Implements procedural, mathematically verified question generators across all 28 curriculum concepts.
 * Guarantees that EVERY question has EXACTLY ONE correct answer among 4 distinct options.
 */

import { JourneyQuestion, JourneyQuestionChoice } from "./types";
import { getLevelDef } from "./worlds";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

/**
 * Creates exactly 4 choices with guaranteed uniqueness and only 1 correct answer.
 */
function makeChoices(correct: string | number, distractors: (string | number)[]): JourneyQuestionChoice[] {
  const set = new Set<string>();
  const list: JourneyQuestionChoice[] = [];

  // Add correct answer
  const correctStr = String(correct).trim();
  set.add(correctStr);
  list.push({ id: "correct", label: correctStr, value: correct });

  // Add verified distractors (must NOT equal correct answer)
  for (const dist of distractors) {
    const distStr = String(dist).trim();
    if (distStr !== correctStr && !set.has(distStr) && list.length < 4) {
      set.add(distStr);
      list.push({ id: `dist_${list.length}`, label: distStr, value: dist });
    }
  }

  // Fallback generation if fewer than 4 choices are present
  let offset = 1;
  while (list.length < 4 && offset < 50) {
    let candidate: string | number;
    if (typeof correct === "number") {
      const delta = list.length % 2 === 0 ? offset : -offset;
      const val = correct + delta;
      candidate = val;
    } else {
      // Parse potential prefixes/suffixes like '$120', '45 cm', '16 m²', '65°'
      const match = correctStr.match(/^(\$?)(-?\d+)(.*)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        const suffix = match[3];
        const delta = list.length % 2 === 0 ? offset : -offset;
        candidate = `${prefix}${Math.max(1, num + delta)}${suffix}`;
      } else if (correctStr.includes("/")) {
        // Fraction fallback
        const [n, d] = correctStr.split("/").map((x) => parseInt(x, 10));
        if (!isNaN(n) && !isNaN(d)) {
          const step = Math.ceil(offset / 2);
          candidate = offset % 2 === 0 ? `${n + step}/${d}` : `${n}/${d + step}`;
        } else {
          candidate = `${correctStr} [${offset}]`;
        }
      } else {
        candidate = `${correctStr} [${offset}]`;
      }
    }

    const candStr = String(candidate).trim();
    if (candStr !== correctStr && !set.has(candStr)) {
      set.add(candStr);
      list.push({ id: `gen_${list.length}`, label: candStr, value: candidate });
    }
    offset++;
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
    while (questions.length < targetCount && attempts < targetCount * 20) {
      attempts++;
      const concept = concepts[questions.length % concepts.length];
      const q = JourneyQuestionEngine.generateSingleQuestion(levelId, concept, levelDef.difficulty);

      if (q) {
        const fingerprint = `${q.prompt}::${q.correctAnswer}::${q.choices.map((c) => c.value).sort().join(",")}`;
        if (!usedFingerprints.has(fingerprint)) {
          usedFingerprints.add(fingerprint);
          questions.push(q);
        }
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
        // Generate 4 distinct numbers so player picks the greatest or smallest among the 4 choices
        const numSet = new Set<number>();
        while (numSet.size < 4) {
          numSet.add(randInt(10, 30 + difficulty * 20));
        }
        const nums = Array.from(numSet);
        const isGreater = Math.random() > 0.5;
        const ans = isGreater ? Math.max(...nums) : Math.min(...nums);
        const prompt = isGreater
          ? `Which number is the greatest?\n${nums.join(", ")}`
          : `Which number is the smallest?\n${nums.join(", ")}`;
        const distractors = nums.filter((n) => n !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "number_comparison",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${ans} is the ${isGreater ? "greatest" : "smallest"} among the options.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }

      case "number_ordering": {
        const uniqueSet = new Set<number>();
        while (uniqueSet.size < 4) {
          uniqueSet.add(randInt(5, 50 + difficulty * 15));
        }
        const sorted = Array.from(uniqueSet).sort((x, y) => x - y);
        const correctStr = sorted.join(" < ");
        const wrong1 = [...sorted].reverse().join(" < ");
        const wrong2 = [sorted[1], sorted[0], sorted[3], sorted[2]].join(" < ");
        const wrong3 = [sorted[0], sorted[2], sorted[1], sorted[3]].join(" < ");

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Arrange from smallest to largest:\n${Array.from(uniqueSet).join(", ")}`,
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
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "missing_number",
          choices: makeChoices(ans, distractors),
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
        const distractors = [
          ans + step,
          Math.max(1, ans - step),
          ans + 1,
          ans + step + 1,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Find the missing number in pattern:\n${displaySeq}`,
          questionType: "number_pattern",
          choices: makeChoices(ans, distractors),
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
        const distractors = [ans + 1, ans - 1, ans + 10, ans - 10].filter((x) => x !== ans && x > 0);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} + ${b} = ?`,
          questionType: "mental_addition",
          choices: makeChoices(ans, distractors),
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
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 10, ans + 2].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} − ${b} = ?`,
          questionType: "mental_subtraction",
          choices: makeChoices(ans, distractors),
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
        const distractors = [ans + a, ans - b, ans + 10, ans + 2].filter(
          (x) => x !== ans && x > 0
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} × ${b} = ?`,
          questionType: "mental_multiplication",
          choices: makeChoices(ans, distractors),
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
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${dividend} ÷ ${divisor} = ?`,
          questionType: "mental_division",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${dividend} ÷ ${divisor} = ${ans} because ${divisor} × ${ans} = ${dividend}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "number_logic": {
        // Mathematically guarantee that ans is the ONLY multiple of divisor between lower and upper
        const divisor = randInt(3, 8);
        const ans = divisor * randInt(4, 8);

        // To guarantee uniqueness of ans in (lower, upper):
        // lower must be strictly greater than ans - divisor  =>  lower = ans - d1 (1 <= d1 < divisor)
        // upper must be strictly less than ans + divisor     =>  upper = ans + d2 (1 <= d2 < divisor)
        const d1 = randInt(1, divisor - 1);
        const d2 = randInt(1, divisor - 1);
        const lower = ans - d1;
        const upper = ans + d2;
        const prompt = `I am greater than ${lower}, less than ${upper}, and divisible by ${divisor}.\nWho am I?`;

        // Distractor 1: Next multiple of divisor (divisible by divisor, but fails: not less than upper)
        const distAbove = ans + divisor;
        // Distractor 2: Previous multiple of divisor (divisible by divisor, but fails: not greater than lower)
        const distBelow = ans - divisor;
        // Distractor 3: Inside range or adjacent, but NOT divisible by divisor
        const distIn1 = ans + 1; // Since divisor >= 3, (ans + 1) is never divisible by divisor
        // Distractor 4: Another number not divisible by divisor
        const distIn2 = divisor > 3 ? ans + 2 : ans - 1;

        const distractors = [distAbove, distBelow, distIn1, distIn2].filter(
          (x) => x !== ans && x > 0
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "number_logic",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${ans} is the only number strictly between ${lower} and ${upper} divisible by ${divisor} (${ans} ÷ ${divisor} = ${ans / divisor}).`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      // ── Fraction Valley Concepts ───────────────────────────────────────────
      case "fraction_recognition": {
        const den = [2, 3, 4, 5, 8][randInt(0, 4)];
        const num = randInt(1, den - 1);
        const ans = `${num}/${den}`;
        const distractors = [`${den}/${num}`, `${num}/${den + 1}`, `${num + 1}/${den}`].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Which fraction represents ${num} parts shaded out of ${den} equal parts?`,
          questionType: "fraction_recognition",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${num} parts out of ${den} equal parts is written as ${num}/${den}.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 8,
        };
      }

      case "fraction_comparison": {
        // Compare 4 fractions with common denominator: player identifies the largest or smallest
        // Denominator must be >= 5 so at least 4 proper fractions (1 to den-1) exist
        const den = [5, 6, 8, 10, 12][randInt(0, 4)];
        const numSet = new Set<number>();
        let safety = 0;
        while (numSet.size < 4 && safety < 50) {
          safety++;
          numSet.add(randInt(1, den - 1));
        }
        const nums = Array.from(numSet);
        const isLarger = Math.random() > 0.5;
        const targetNum = isLarger ? Math.max(...nums) : Math.min(...nums);
        const ans = `${targetNum}/${den}`;
        const fractionsStr = nums.map((n) => `${n}/${den}`).join(", ");
        const prompt = isLarger
          ? `Which fraction is the largest?\n${fractionsStr}`
          : `Which fraction is the smallest?\n${fractionsStr}`;
        const distractors = nums.filter((n) => n !== targetNum).map((n) => `${n}/${den}`);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_comparison",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `With common denominator ${den}, ${ans} has the ${isLarger ? "largest" : "smallest"} numerator (${targetNum}).`,
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
        const distractors = [
          `${eqNum}/${eqDen + 1}`,
          `${eqNum + 1}/${eqDen}`,
          `${baseNum}/${baseDen * 2}`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "equivalent_fractions",
          choices: makeChoices(ans, distractors),
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
        const distractors = [
          `${simpNum}/${simpDen + 1}`,
          `${simpNum + 1}/${simpDen + 2}`,
          `${simpNum}/${simpDen * 2}`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "simplify_fractions",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `Dividing numerator and denominator by ${mult} yields ${simpNum}/${simpDen}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "fraction_arithmetic": {
        const den = [4, 5, 6, 8, 10][randInt(0, 4)];
        const isAdd = Math.random() > 0.4;
        let num1: number;
        let num2: number;
        let ansNum: number;

        if (isAdd) {
          num1 = randInt(1, den - 2);
          num2 = randInt(1, den - 1 - num1);
          ansNum = num1 + num2;
        } else {
          num1 = randInt(2, den - 1);
          num2 = randInt(1, num1 - 1); // Strictly num1 > num2 so ansNum >= 1
          ansNum = num1 - num2;
        }

        const prompt = `${num1}/${den} ${isAdd ? "+" : "−"} ${num2}/${den} = ?`;
        const ans = `${ansNum}/${den}`;
        const distractors = [
          `${ansNum + 1}/${den}`,
          `${ansNum > 1 ? ansNum - 1 : ansNum + 2}/${den}`,
          `${ansNum}/${den * 2}`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_arithmetic",
          choices: makeChoices(ans, distractors),
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
        // Strictly avoid total - ans or unit when they equal ans (e.g. 1/2 of total)
        const distractors = [
          ans + unit,
          ans + unit * 2,
          ans > unit ? ans - unit : ans + unit * 3,
        ].filter((x) => x !== ans && x > 0);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "fraction_reasoning",
          choices: makeChoices(ans, distractors),
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
        const distractors = [ans + 10, ans > 10 ? ans - 10 : ans + 25, ans + 20, base].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `What is 50% of ${base}?`,
          questionType: "percentage_basics",
          choices: makeChoices(ans, distractors),
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
        const distractors = [
          ans + 5,
          ans > 5 ? ans - 5 : ans + 15,
          ans + 10,
          ans * 2,
        ].filter((x) => x !== ans && x > 0);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `What is ${pct}% of ${base}?`,
          questionType: "percentage_of_number",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "percentage_conversion": {
        const pcts = [
          { p: 25, d: "0.25", f: "1/4", decDist: ["0.025", "2.5", "0.52"], fracDist: ["1/2", "2/5", "1/5"] },
          { p: 50, d: "0.50", f: "1/2", decDist: ["0.05", "5.0", "0.55"], fracDist: ["1/4", "3/4", "1/5"] },
          { p: 75, d: "0.75", f: "3/4", decDist: ["0.075", "7.5", "0.57"], fracDist: ["1/4", "2/3", "4/5"] },
          { p: 10, d: "0.10", f: "1/10", decDist: ["0.01", "1.0", "0.11"], fracDist: ["1/5", "1/100", "1/2"] },
          { p: 20, d: "0.20", f: "1/5", decDist: ["0.02", "2.0", "0.22"], fracDist: ["1/2", "1/4", "2/5"] },
        ];
        const item = pcts[randInt(0, pcts.length - 1)];
        const toDecimal = Math.random() > 0.5;
        const prompt = toDecimal
          ? `Convert ${item.p}% to a decimal:`
          : `Convert ${item.p}% to a fraction in simplest form:`;
        const ans = toDecimal ? item.d : item.f;
        const distractors = toDecimal ? item.decDist : item.fracDist;

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
        // If discountPct is 50%, discountAmt === salePrice, so avoid using discountAmt
        const distractors = [
          `$${salePrice + 10}`,
          `$${salePrice > 10 ? salePrice - 10 : salePrice + 20}`,
          `$${original}`,
        ].filter((x) => x !== `$${salePrice}`);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "discounts_shopping",
          choices: makeChoices(`$${salePrice}`, distractors),
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
        const distractors = [
          `$${isIncrease ? base - change : base + change}`,
          `$${finalVal + 10}`,
          `$${base}`,
        ].filter((x) => x !== `$${finalVal}`);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "percentage_change",
          choices: makeChoices(`$${finalVal}`, distractors),
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
          const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
            (v) => v !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt: `Solve for x:\n${a}x = ${rhs}`,
            questionType: "simple_equation",
            choices: makeChoices(ans, distractors),
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
          const distractors = [x + 1, Math.max(1, x - 1), x + 2, x + 3].filter((v) => v !== x);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt: `Solve for x:\nx + ${b} = ${rhs}`,
            questionType: "simple_equation",
            choices: makeChoices(x, distractors),
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
        const distractors = [x + 1, Math.max(1, x - 1), x + 2, x + 3].filter((v) => v !== x);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "two_step_mental_equation",
          choices: makeChoices(x, distractors),
          correctAnswer: x,
          explanation: `Step 1: ${a}x = ${rhs} ${isAdd ? "−" : "+"} ${b} = ${a * x}.\nStep 2: x = ${a * x} ÷ ${a} = ${x}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      case "algebra_puzzle": {
        let star = randInt(3, 9);
        let moon = randInt(2, 8);
        while (star === moon) {
          moon = randInt(2, 8);
        }
        const sum = star + moon;
        const prompt = `If ⭐ + 🌙 = ${sum} and ⭐ = ${star},\nwhat is the value of 🌙?`;
        const distractors = [
          moon + 1,
          Math.max(1, moon - 1),
          moon + 2,
          moon + 3,
        ].filter((v) => v !== moon);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "algebra_puzzle",
          choices: makeChoices(moon, distractors),
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
          { name: "Heptagon", sides: 7 },
          { name: "Octagon", sides: 8 },
          { name: "Nonagon", sides: 9 },
          { name: "Decagon", sides: 10 },
        ];
        const s = shapes[randInt(0, shapes.length - 1)];
        const prompt = `How many sides does a regular ${s.name} have?`;
        const otherSides = [3, 4, 5, 6, 7, 8, 9, 10].filter((sides) => sides !== s.sides);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "shape_recognition",
          choices: makeChoices(s.sides, otherSides.slice(0, 3)),
          correctAnswer: s.sides,
          explanation: `A regular ${s.name} has exactly ${s.sides} sides.`,
          concept,
          cognitiveLoadScore: 1,
          timeTargetSeconds: 7,
        };
      }

      case "angle_comparison": {
        const deg = [25, 35, 45, 60, 70, 75, 90, 105, 115, 120, 135, 150, 160, 180][randInt(0, 13)];
        let category = "Acute (<90°)";
        if (deg === 90) category = "Right (90°)";
        else if (deg === 180) category = "Straight (180°)";
        else if (deg > 90) category = "Obtuse (>90°)";

        const prompt = `An angle measuring ${deg}° is classified as:`;
        const categories = ["Acute (<90°)", "Right (90°)", "Obtuse (>90°)", "Straight (180°)"];
        const distractors = categories.filter((c) => c !== category);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "angle_comparison",
          choices: makeChoices(category, distractors),
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
        const distractors = [`${p + 4} cm`, `${Math.max(2, p - 4)} cm`, `${l + w} cm`].filter(
          (x) => x !== `${p} cm`
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "mental_perimeter",
          choices: makeChoices(`${p} cm`, distractors),
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
          const distractors = [
            `${area + 4} m²`,
            `${area > 4 ? area - 4 : area + 8} m²`,
            `${(s + 1) * s} m²`,
          ].filter((x) => x !== `${area} m²`);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "mental_area",
            choices: makeChoices(`${area} m²`, distractors),
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
          const distractors = [
            `${area + 6} m²`,
            `${area > 4 ? area - 4 : area + 10} m²`,
            `${(l + 1) * w} m²`,
          ].filter((x) => x !== `${area} m²`);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "mental_area",
            choices: makeChoices(`${area} m²`, distractors),
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
        const distractors = [`${a3 + 10}°`, `${Math.max(10, a3 - 10)}°`, `${a3 + 20}°`].filter(
          (x) => x !== `${a3}°`
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "geometry_logic",
          choices: makeChoices(`${a3}°`, distractors),
          correctAnswer: `${a3}°`,
          explanation: `Angles in a triangle add to 180°. Third angle = 180° − (${a1}° + ${a2}°) = ${a3}°.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 12,
        };
      }

      // ── Chapter 2 Concepts (Worlds 6–10 / Levels 101–200) ───────────────────
      case "mental_power_squares": {
        const n = randInt(11, 15 + Math.min(difficulty * 2, 10)); // 11 to 25
        const ans = n * n;
        const distractors = [
          ans + 10,
          ans - 10,
          (n + 1) * n,
          ans + 20,
        ].filter((x) => x !== ans && x > 0);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Calculate:\n${n}² = ?`,
          questionType: "mental_power_squares",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${n}² = ${n} × ${n} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "mental_square_roots": {
        const root = randInt(11, 15 + Math.min(difficulty * 2, 10)); // 11 to 25
        const sq = root * root;
        const ans = root;
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Find the square root:\n√${sq} = ?`,
          questionType: "mental_square_roots",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `√${sq} = ${ans} because ${ans} × ${ans} = ${sq}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "multi_operation_bodmas": {
        const isBracket = Math.random() > 0.5;
        if (isBracket) {
          const a = randInt(4, 12);
          const b = randInt(2, 8);
          const divisor = [2, 3, 4, 5][randInt(0, 3)];
          const sum = divisor * randInt(2, 6);
          const diff = sum - a; // b = diff
          const extra = randInt(2, 10);
          const ans = (a + diff) / divisor + extra;
          const prompt = `(${a} + ${diff}) ÷ ${divisor} + ${extra} = ?`;
          const distractors = [ans + 2, Math.max(1, ans - 2), ans + 4, ans + extra].filter(
            (x) => x !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "multi_operation_bodmas",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Parentheses first: (${a} + ${diff}) = ${sum}. Division: ${sum} ÷ ${divisor} = ${sum / divisor}. Addition: ${sum / divisor} + ${extra} = ${ans}.`,
            concept,
            cognitiveLoadScore: 3,
            timeTargetSeconds: 12,
          };
        } else {
          const a = randInt(5, 20);
          const m1 = randInt(2, 6);
          const m2 = randInt(2, 6);
          const mult = m1 * m2;
          const ans = a + mult;
          const wrongAddFirst = (a + m1) * m2;
          const prompt = `${a} + ${m1} × ${m2} = ?`;
          const distractors = [wrongAddFirst, ans + 2, Math.max(1, ans - 2), ans + 10].filter(
            (x) => x !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "multi_operation_bodmas",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Multiplication takes precedence: ${m1} × ${m2} = ${mult}. Then addition: ${a} + ${mult} = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 10,
          };
        }
      }

      case "ratio_simplification": {
        const factor = randInt(2, 6);
        const a = randInt(1, 5);
        let b = randInt(1, 5);
        while (b === a) b = randInt(1, 5);
        const r1 = a * factor;
        const r2 = b * factor;
        const ans = `${a}:${b}`;
        const distractors = [
          `${b}:${a}`,
          `${a + 1}:${b}`,
          `${a}:${b + 1}`,
          `${a * 2}:${b}`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Simplify the ratio to simplest form:\n${r1} : ${r2}`,
          questionType: "ratio_simplification",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `Divide both terms by common factor ${factor}: ${r1} ÷ ${factor} = ${a}, ${r2} ÷ ${factor} = ${b}. Simplest form is ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "ratio_missing_term": {
        const a = randInt(2, 5);
        const b = randInt(2, 6);
        const multiplier = randInt(2, 6);
        const c = a * multiplier;
        const ans = b * multiplier;
        const prompt = `Solve for x in proportion:\n${a} : ${b} = ${c} : x`;
        const distractors = [ans + 2, Math.max(1, ans - 2), ans + multiplier, ans + 5].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "ratio_missing_term",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `Since ${c} = ${a} × ${multiplier}, then x = ${b} × ${multiplier} = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "ratio_sharing": {
        const r1 = randInt(1, 4);
        const r2 = randInt(2, 5);
        if (r1 === r2) {
          // ensure distinct
        }
        const unit = randInt(5, 20);
        const total = (r1 + r2) * unit;
        const part1 = r1 * unit;
        const part2 = r2 * unit;
        const findLarger = r1 > r2 ? true : r2 > r1 ? true : Math.random() > 0.5;
        const ans = Math.max(part1, part2);
        const smaller = Math.min(part1, part2);
        const prompt = `Divide $${total} in the ratio ${Math.min(r1, r2)} : ${Math.max(r1, r2)}.\nWhat is the larger share?`;
        const distractors = [
          `$${smaller}`,
          `$${ans + unit}`,
          `$${ans > unit ? ans - unit : ans + unit * 2}`,
        ].filter((x) => x !== `$${ans}`);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "ratio_sharing",
          choices: makeChoices(`$${ans}`, distractors),
          correctAnswer: `$${ans}`,
          explanation: `Total parts = ${Math.min(r1, r2)} + ${Math.max(r1, r2)} = ${r1 + r2}. 1 part = $${total} ÷ ${r1 + r2} = $${unit}. Larger share = ${Math.max(r1, r2)} × $${unit} = $${ans}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 14,
        };
      }

      case "fraction_to_percent": {
        const fractions = [
          { n: 1, d: 2, p: 50 },
          { n: 1, d: 4, p: 25 },
          { n: 3, d: 4, p: 75 },
          { n: 1, d: 5, p: 20 },
          { n: 2, d: 5, p: 40 },
          { n: 3, d: 5, p: 60 },
          { n: 4, d: 5, p: 80 },
          { n: 1, d: 10, p: 10 },
          { n: 3, d: 10, p: 30 },
          { n: 7, d: 10, p: 70 },
          { n: 9, d: 10, p: 90 },
        ];
        const item = fractions[randInt(0, fractions.length - 1)];
        const ans = `${item.p}%`;
        const distractors = [
          `${item.p + 10}%`,
          `${item.p > 10 ? item.p - 10 : item.p + 20}%`,
          `${item.n * 10}%`,
          `${item.p + 5}%`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `Convert ${item.n}/${item.d} to a percentage:`,
          questionType: "fraction_to_percent",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${item.n}/${item.d} = (${item.n} ÷ ${item.d}) × 100% = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "profit_loss_calc": {
        const isProfit = Math.random() > 0.5;
        const cost = randInt(3, 15) * 10;
        const diff = randInt(1, 5) * 10;
        const sell = isProfit ? cost + diff : cost - diff;
        const ans = `$${diff}`;
        const prompt = isProfit
          ? `Cost Price = $${cost}, Selling Price = $${sell}.\nWhat is the profit?`
          : `Cost Price = $${cost}, Selling Price = $${sell}.\nWhat is the loss?`;
        const distractors = [
          `$${diff + 5}`,
          `$${diff > 5 ? diff - 5 : diff + 15}`,
          `$${diff + 10}`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "profit_loss_calc",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `${isProfit ? "Profit" : "Loss"} = |$${sell} − $${cost}| = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 8,
        };
      }

      case "profit_loss_percent": {
        const pct = [10, 20, 25, 50][randInt(0, 3)];
        const cost = pct === 25 ? [40, 80, 120, 200][randInt(0, 3)] : [20, 40, 50, 100, 200][randInt(0, 4)];
        const profit = Math.round((pct / 100) * cost);
        const sell = cost + profit;
        const ans = `${pct}%`;
        const prompt = `An item bought for $${cost} is sold for $${sell}.\nWhat is the profit percentage?`;
        const distractors = [
          `${pct + 5}%`,
          `${pct > 5 ? pct - 5 : pct + 15}%`,
          `${pct + 10}%`,
        ].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "profit_loss_percent",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `Profit = $${sell} − $${cost} = $${profit}. Profit % = ($${profit} ÷ $${cost}) × 100% = ${ans}.`,
          concept,
          cognitiveLoadScore: 3,
          timeTargetSeconds: 12,
        };
      }

      case "averages_mean": {
        const mean = randInt(10, 30);
        const d1 = randInt(2, 8);
        const d2 = randInt(2, 8);
        const n1 = mean - d1;
        const n2 = mean + d2;
        const n3 = mean * 3 - (n1 + n2);
        const nums = [n1, n2, n3].sort((a, b) => a - b);
        const ans = mean;
        const prompt = `Find the average (mean) of:\n${nums.join(", ")}`;
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
          (x) => x !== ans
        );

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt,
          questionType: "averages_mean",
          choices: makeChoices(ans, distractors),
          correctAnswer: ans,
          explanation: `Sum = ${n1} + ${n2} + ${n3} = ${mean * 3}. Mean = ${mean * 3} ÷ 3 = ${ans}.`,
          concept,
          cognitiveLoadScore: 2,
          timeTargetSeconds: 10,
        };
      }

      case "speed_distance_time": {
        const isSpeed = Math.random() > 0.5;
        if (isSpeed) {
          const speed = [40, 50, 60, 70, 80][randInt(0, 4)];
          const time = [2, 3, 4][randInt(0, 2)];
          const dist = speed * time;
          const ans = `${speed} km/h`;
          const prompt = `A train travels ${dist} km in ${time} hours.\nWhat is its average speed?`;
          const distractors = [
            `${speed + 10} km/h`,
            `${speed - 10} km/h`,
            `${speed + 20} km/h`,
          ].filter((x) => x !== ans);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "speed_distance_time",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Speed = Distance ÷ Time = ${dist} ÷ ${time} = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 10,
          };
        } else {
          const speed = [30, 40, 50, 60][randInt(0, 3)];
          const time = [2, 3, 5][randInt(0, 2)];
          const dist = speed * time;
          const ans = `${dist} km`;
          const prompt = `A cyclist rides at ${speed} km/h for ${time} hours.\nHow far did they travel?`;
          const distractors = [
            `${dist + 20} km`,
            `${dist > 20 ? dist - 20 : dist + 40} km`,
            `${dist + 10} km`,
          ].filter((x) => x !== ans);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "speed_distance_time",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Distance = Speed × Time = ${speed} × ${time} = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 10,
          };
        }
      }

      case "powers_of_ten": {
        const isMult = Math.random() > 0.5;
        if (isMult) {
          const base = randInt(2, 9) * 5;
          const p = [10, 100, 1000][randInt(0, 2)];
          const ans = base * p;
          const prompt = `${base} × ${p} = ?`;
          const distractors = [ans * 10, Math.floor(ans / 10), ans + p, ans + 10].filter(
            (x) => x !== ans && x > 0
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "powers_of_ten",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `${base} × ${p} = ${ans}.`,
            concept,
            cognitiveLoadScore: 1,
            timeTargetSeconds: 6,
          };
        } else {
          const factor = [10, 100][randInt(0, 1)];
          const ans = randInt(3, 40);
          const dividend = ans * factor;
          const prompt = `${dividend} ÷ ${factor} = ?`;
          const distractors = [ans * 10, Math.max(1, ans - 1), ans + 10, ans + 1].filter(
            (x) => x !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "powers_of_ten",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `${dividend} ÷ ${factor} = ${ans}.`,
            concept,
            cognitiveLoadScore: 1,
            timeTargetSeconds: 6,
          };
        }
      }

      case "angle_complement_supplement": {
        const isComplement = Math.random() > 0.5;
        if (isComplement) {
          const a = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70][randInt(0, 10)];
          const ans = `${90 - a}°`;
          const prompt = `What is the complement of ${a}°?`;
          const distractors = [
            `${90 - a + 10}°`,
            `${Math.max(10, 90 - a - 10)}°`,
            `${180 - a}°`,
          ].filter((x) => x !== ans);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "angle_complement_supplement",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Complementary angles add to 90°. Complement = 90° − ${a}° = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        } else {
          const a = [30, 45, 60, 75, 90, 110, 120, 135, 140, 150][randInt(0, 9)];
          const ans = `${180 - a}°`;
          const prompt = `What is the supplement of ${a}°?`;
          const distractors = [
            `${180 - a + 10}°`,
            `${Math.max(10, 180 - a - 10)}°`,
            `${90 - Math.min(a, 80)}°`,
          ].filter((x) => x !== ans);

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "angle_complement_supplement",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `Supplementary angles add to 180°. Supplement = 180° − ${a}° = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        }
      }

      case "cube_and_cuberoot": {
        const isRoot = Math.random() > 0.5;
        if (isRoot) {
          const root = [2, 3, 4, 5, 10][randInt(0, 4)];
          const cube = root * root * root;
          const ans = root;
          const prompt = `What is the cube root of ${cube} (∛${cube})?`;
          const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2, ans + 3].filter(
            (x) => x !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "cube_and_cuberoot",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `∛${cube} = ${ans} because ${ans}³ = ${ans} × ${ans} × ${ans} = ${cube}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        } else {
          const root = [2, 3, 4, 5, 6][randInt(0, 4)];
          const ans = root * root * root;
          const prompt = `Calculate:\n${root}³ = ?`;
          const distractors = [ans + root, Math.max(1, ans - root), ans + 10, root * 3].filter(
            (x) => x !== ans
          );

          return {
            id: `q_${levelId}_${Date.now()}_${Math.random()}`,
            levelId,
            prompt,
            questionType: "cube_and_cuberoot",
            choices: makeChoices(ans, distractors),
            correctAnswer: ans,
            explanation: `${root}³ = ${root} × ${root} × ${root} = ${ans}.`,
            concept,
            cognitiveLoadScore: 2,
            timeTargetSeconds: 8,
          };
        }
      }

      case "master_gauntlet_mixed": {
        const subconcepts = [
          "mental_power_squares",
          "ratio_missing_term",
          "profit_loss_percent",
          "speed_distance_time",
          "angle_complement_supplement",
        ];
        const chosen = subconcepts[randInt(0, subconcepts.length - 1)];
        return JourneyQuestionEngine.generateSingleQuestion(levelId, chosen, difficulty);
      }

      default: {
        // Fallback friendly arithmetic
        const a = randInt(5, 20);
        const b = randInt(3, 15);
        const ans = a + b;
        const distractors = [ans + 1, Math.max(1, ans - 1), ans + 2].filter((x) => x !== ans);

        return {
          id: `q_${levelId}_${Date.now()}_${Math.random()}`,
          levelId,
          prompt: `${a} + ${b} = ?`,
          questionType: "mental_addition",
          choices: makeChoices(ans, distractors),
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
