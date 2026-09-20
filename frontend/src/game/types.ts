export type AgeGroupId = "6-7" | "8-10" | "11-13" | "14-16" | "17-20" | "21+";

export type AgeGroup = {
  id: AgeGroupId;
  label: string;
  topics: string;
  difficulty: string;
  pace: string;
  accent: "teal" | "orange" | "blue" | "pink" | "yellow" | "purple";
};

export type Question = {
  id: string;
  prompt: string;
  answer: number;
  options: string[];
  topic: string;
  benchmarkSeconds: number;
};

export type GameResult = {
  score: number;
  correct: number;
  answered: number;
  accuracy: number;
  bestCombo: number;
  xp: number;
  personalBest: number;
  tokens: number;
  tokensClaimed: boolean;
};

export type AppSettings = {
  sound: boolean;
  vibration: boolean;
};

// --- Sudoku Types -------------------------------------------------------------
export type SudokuDifficulty = "easy" | "medium" | "hard" | "expert" | "evil";

export type SudokuTierInfo = {
  id: SudokuDifficulty;
  name: string;
  subtitle: string;
  timerSeconds: number;
  baseUnlockCost: number;
  gameCount: number;
};

export type SudokuPuzzle = {
  id: string; // e.g. "easy-1", "medium-25"
  difficulty: SudokuDifficulty;
  gameNumber: number; // 1 to 50
  initialBoard: string; // 81 characters ('1'-'9' or '.'/ '0' for empty)
  solution: string; // 81 characters
  timerSeconds: number;
  unlockCost: number;
};

export type SudokuCell = {
  row: number;
  col: number;
  value: number; // 0 = empty
  isGiven: boolean;
  notes?: number[];
};

// --- Maths Puzzle Types -------------------------------------------------------
export type MathsPuzzleType = "multiple-choice" | "numeric";

export type MathsPuzzle = {
  id: number; // 1 to 100
  title: string;
  prompt: string;
  type: MathsPuzzleType;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficultyRating: number; // 1 to 100
  timerSeconds: number;
  unlockCost: number;
};

// --- Token & Reward Constants -------------------------------------------------
export const TOKEN_REWARDS = {
  SIXTY_SECOND_CORRECT: 2,
  SIXTY_SECOND_WRONG_DEDUCTION: 1,
  THREE_DAY_STREAK: 20,
  SEVEN_DAY_STREAK: 30,
  SUDOKU_WIN: 5,
  MATHS_PUZZLE_WIN: 5,
} as const;

export const SUDOKU_HINT_RULES = {
  FREE_HINTS: 1,
  AD_REWARD_HINTS: 99,
} as const;

export const SUDOKU_TIERS: SudokuTierInfo[] = [
  { id: "easy", name: "Easy", subtitle: "Friendly warmups", timerSeconds: 600, baseUnlockCost: 10, gameCount: 50 },
  { id: "medium", name: "Medium", subtitle: "Balanced logic", timerSeconds: 720, baseUnlockCost: 25, gameCount: 50 },
  { id: "hard", name: "Hard", subtitle: "Advanced deduction", timerSeconds: 900, baseUnlockCost: 50, gameCount: 50 },
  { id: "expert", name: "Expert / Extreme", subtitle: "Masterful techniques", timerSeconds: 1080, baseUnlockCost: 80, gameCount: 50 },
  { id: "evil", name: "Evil / Master", subtitle: "Uncompromising depth", timerSeconds: 1200, baseUnlockCost: 120, gameCount: 50 },
];

// --- Player Profile -----------------------------------------------------------
export type LocalProfile = {
  playerName?: string;
  hasOnboarded: boolean;
  ageGroup: AgeGroupId | null;
  personalBest: number;
  totalXp: number;
  streak: number;
  lastPlayedDate: string | null;
  settings: AppSettings;
  tokens: number;
  speedClaims: Partial<Record<AgeGroupId, string>>;
  challengeClaims: Partial<Record<"3-day" | "7-day", string>>;
  // Sudoku progression & hints
  unlockedSudoku: Record<string, boolean>;
  completedSudoku: Record<string, boolean>;
  sudokuStars: Record<string, number>;
  sudokuHintsUsed: Record<string, number>;
  // Maths Puzzles progression
  unlockedMathsPuzzles: Record<number, boolean>;
  completedMathsPuzzles: Record<number, boolean>;
};

export const AGE_GROUPS: AgeGroup[] = [
  { id: "6-7", label: "6–7 years", topics: "Addition & subtraction", difficulty: "Very easy", pace: "60s start · −1s / level", accent: "teal" },
  { id: "8-10", label: "8–10 years", topics: "Operations & times tables", difficulty: "Easy", pace: "60s start · −2s / level", accent: "orange" },
  { id: "11-13", label: "11–13 years", topics: "Fractions & mixed maths", difficulty: "Medium", pace: "60s start · −3s / level", accent: "blue" },
  { id: "14-16", label: "14–16 years", topics: "Percentages & ratios", difficulty: "Medium–hard", pace: "60s start · −4s / level", accent: "pink" },
  { id: "17-20", label: "17–20 years", topics: "Mental maths & algebra", difficulty: "Hard", pace: "60s start · −5s / level", accent: "yellow" },
  { id: "21+", label: "21+ years", topics: "Advanced mixed challenge", difficulty: "Advanced", pace: "60s start · −6s / level", accent: "purple" },
];

export const DEFAULT_PROFILE: LocalProfile = {
  playerName: undefined,
  hasOnboarded: false,
  ageGroup: null,
  personalBest: 0,
  totalXp: 0,
  streak: 0,
  lastPlayedDate: null,
  settings: { sound: true, vibration: true },
  tokens: 0,
  speedClaims: {},
  challengeClaims: {},
  unlockedSudoku: {},
  completedSudoku: {},
  sudokuStars: {},
  sudokuHintsUsed: {},
  unlockedMathsPuzzles: {},
  completedMathsPuzzles: {},
};
