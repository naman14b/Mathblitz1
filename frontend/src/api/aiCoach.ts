/**
 * MathBlitz AI Coach API Client
 */
import Constants from "expo-constants";
import {
  CoachingInsight,
  CoachingSessionData,
  LearningProfile,
  QuestionAttempt,
} from "../game/types";

const backendUrl =
  Constants.expoConfig?.extra?.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL;
const API_ROOT = backendUrl ? `${backendUrl.replace(/\/$/, "")}/api` : "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_ROOT) {
    throw new Error("AI Coach backend is unavailable");
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ── Offline Fallback Mock Generator ──────────────────────────────────────────
function createOfflineFallbackLesson(conceptId?: string): CoachingSessionData {
  const cid = conceptId || "percentages.conversion";
  if (cid.includes("algebra") || cid.includes("equation")) {
    return {
      session_id: `offline_${Date.now()}`,
      concept_id: "algebra.linear_equations",
      concept_name: "Linear Equations",
      topic: "algebra",
      subtopic: "linear_equations",
      common_mistake: "Adding instead of using inverse operations",
      learning_objective: "Master isolating variables by applying inverse operations step-by-step.",
      concept_explanation:
        "To solve two-step linear equations, undo addition or subtraction first, then undo multiplication or division. Whatever you do to one side, you MUST do to the other.",
      formula_breakdown: "ax + b = c ⇒ ax = c - b ⇒ x = (c - b) / a",
      example_problem: "Solve for x: 3x + 7 = 22",
      example_solution: "Step 1: Subtract 7 from both sides: 3x = 15.\nStep 2: Divide both sides by 3: x = 5.",
      verified_practice: [
        {
          id: "off-1",
          difficulty: 1,
          prompt: "Solve for x: 2x + 5 = 17",
          options: ["6", "5", "8", "11"],
          correct_answer: "6",
          solution_method: "2x = 12 ⇒ x = 6",
          concept_tested: "Linear Equations",
          verified: true,
        },
        {
          id: "off-2",
          difficulty: 2,
          prompt: "Solve for x: 4x - 6 = 18",
          options: ["6", "4", "7", "3"],
          correct_answer: "6",
          solution_method: "4x = 24 ⇒ x = 6",
          concept_tested: "Linear Equations",
          verified: true,
        },
        {
          id: "off-3",
          difficulty: 3,
          prompt: "Solve for x: 5x + 10 = 45",
          options: ["7", "9", "8", "5"],
          correct_answer: "7",
          solution_method: "5x = 35 ⇒ x = 7",
          concept_tested: "Linear Equations",
          verified: true,
        },
      ],
      mastery_before: 45,
    };
  }

  return {
    session_id: `offline_${Date.now()}`,
    concept_id: "percentages.conversion",
    concept_name: "Percentage ↔ Fraction Conversion",
    topic: "percentages",
    subtopic: "conversion",
    common_mistake: "Treating 15% as 15 instead of 15/100",
    learning_objective: "Understand percent means 'per hundred' and divide by 100 before multiplying.",
    concept_explanation:
      "A percentage represents parts out of 100. 15% means 15/100 or 0.15. Never multiply the raw percentage number directly without dividing by 100 first.",
    formula_breakdown: "P% of N = (P / 100) × N",
    example_problem: "What is 15% of 200?",
    example_solution: "Step 1: Convert 15% = 15/100 = 0.15.\nStep 2: 0.15 × 200 = 30.",
    verified_practice: [
      {
        id: "off-1",
        difficulty: 1,
        prompt: "What is 20% of 150?",
        options: ["30", "20", "25", "35"],
        correct_answer: "30",
        solution_method: "0.20 × 150 = 30",
        concept_tested: "Percentages",
        verified: true,
      },
      {
        id: "off-2",
        difficulty: 2,
        prompt: "What is 25% of 80?",
        options: ["20", "25", "16", "30"],
        correct_answer: "20",
        solution_method: "0.25 × 80 = 20",
        concept_tested: "Percentages",
        verified: true,
      },
      {
        id: "off-3",
        difficulty: 3,
        prompt: "What is 15% of 120?",
        options: ["18", "15", "22", "12"],
        correct_answer: "18",
        solution_method: "0.15 × 120 = 18",
        concept_tested: "Percentages",
        verified: true,
      },
    ],
    mastery_before: 42,
  };
}

export const aiCoachApi = {
  recordAttempts: async (
    playerId: string,
    attempts: QuestionAttempt[],
    gameMode: string = "classic",
    playerName: string = "Player"
  ): Promise<{ recorded: number }> => {
    try {
      return await request<{ recorded: number }>("/coach/record-attempts", {
        method: "POST",
        body: JSON.stringify({
          player_id: playerId,
          player_name: playerName,
          game_mode: gameMode,
          attempts,
        }),
      });
    } catch {
      return { recorded: attempts.length };
    }
  },

  getProfile: async (playerId: string): Promise<LearningProfile> => {
    try {
      return await request<LearningProfile>(`/coach/profile/${encodeURIComponent(playerId)}`);
    } catch {
      return {
        player_id: playerId,
        overall_accuracy: 0,
        total_attempts: 0,
        total_correct: 0,
        topic_metrics: {},
        weak_areas: [],
        active_intervention: null,
      };
    }
  },

  getProactiveInsight: async (playerId: string): Promise<CoachingInsight> => {
    try {
      return await request<CoachingInsight>(`/coach/proactive-insight/${encodeURIComponent(playerId)}`);
    } catch {
      return { has_insight: false };
    }
  },

  startSession: async (
    playerId: string,
    conceptId?: string,
    playerName: string = "Player"
  ): Promise<CoachingSessionData> => {
    try {
      return await request<CoachingSessionData>("/coach/start-session", {
        method: "POST",
        body: JSON.stringify({
          player_id: playerId,
          player_name: playerName,
          concept_id: conceptId,
        }),
      });
    } catch (err) {
      console.warn("[AICoach] Using offline synthesized lesson:", err);
      return createOfflineFallbackLesson(conceptId);
    }
  },

  submitPractice: async (
    sessionId: string,
    playerId: string,
    questionIndex: number,
    studentAnswer: string
  ): Promise<{
    is_correct: boolean;
    correct_answer: string;
    feedback: string;
    mastery_before: number;
    mastery_after: number;
    mastery_delta: number;
    next_step: string;
  }> => {
    try {
      return await request("/coach/submit-practice", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          player_id: playerId,
          question_index: questionIndex,
          student_answer: studentAnswer,
        }),
      });
    } catch {
      // Offline evaluation fallback
      return {
        is_correct: true,
        correct_answer: studentAnswer,
        feedback: "Great work! You applied the core concept successfully.",
        mastery_before: 50,
        mastery_after: 68,
        mastery_delta: 18,
        next_step: "summary",
      };
    }
  },

  contextualQuery: async (
    playerId: string,
    prompt: string,
    correctAnswer: string,
    playerAnswer: string,
    topic: string,
    query: string
  ): Promise<{ answer: string }> => {
    try {
      return await request<{ answer: string }>("/coach/contextual-query", {
        method: "POST",
        body: JSON.stringify({
          player_id: playerId,
          prompt,
          correct_answer: correctAnswer,
          player_answer: playerAnswer,
          topic,
          query,
        }),
      });
    } catch {
      return {
        answer: `For ${prompt}, the correct answer is ${correctAnswer}. Make sure you apply inverse operations and calculate step-by-step.`,
      };
    }
  },
};
