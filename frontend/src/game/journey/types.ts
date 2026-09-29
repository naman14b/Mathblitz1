/**
 * FunGanit Kingdom Journey Data Types & Interfaces
 */

import { AvatarId } from "@/src/game/types";

export type WorldId =
  | "number_forest"
  | "fraction_valley"
  | "percentage_city"
  | "algebra_mountain"
  | "geometry_castle"
  | string; // Support infinite procedural worlds (world_6, world_7, etc.)

export type LevelType =
  | "normal"
  | "speed"
  | "accuracy"
  | "mixed"
  | "puzzle"
  | "gauntlet"
  | "boss"
  | "speed_gate"
  | "daily_node";

export type StarRating = 0 | 1 | 2 | 3;

export interface StarThresholds {
  oneStarMinScore?: number; // Defaults to completing the level
  twoStarMinAccuracy: number; // e.g. 0.80 (80%)
  threeStarMinAccuracy: number; // e.g. 1.0 (100%)
  threeStarMaxTimeSeconds?: number; // e.g. 45 seconds
}

export interface BossDef {
  name: string;
  avatar: string; // Emoji or asset identifier
  title: string;
  quote: string;
  introDialogue: string;
  victoryDialogue: string;
  defeatDialogue: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  phases?: number;
}

export interface JourneyLevelDef {
  id: number; // 1 to 100+
  worldId: WorldId;
  levelNumber: number; // 1 to 20 within world
  title: string;
  levelType: LevelType;
  concepts: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
  timeLimitSeconds: number;
  starThresholds: StarThresholds;
  rewardXp: number;
  rewardTokens: number;
  description?: string;
  isMilestone?: boolean;
  boss?: BossDef;
  speedGateId?: string; // Links to 60s Blitz if levelType is speed_gate
}

export interface WorldDef {
  id: WorldId;
  worldNumber: number;
  name: string;
  subtitle: string;
  theme: string;
  levelsRange: [number, number]; // e.g. [1, 20]
  bossLevel: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    backgroundTop: string;
    backgroundBottom: string;
    pathColor: string;
    pathBorder: string;
    nodeUnlocked: string;
    nodeLocked: string;
    nodeBoss: string;
    ambientParticle: string;
  };
  ambientType: "fireflies" | "waterfall_crystals" | "neon_glow" | "cloud_drift" | "floating_polygons";
  boss: BossDef;
  unlockRequirements: {
    previousWorldBossCompleted?: boolean;
  };
}

export interface JourneyQuestionChoice {
  id: string;
  label: string;
  value: string | number;
}

export interface JourneyQuestion {
  id: string;
  levelId: number;
  prompt: string;
  formattedMath?: string;
  questionType: string;
  choices: JourneyQuestionChoice[];
  correctAnswer: string | number;
  explanation: string;
  concept: string;
  cognitiveLoadScore: number; // 1 to 5 (must be mental-friendly)
  timeTargetSeconds: number;
  subtopic?: string;
  diagramType?: "shape" | "angle" | "fraction_bar" | "number_line" | "grid";
  diagramData?: any;
}

export interface LevelResultData {
  levelId: number;
  worldId: WorldId;
  completed: boolean;
  score: number;
  stars: StarRating;
  correctAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  accuracy: number;
  xpEarned: number;
  tokensEarned: number;
  isReplay: boolean;
  isNewBestScore: boolean;
  isNewBestTime: boolean;
  isFirstCompletion: boolean;
  unlockedNextLevel: boolean;
  unlockedNextWorld: boolean;
}

export interface DailyJourneyState {
  date: string; // YYYY-MM-DD
  completedLevelIds: number[];
  targetLevelsCount: number; // Default 3
  isClaimed: boolean;
  rewardXp: number;
  rewardTokens: number;
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: string | null;
}

export interface WeeklyJourneyState {
  weekStartDate: string; // YYYY-MM-DD of Monday
  completedLevelsCount: number;
  targetLevelsCount: number; // Default 20
  isClaimed: boolean;
  rewardXp: number;
  rewardTokens: number;
}

export interface PlayerJourneyState {
  currentLevel: number; // Current active level
  highestUnlockedLevel: number; // Highest unlocked level
  completedLevels: Record<number, boolean>;
  starsByLevel: Record<number, StarRating>;
  bestScoresByLevel: Record<number, number>;
  bestTimesByLevel: Record<number, number>;
  attemptCountsByLevel: Record<number, number>;
  totalStars: number;
  unlockedWorlds: Record<WorldId, boolean>;
  dailyJourney: DailyJourneyState;
  weeklyJourney: WeeklyJourneyState;
  lastPlayedLevelId?: number;
}
