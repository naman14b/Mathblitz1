import { AgeGroupId, Question } from "./types";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const safeNumber = (value: number) => Number(value.toFixed(2));

function choices(answer: number, spread: number, decimals = false): string[] {
  const values = new Set<number>([answer]);
  while (values.size < 4) {
    const delta = rand(1, Math.max(2, spread)) * (Math.random() > 0.5 ? 1 : -1);
    values.add(safeNumber(answer + delta));
  }
  return shuffle([...values]).map((value) => decimals ? value.toFixed(2) : String(value));
}

function questionFor(age: AgeGroupId, level: number): Omit<Question, "id"> {
  const scale = Math.min(4, Math.max(0, level));
  if (age === "6-7") {
    const a = rand(2, 12 + scale * 3);
    const b = rand(1, Math.min(a, 10 + scale * 2));
    const add = Math.random() > 0.45;
    const answer = add ? a + b : a - b;
    return { prompt: `${a} ${add ? "+" : "−"} ${b} = ?`, answer, options: choices(answer, 4), topic: add ? "addition" : "subtraction", benchmarkSeconds: 2.1 };
  }
  if (age === "8-10") {
    const type = rand(0, 2);
    if (type === 2) {
      const divisor = rand(2, 10);
      const answer = rand(2, 10 + scale * 2);
      return { prompt: `${divisor * answer} ÷ ${divisor} = ?`, answer, options: choices(answer, 5), topic: "division", benchmarkSeconds: 2.2 };
    }
    const a = rand(4, 20 + scale * 5);
    const b = rand(2, 12 + scale * 3);
    const answer = type === 0 ? a + b : a * b;
    return { prompt: `${a} ${type === 0 ? "+" : "×"} ${b} = ?`, answer, options: choices(answer, type === 0 ? 6 : 10), topic: type === 0 ? "addition" : "multiplication", benchmarkSeconds: 1.8 };
  }
  if (age === "11-13") {
    const type = rand(0, 3);
    const a = rand(3, 18 + scale * 6);
    const b = rand(2, 12 + scale * 4);
    if (type === 0) return { prompt: `${a} × ${b} = ?`, answer: a * b, options: choices(a * b, 14), topic: "multiplication", benchmarkSeconds: 2.4 };
    if (type === 1) return { prompt: `${a * b} ÷ ${b} = ?`, answer: a, options: choices(a, 8), topic: "division", benchmarkSeconds: 2.3 };
    const answer = type === 2 ? a + b : a - b;
    return { prompt: `${a} ${type === 2 ? "+" : "−"} ${b} = ?`, answer, options: choices(answer, 10), topic: "mixed arithmetic", benchmarkSeconds: 2.1 };
  }
  if (age === "14-16") {
    const type = rand(0, 2);
    if (type === 0) {
      const base = rand(20, 90);
      const percent = [10, 15, 20, 25, 30, 50][rand(0, 5)];
      const answer = safeNumber((base * percent) / 100);
      return { prompt: `${percent}% of ${base} = ?`, answer, options: choices(answer, 8, !Number.isInteger(answer)), topic: "percentages", benchmarkSeconds: 3.1 };
    }
    const a = rand(5, 25 + scale * 5);
    const b = rand(2, 12);
    const answer = type === 1 ? a * b : a + b;
    return { prompt: `${a} ${type === 1 ? "×" : "+"} ${b} = ?`, answer, options: choices(answer, 12), topic: type === 1 ? "multiplication" : "ratios", benchmarkSeconds: 2.7 };
  }
  const x = rand(2, 12 + scale * 3);
  const coefficient = rand(2, 8);
  const constant = rand(2, 20);
  const answer = x;
  return { prompt: `If ${coefficient}x + ${constant} = ${coefficient * x + constant}, x = ?`, answer, options: choices(answer, 5), topic: "algebra", benchmarkSeconds: 3.4 };
}

export function createQuestion(age: AgeGroupId, level: number, recentIds: string[]): Question {
  let candidate = questionFor(age, level);
  let id = `${age}-${candidate.prompt}`;
  let attempts = 0;
  while (recentIds.includes(id) && attempts < 8) {
    candidate = questionFor(age, level);
    id = `${age}-${candidate.prompt}`;
    attempts += 1;
  }
  return { ...candidate, id };
}

export function scoreAnswer(combo: number, elapsedMs: number, benchmarkSeconds: number) {
  const base = 10;
  const multiplier = Math.min(3, 1 + Math.floor(combo / 3) * 0.5);
  const speedBonus = elapsedMs / 1000 <= benchmarkSeconds ? 5 : 0;
  return { points: Math.round(base * multiplier) + speedBonus, speedBonus };
}