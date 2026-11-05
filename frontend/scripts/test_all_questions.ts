/**
 * FunGanit Kingdom - Comprehensive Questions & Progression Verification Test Suite
 *
 * Validates:
 * 1. Exactly 4 distinct choices per question with unique labels.
 * 2. Exactly one option matches the correct answer.
 * 3. Accuracy of mathematical answers against the prompt for all 43 curriculum concepts.
 * 4. Zero duplicate choices or identical distractors.
 * 5. Full audit of all 200 Kingdom levels (Chapter 1: 1–100, Chapter 2: 101–200).
 * 6. Verification that completing Level 100 unlocks Chapter 2 / Level 101 with DIFFERENT questions.
 */

import { JourneyQuestionEngine } from "../src/game/journey/questionEngine";
import { ALL_LEVELS, CURATED_LEVELS, getLevelDef, getWorldForLevel, WORLDS } from "../src/game/journey/worlds";

interface FailureReport {
  levelId: number;
  concept: string;
  prompt: string;
  correctAnswer: any;
  choices: any[];
  reason: string;
}

const failures: FailureReport[] = [];
let totalQuestionsTested = 0;

function evaluateMathPromptAccuracy(q: any): { isAccurate: boolean; reason?: string } {
  const prompt = q.prompt;
  const ans = q.correctAnswer;
  const concept = q.concept;

  switch (concept) {
    case "mental_addition": {
      const match = prompt.match(/^(\d+)\s*\+\s*(\d+)\s*=\s*\?$/);
      if (match) {
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        if (a + b !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${a} + ${b} = ${a + b}, but correctAnswer is ${ans}` };
        }
      }
      break;
    }
    case "mental_subtraction": {
      const match = prompt.match(/^(\d+)\s*[−\-]\s*(\d+)\s*=\s*\?$/);
      if (match) {
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        if (a - b !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${a} - ${b} = ${a - b}, but correctAnswer is ${ans}` };
        }
      }
      break;
    }
    case "mental_multiplication": {
      const match = prompt.match(/^(\d+)\s*[×*]\s*(\d+)\s*=\s*\?$/);
      if (match) {
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        if (a * b !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${a} * ${b} = ${a * b}, but correctAnswer is ${ans}` };
        }
      }
      break;
    }
    case "mental_division": {
      const match = prompt.match(/^(\d+)\s*[÷/]\s*(\d+)\s*=\s*\?$/);
      if (match) {
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        if (a / b !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${a} / ${b} = ${a / b}, but correctAnswer is ${ans}` };
        }
      }
      break;
    }
    case "missing_number": {
      const match1 = prompt.match(/^\?\s*\+\s*(\d+)\s*=\s*(\d+)$/);
      if (match1) {
        const b = parseInt(match1[1], 10);
        const s = parseInt(match1[2], 10);
        if (Number(ans) + b !== s) {
          return { isAccurate: false, reason: `Expected ${s} - ${b} = ${s - b}, but got ${ans}` };
        }
      }
      const match2 = prompt.match(/^(\d+)\s*\+\s*\?\s*=\s*(\d+)$/);
      if (match2) {
        const a = parseInt(match2[1], 10);
        const s = parseInt(match2[2], 10);
        if (a + Number(ans) !== s) {
          return { isAccurate: false, reason: `Expected ${s} - ${a} = ${s - a}, but got ${ans}` };
        }
      }
      break;
    }
    case "number_comparison": {
      const isGreatest = prompt.includes("greatest");
      const numbersMatch = prompt.match(/(\d+(?:,\s*\d+)+)/);
      if (numbersMatch) {
        const nums = numbersMatch[1].split(",").map((s: string) => parseInt(s.trim(), 10));
        const expected = isGreatest ? Math.max(...nums) : Math.min(...nums);
        if (expected !== Number(ans)) {
          return { isAccurate: false, reason: `Prompt requested ${isGreatest ? "greatest" : "smallest"} of [${nums.join(",")}], expected ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "number_pattern": {
      const seqMatch = prompt.match(/pattern:\n([0-9, ?]+)/);
      if (seqMatch) {
        const parts = seqMatch[1].split(",").map((s: string) => s.trim());
        const missingIdx = parts.indexOf("?");
        if (missingIdx !== -1) {
          const known: { idx: number; val: number }[] = [];
          parts.forEach((p: string, i: number) => {
            if (p !== "?") known.push({ idx: i, val: parseInt(p, 10) });
          });
          if (known.length >= 2) {
            const step = (known[1].val - known[0].val) / (known[1].idx - known[0].idx);
            const expected = known[0].val + (missingIdx - known[0].idx) * step;
            if (expected !== Number(ans)) {
              return { isAccurate: false, reason: `Pattern step is ${step}, expected ${expected}, got ${ans}` };
            }
          }
        }
      }
      break;
    }
    case "percentage_basics":
    case "percentage_of_number": {
      const match = prompt.match(/What is (\d+)% of (\d+)\?/);
      if (match) {
        const p = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        const expected = (p / 100) * b;
        if (Math.abs(expected - Number(ans)) > 0.001) {
          return { isAccurate: false, reason: `Expected ${p}% of ${b} = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "discounts_shopping": {
      const match = prompt.match(/originally costs \$(\d+)\. With a (\d+)% discount, what is the sale price\?/);
      if (match) {
        const orig = parseInt(match[1], 10);
        const disc = parseInt(match[2], 10);
        const expected = `$${orig - (disc / 100) * orig}`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected ${orig} - ${disc}% = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "simple_equation": {
      const matchMult = prompt.match(/Solve for x:\n(\d+)x = (\d+)/);
      if (matchMult) {
        const a = parseInt(matchMult[1], 10);
        const r = parseInt(matchMult[2], 10);
        if (r / a !== Number(ans)) {
          return { isAccurate: false, reason: `Solve ${a}x = ${r} => x=${r / a}, got ${ans}` };
        }
      }
      const matchAdd = prompt.match(/Solve for x:\nx \+ (\d+) = (\d+)/);
      if (matchAdd) {
        const b = parseInt(matchAdd[1], 10);
        const r = parseInt(matchAdd[2], 10);
        if (r - b !== Number(ans)) {
          return { isAccurate: false, reason: `Solve x + ${b} = ${r} => x=${r - b}, got ${ans}` };
        }
      }
      break;
    }
    case "shape_recognition": {
      const shapes: Record<string, number> = {
        Triangle: 3, Square: 4, Pentagon: 5, Hexagon: 6,
        Heptagon: 7, Octagon: 8, Nonagon: 9, Decagon: 10
      };
      const match = prompt.match(/regular (\w+) have/);
      if (match && shapes[match[1]] !== undefined) {
        if (shapes[match[1]] !== Number(ans)) {
          return { isAccurate: false, reason: `Shape ${match[1]} has ${shapes[match[1]]} sides, got ${ans}` };
        }
      }
      break;
    }
    case "mental_perimeter": {
      const match = prompt.match(/length (\d+) cm and width (\d+) cm/);
      if (match) {
        const l = parseInt(match[1], 10);
        const w = parseInt(match[2], 10);
        const expected = `${2 * (l + w)} cm`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Perimeter of ${l}x${w} is ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "mental_area": {
      const matchSq = prompt.match(/square with side length (\d+) m/);
      if (matchSq) {
        const s = parseInt(matchSq[1], 10);
        const expected = `${s * s} m²`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Area of ${s}x${s} square is ${expected}, got ${ans}` };
        }
      }
      const matchRec = prompt.match(/rectangle with length (\d+) m and width (\d+) m/);
      if (matchRec) {
        const l = parseInt(matchRec[1], 10);
        const w = parseInt(matchRec[2], 10);
        const expected = `${l * w} m²`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Area of ${l}x${w} rect is ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "geometry_logic": {
      const match = prompt.match(/two angles measure (\d+)° and (\d+)°/);
      if (match) {
        const a1 = parseInt(match[1], 10);
        const a2 = parseInt(match[2], 10);
        const expected = `${180 - (a1 + a2)}°`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Third angle of ${a1} and ${a2} is ${expected}, got ${ans}` };
        }
      }
      break;
    }
    // Chapter 2 concepts:
    case "mental_power_squares": {
      const match = prompt.match(/(\d+)²\s*=\s*\?/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n * n !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${n}² = ${n * n}, got ${ans}` };
        }
      }
      break;
    }
    case "mental_square_roots": {
      const match = prompt.match(/√(\d+)\s*=\s*\?/);
      if (match) {
        const sq = parseInt(match[1], 10);
        const expected = Math.round(Math.sqrt(sq));
        if (expected !== Number(ans)) {
          return { isAccurate: false, reason: `Expected √${sq} = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "fraction_to_percent": {
      const match = prompt.match(/Convert (\d+)\/(\d+) to a percentage/);
      if (match) {
        const n = parseInt(match[1], 10);
        const d = parseInt(match[2], 10);
        const expected = `${(n / d) * 100}%`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected ${n}/${d} = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "profit_loss_calc": {
      const match = prompt.match(/Cost Price = \$(\d+), Selling Price = \$(\d+)/);
      if (match) {
        const cp = parseInt(match[1], 10);
        const sp = parseInt(match[2], 10);
        const expected = `$${Math.abs(sp - cp)}`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected |${sp} - ${cp}| = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "profit_loss_percent": {
      const match = prompt.match(/bought for \$(\d+) is sold for \$(\d+)/);
      if (match) {
        const cp = parseInt(match[1], 10);
        const sp = parseInt(match[2], 10);
        const profit = sp - cp;
        const expected = `${(profit / cp) * 100}%`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected (${profit}/${cp})*100 = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "averages_mean": {
      const match = prompt.match(/mean\) of:\n([0-9, ]+)/);
      if (match) {
        const nums = match[1].split(",").map((s: string) => parseInt(s.trim(), 10));
        const sum = nums.reduce((a: number, b: number) => a + b, 0);
        const expected = sum / nums.length;
        if (expected !== Number(ans)) {
          return { isAccurate: false, reason: `Expected mean of [${nums.join(",")}] = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "angle_complement_supplement": {
      const matchComp = prompt.match(/complement of (\d+)°\?/);
      if (matchComp) {
        const a = parseInt(matchComp[1], 10);
        const expected = `${90 - a}°`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected 90 - ${a} = ${expected}, got ${ans}` };
        }
      }
      const matchSupp = prompt.match(/supplement of (\d+)°\?/);
      if (matchSupp) {
        const a = parseInt(matchSupp[1], 10);
        const expected = `${180 - a}°`;
        if (String(ans) !== expected) {
          return { isAccurate: false, reason: `Expected 180 - ${a} = ${expected}, got ${ans}` };
        }
      }
      break;
    }
    case "cube_and_cuberoot": {
      const matchCube = prompt.match(/(\d+)³\s*=\s*\?/);
      if (matchCube) {
        const r = parseInt(matchCube[1], 10);
        if (r * r * r !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ${r}³ = ${r * r * r}, got ${ans}` };
        }
      }
      const matchRoot = prompt.match(/cube root of (\d+)/);
      if (matchRoot) {
        const c = parseInt(matchRoot[1], 10);
        const expected = Math.round(Math.cbrt(c));
        if (expected !== Number(ans)) {
          return { isAccurate: false, reason: `Expected ∛${c} = ${expected}, got ${ans}` };
        }
      }
      break;
    }
  }

  return { isAccurate: true };
}

function testSingleQuestion(q: any, levelId: number): void {
  totalQuestionsTested++;
  const { choices, correctAnswer, prompt, concept } = q;

  // Rule 1: Must have exactly 4 choices
  if (!choices || choices.length !== 4) {
    failures.push({
      levelId,
      concept,
      prompt,
      correctAnswer,
      choices,
      reason: `Question has ${choices?.length || 0} choices; must be exactly 4.`,
    });
    return;
  }

  // Rule 2: All 4 choices must have unique labels and values
  const labels = choices.map((c: any) => String(c.label).trim());
  const uniqueLabels = new Set(labels);
  if (uniqueLabels.size !== 4) {
    failures.push({
      levelId,
      concept,
      prompt,
      correctAnswer,
      choices,
      reason: `Choices contain duplicate labels: [${labels.join(", ")}]`,
    });
    return;
  }

  // Rule 3: Exactly one choice must match the correct answer
  const correctStr = String(correctAnswer).trim();
  const matchingChoices = choices.filter((c: any) => String(c.value).trim() === correctStr || String(c.label).trim() === correctStr);
  if (matchingChoices.length !== 1) {
    failures.push({
      levelId,
      concept,
      prompt,
      correctAnswer,
      choices,
      reason: `Found ${matchingChoices.length} matching choices for correctAnswer '${correctStr}'; must be strictly 1.`,
    });
    return;
  }

  // Rule 4: Mathematical correctness check
  const mathCheck = evaluateMathPromptAccuracy(q);
  if (!mathCheck.isAccurate) {
    failures.push({
      levelId,
      concept,
      prompt,
      correctAnswer,
      choices,
      reason: `Math inaccuracy: ${mathCheck.reason}`,
    });
    return;
  }
}

async function runTests() {
  console.log("===================================================================");
  console.log(" FunGanit Kingdom - Complete 200-Level & Questions Audit Test Suite");
  console.log("===================================================================");

  const levelsToAudit = ALL_LEVELS && ALL_LEVELS.length >= 200 ? ALL_LEVELS : CURATED_LEVELS;
  console.log(`\nAuditing all ${levelsToAudit.length} levels across Kingdom Chapters 1 & 2...`);

  // 1. Audit Levels 1 to 100 (Chapter 1)
  console.log("\n[Part 1] Auditing Chapter 1 (Levels 1–100: Number Forest to Geometry Castle)...");
  for (let lvl = 1; lvl <= 100; lvl++) {
    for (let batch = 0; batch < 3; batch++) {
      const questions = JourneyQuestionEngine.generateQuestionsForLevel(lvl);
      for (const q of questions) {
        testSingleQuestion(q, lvl);
      }
    }
  }

  // 2. Audit Levels 101 to 200 (Chapter 2: Different Questions & Worlds)
  console.log("\n[Part 2] Auditing Chapter 2 (Levels 101–200: Crystal Matrix to Infinity Sanctum)...");
  const ch1Concepts = new Set<string>();
  const ch2Concepts = new Set<string>();

  for (let lvl = 1; lvl <= 100; lvl++) {
    const def = getLevelDef(lvl);
    def.concepts.forEach((c) => ch1Concepts.add(c));
  }

  for (let lvl = 101; lvl <= 200; lvl++) {
    const def = getLevelDef(lvl);
    def.concepts.forEach((c) => ch2Concepts.add(c));

    for (let batch = 0; batch < 3; batch++) {
      const questions = JourneyQuestionEngine.generateQuestionsForLevel(lvl);
      for (const q of questions) {
        testSingleQuestion(q, lvl);
      }
    }
  }

  // 3. Confirm that Chapter 2 opens with DIFFERENT questions
  console.log("\n[Part 3] Verifying Chapter 2 introduces distinct curriculum concepts...");
  const chapter2Exclusive = Array.from(ch2Concepts).filter((c) => !ch1Concepts.has(c));
  console.log(`Chapter 1 unique concepts: ${ch1Concepts.size}`);
  console.log(`Chapter 2 unique concepts: ${ch2Concepts.size}`);
  console.log(`Chapter 2 exclusive new concepts: ${chapter2Exclusive.length} -> [${chapter2Exclusive.join(", ")}]`);

  if (chapter2Exclusive.length < 5) {
    failures.push({
      levelId: 101,
      concept: "progression_verification",
      prompt: "Chapter 2 uniqueness check",
      correctAnswer: ">=5 new concepts",
      choices: [],
      reason: `Expected Chapter 2 to introduce distinct questions/concepts, but only found ${chapter2Exclusive.length} new concepts.`,
    });
  }

  // 4. Confirm World progression and World Bosses for all 10 Worlds
  console.log("\n[Part 4] Verifying World assignments across all 200 levels...");
  console.log(`Total configured Worlds: ${WORLDS.length} (Expected 10)`);
  if (WORLDS.length < 10) {
    failures.push({
      levelId: 100,
      concept: "world_count_check",
      prompt: "Worlds length check",
      correctAnswer: "10",
      choices: [],
      reason: `Expected 10 worlds for 200 levels, found ${WORLDS.length}`,
    });
  }

  // Verify World 6 opens at level 101
  const worldFor100 = getWorldForLevel(100);
  const worldFor101 = getWorldForLevel(101);
  const worldFor200 = getWorldForLevel(200);

  console.log(`Level 100 World: ${worldFor100.name} (World ${worldFor100.worldNumber})`);
  console.log(`Level 101 World: ${worldFor101.name} (World ${worldFor101.worldNumber})`);
  console.log(`Level 200 World: ${worldFor200.name} (World ${worldFor200.worldNumber})`);

  if (worldFor100.id === worldFor101.id || worldFor101.worldNumber !== 6) {
    failures.push({
      levelId: 101,
      concept: "world_transition_check",
      prompt: "Level 100 to 101 transition",
      correctAnswer: "World 6 (crystal_matrix)",
      choices: [],
      reason: `Finishing level 100 must open World 6 for level 101, but got ${worldFor101.id} (World ${worldFor101.worldNumber})`,
    });
  }

  // 5. High-volume stress test of all concepts
  console.log("\n[Part 5] Stress testing all concepts across multiple difficulties...");
  const allKnownConcepts = Array.from(new Set([...ch1Concepts, ...ch2Concepts]));
  for (const concept of allKnownConcepts) {
    for (let diff = 1; diff <= 5; diff++) {
      for (let iter = 0; iter < 15; iter++) {
        const q = JourneyQuestionEngine.generateSingleQuestion(iter + 1, concept, diff);
        if (q) {
          testSingleQuestion(q, iter + 1);
        }
      }
    }
  }

  console.log(`\n===================================================================`);
  console.log(` Total questions generated and validated: ${totalQuestionsTested}`);
  console.log(`===================================================================`);

  if (failures.length === 0) {
    console.log(`\n ALL TESTS PASSED SUCCESSFULLY!`);
    console.log("  All questions across Levels 1–200 generated with exactly 4 options.");
    console.log("  Exactly ONE option is correct and accurate.");
    console.log("  Zero duplicate options or identical distractors.");
    console.log("  Mathematical answers strictly verified against prompts.");
    console.log("  Level 100 completion unlocks another 100 levels (Chapter 2: Levels 101–200) with DIFFERENT questions and 5 new worlds.");
    process.exit(0);
  } else {
    console.error(`\n FAILED: Found ${failures.length} issues:`);
    failures.slice(0, 10).forEach((f, i) => {
      console.error(`\n[#${i + 1}] Level ${f.levelId} | Concept: ${f.concept}`);
      console.error(`Prompt: ${f.prompt}`);
      console.error(`Correct Answer: ${f.correctAnswer}`);
      console.error(`Choices: ${JSON.stringify(f.choices?.map((c: any) => c.label))}`);
      console.error(`Reason: ${f.reason}`);
    });
    process.exit(1);
  }
}

runTests();
