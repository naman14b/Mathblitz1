export type AgeGroupId = "6-7" | "8-10" | "11-13" | "14-16" | "17-20" | "21+";

// --- Avatar Definitions -------------------------------------------------------
export type AvatarId =
  | "boy-1" | "girl-1"
  | "boy-2" | "girl-2"
  | "boy-3" | "girl-3"
  | "boy-4" | "girl-4"
  | "boy-5" | "girl-5";

export type AvatarDef = {
  id: AvatarId;
  emoji: string;
  label: string;
  gender: "male" | "female";
};

export const AVATARS: AvatarDef[] = [
  { id: "boy-1",  emoji: "🧑‍🎓", label: "Scholar",    gender: "male" },
  { id: "girl-1", emoji: "👩‍🔬", label: "Scientist",  gender: "female" },
  { id: "boy-2",  emoji: "🧙‍♂️", label: "Wizard",     gender: "male" },
  { id: "girl-2", emoji: "🧝‍♀️", label: "Elf Queen",  gender: "female" },
  { id: "boy-3",  emoji: "🦸‍♂️", label: "Hero",       gender: "male" },
  { id: "girl-3", emoji: "🦸‍♀️", label: "Heroine",    gender: "female" },
  { id: "boy-4",  emoji: "🥷",   label: "Ninja",      gender: "male" },
  { id: "girl-4", emoji: "👸",   label: "Princess",   gender: "female" },
  { id: "boy-5",  emoji: "🤖",   label: "Robot",      gender: "male" },
  { id: "girl-5", emoji: "🧚‍♀️", label: "Fairy",      gender: "female" },
];

// --- Streak Milestones --------------------------------------------------------
export const STREAK_MILESTONES = [3, 7, 15, 21, 24, 30] as const;

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
  subtopic?: string;
  difficulty?: number;
  concepts_tested?: string[];
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

export type ThemeMode = "auto" | "day" | "night";

export type AppSettings = {
  sound: boolean;
  vibration: boolean;
  themeMode?: ThemeMode;
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
  { id: "easy", name: "Easy", subtitle: "Friendly warmups", timerSeconds: 600, baseUnlockCost: 20, gameCount: 50 },
  { id: "medium", name: "Medium", subtitle: "Balanced logic", timerSeconds: 720, baseUnlockCost: 35, gameCount: 50 },
  { id: "hard", name: "Hard", subtitle: "Advanced deduction", timerSeconds: 900, baseUnlockCost: 60, gameCount: 50 },
  { id: "expert", name: "Expert / Extreme", subtitle: "Masterful techniques", timerSeconds: 1080, baseUnlockCost: 90, gameCount: 50 },
  { id: "evil", name: "Evil / Master", subtitle: "Uncompromising depth", timerSeconds: 1200, baseUnlockCost: 130, gameCount: 50 },
];

// --- Player Profile -----------------------------------------------------------
export type LocalProfile = {
  playerName?: string;
  avatar?: AvatarId;
  hasOnboarded: boolean;
  ageGroup: AgeGroupId | null;
  personalBest: number;
  totalXp: number;
  streak: number;
  streakMilestone: number; // current target milestone (3, 7, 15, 21, 24, 30)
  lastPlayedDate: string | null;
  settings: AppSettings;
  tokens: number;
  speedClaims: Partial<Record<AgeGroupId, string>>;
  challengeClaims: Partial<Record<"3-day" | "7-day", string>>;
  // Sudoku progression & hints
  unlockedSudoku: Record<string, boolean>;
  completedSudoku: Record<string, boolean>;
  sudokuStars: Record<string, number>;
  sudokuBestTime: Record<string, number>; // puzzleId -> best time in seconds
  sudokuHintsUsed: Record<string, number>;
  // Maths Puzzles progression
  unlockedMathsPuzzles: Record<number, boolean>;
  completedMathsPuzzles: Record<number, boolean>;
  mathsPuzzleStars: Record<number, number>;
  mathsPuzzleBestTime: Record<number, number>; // level -> best time in seconds

  // Daily Challenge
  dailyChallengeDate: string | null;
  dailyChallengeScore: number;
  dailyChallengeCompleted: boolean;

  // Achievements
  earnedAchievements: Record<AchievementId, string>; // achievementId -> ISO date earned
  equippedAchievementBadge: AchievementId | null;

  // Themes
  activeTheme: ThemeId;
  purchasedThemes: ThemeId[];

  // Premium Badges
  purchasedPremiumBadges: PremiumBadgeId[];
  equippedPremiumBadge: PremiumBadgeId | null;
  // Badges & Frames (Max 2 equipped at a time)
  equippedBadges: string[];
  verifiedPayments: Array<{ itemId: string; utr: string; date: string }>;

  // Math Boss
  totalWins: number;
  mathBossLevel: number;
  mathBossDefeated: number;
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
  avatar: undefined,
  hasOnboarded: false,
  ageGroup: null,
  personalBest: 0,
  totalXp: 0,
  streak: 0,
  streakMilestone: 3,
  lastPlayedDate: null,
  settings: { sound: true, vibration: true, themeMode: "auto" },
  tokens: 0,
  speedClaims: {},
  challengeClaims: {},
  unlockedSudoku: {},
  completedSudoku: {},
  sudokuStars: {},
  sudokuBestTime: {},
  sudokuHintsUsed: {},
  unlockedMathsPuzzles: {},
  completedMathsPuzzles: {},
  mathsPuzzleStars: {},
  mathsPuzzleBestTime: {},

  // Daily Challenge
  dailyChallengeDate: null,
  dailyChallengeScore: 0,
  dailyChallengeCompleted: false,

  // Achievements
  earnedAchievements: {} as Record<AchievementId, string>,
  equippedAchievementBadge: null,

  // Themes
  activeTheme: "classic" as ThemeId,
  purchasedThemes: [] as ThemeId[],

  // Premium Badges
  purchasedPremiumBadges: [] as PremiumBadgeId[],
  equippedPremiumBadge: null,
  equippedBadges: [] as string[],
  verifiedPayments: [],

  // Math Boss
  totalWins: 0,
  mathBossLevel: 0,
  mathBossDefeated: 0,
};

// --- Achievement Definitions --------------------------------------------------
export type AchievementId =
  | "first-blood"
  | "speed-demon"
  | "on-fire"
  | "math-master"
  | "sudoku-solver"
  | "blitz-legend"
  | "streak-warrior"
  | "token-tycoon"
  | "sharp-shooter"
  | "grand-champion";

export type Achievement = {
  id: AchievementId;
  emoji: string;
  title: string;
  description: string;
  hint: string; // shown when locked
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-blood",    emoji: "🏅", title: "First Blood",    description: "Complete your first challenge.",           hint: "Complete any challenge" },
  { id: "speed-demon",    emoji: "⚡", title: "Speed Demon",    description: "Answer 15 questions in a single 60s game.", hint: "Answer 15 questions in 60s" },
  { id: "on-fire",        emoji: "🔥", title: "On Fire",        description: "10 correct answers in a row.",             hint: "Chain 10 correct answers" },
  { id: "math-master",    emoji: "🧠", title: "Math Master",    description: "Complete 50 maths puzzles.",               hint: "Complete 50 puzzles" },
  { id: "sudoku-solver",  emoji: "🧩", title: "Sudoku Solver",  description: "Complete 10 Sudoku games.",               hint: "Finish 10 Sudoku games" },
  { id: "blitz-legend",   emoji: "👑", title: "Blitz Legend",   description: "Score 30+ in a 60-second game.",          hint: "Score 30+ in one game" },
  { id: "streak-warrior", emoji: "🔥", title: "Streak Warrior", description: "Maintain a 7-day login streak.",          hint: "Play 7 days in a row" },
  { id: "token-tycoon",   emoji: "💎", title: "Token Tycoon",   description: "Accumulate 500 tokens.",                  hint: "Collect 500 tokens total" },
  { id: "sharp-shooter",  emoji: "🎯", title: "Sharp Shooter",  description: "100% accuracy in a 60-second game.",     hint: "Perfect game accuracy" },
  { id: "grand-champion", emoji: "🏆", title: "Grand Champion", description: "Reach the Top 3 on any leaderboard.",    hint: "Place top 3 on leaderboard" },
];

// --- Theme Definitions --------------------------------------------------------
export type ThemeId =
  | "classic"
  | "cosmic"
  | "ocean"
  | "forest"
  | "candy"
  | "neon"
  | "volcano"
  | "diwali"
  | "holi"
  | "christmas"
  | "eid"
  | "midnight";

export type ThemeDef = {
  id: ThemeId;
  name: string;
  emoji: string;
  price: number; // 0 = free
  tag?: string;  // e.g. "Festival"
  accentColor: string; // preview swatch
};

export const THEMES: ThemeDef[] = [
  { id: "classic",   name: "Classic Maths", emoji: "☀️",  price: 0,  accentColor: "#FF6B35" },
  { id: "cosmic",    name: "Cosmic",        emoji: "🌌",  price: 49, accentColor: "#7C3AED" },
  { id: "ocean",     name: "Ocean",         emoji: "🌊",  price: 49, accentColor: "#0369A1" },
  { id: "forest",    name: "Forest",        emoji: "🌲",  price: 49, accentColor: "#15803D" },
  { id: "candy",     name: "Candy",         emoji: "🌈",  price: 49, accentColor: "#EC4899" },
  { id: "neon",      name: "Neon",          emoji: "⚡",  price: 49, accentColor: "#00F0FF" },
  { id: "volcano",   name: "Volcano",       emoji: "🔥",  price: 49, accentColor: "#DC2626" },
  { id: "diwali",    name: "Diwali",        emoji: "🪔",  price: 49, tag: "Festival", accentColor: "#F59E0B" },
  { id: "holi",      name: "Holi",          emoji: "🎨",  price: 49, tag: "Festival", accentColor: "#A855F7" },
  { id: "christmas", name: "Christmas",     emoji: "🎄",  price: 49, tag: "Festival", accentColor: "#16A34A" },
  { id: "eid",       name: "Eid",           emoji: "🌙",  price: 49, tag: "Festival", accentColor: "#0EA5E9" },
  { id: "midnight",  name: "Midnight",      emoji: "🖤",  price: 49, accentColor: "#334155" },
];

// --- Premium Badge Definitions ------------------------------------------------
export type PremiumBadgeId =
  | "starborn"
  | "dragon-scales"
  | "galaxy-pulse"
  | "golden-god"
  | "cyber-grid"
  | "shadow-king";

export type PremiumBadge = {
  id: PremiumBadgeId;
  name: string;
  description: string;
  price: number;
  borderColor: string;
  gradient: [string, string];
};

export const PREMIUM_BADGES: PremiumBadge[] = [
  { id: "starborn",      name: "Starborn",      description: "Iridescent star constellation frame",       price: 49, borderColor: "#A78BFA", gradient: ["#1E1B4B", "#7C3AED"] },
  { id: "dragon-scales", name: "Dragon Scales", description: "Emerald dragon scale border with fierce eyes", price: 49, borderColor: "#10B981", gradient: ["#064E3B", "#059669"] },
  { id: "galaxy-pulse",  name: "Galaxy Pulse",  description: "Deep purple nebula swirling frame",          price: 49, borderColor: "#EC4899", gradient: ["#4C0519", "#9D174D"] },
  { id: "golden-god",    name: "Golden God",    description: "Ornate solid gold baroque frame",             price: 49, borderColor: "#F59E0B", gradient: ["#78350F", "#D97706"] },
  { id: "cyber-grid",    name: "Cyber Grid",    description: "Neon blue circuit board hexagonal frame",    price: 49, borderColor: "#00F0FF", gradient: ["#0C4A6E", "#0EA5E9"] },
  { id: "shadow-king",   name: "Shadow King",   description: "Dark obsidian and crimson gothic frame",     price: 49, borderColor: "#DC2626", gradient: ["#1C0A00", "#7F1D1D"] },
];


// ─── AI Coach Types ──────────────────────────────────────────────────────────

export type QuestionAttempt = {
  prompt: string;
  player_answer: string;
  correct_answer: string;
  is_correct: boolean;
  topic: string;
  subtopic?: string;
  difficulty?: number;
  response_time_ms: number;
  game_mode?: string;
  timestamp?: string;
  attempt_id?: string;
  error_category?: string;
  error_hypothesis?: string;
};

export type TopicMetric = {
  concept_id: string;
  concept_name: string;
  topic: string;
  subtopic: string;
  accuracy: number;
  recent_accuracy: number;
  trend: "improving" | "declining" | "stable";
  mastery_score: number;
  confidence?: number;
  confidence_level: "High" | "Medium" | "Low";
  mastery_state?: "unknown" | "learning" | "developing" | "proficient" | "mastered" | "regressing";
  is_regression?: boolean;
  regression_detected?: boolean;
  regression_severity?: string;
  total_attempts: number;
  correct_attempts: number;
  primary_error?: string;
  primary_mistake_desc?: string;
};

export type DetectedWeakness = {
  concept_id: string;
  concept_name: string;
  topic: string;
  subtopic: string;
  accuracy: number;
  recent_accuracy: number;
  total_attempts: number;
  severity: "high" | "medium" | "low";
  primary_error_category: string;
  common_mistake: string;
  recommended_action: string;
  mastery_score: number;
  confidence?: number;
  is_regression?: boolean;
  target_learning_concept_id?: string;
  target_learning_concept_name?: string;
  is_prerequisite_gap?: boolean;
  learning_objective?: string;
  evidence_summary?: string;
  recommended_difficulty?: number;
};

export type LearningProfile = {
  player_id: string;
  overall_accuracy: number;
  total_attempts: number;
  total_correct: number;
  topic_metrics: Record<string, TopicMetric>;
  weak_areas: DetectedWeakness[];
  active_intervention: DetectedWeakness | null;
  updated_at?: string;
};

export type CoachingPracticeItem = {
  id: string;
  difficulty: number;
  prompt: string;
  options: string[];
  correct_answer: string;
  solution_method: string;
  concept_tested: string;
  verified: boolean;
};

export type CoachingSessionData = {
  session_id: string;
  concept_id: string;
  concept_name: string;
  topic: string;
  subtopic: string;
  target_learning_concept_id?: string;
  target_learning_concept_name?: string;
  is_prerequisite_gap?: boolean;
  root_cause_error?: string;
  evidence_summary?: string;
  intervention_type?: string;
  common_mistake: string;
  learning_objective: string;
  concept_explanation: string;
  formula_breakdown: string;
  example_problem: string;
  example_solution: string;
  verified_practice: CoachingPracticeItem[];
  mastery_before: number;
  confidence_before?: number;
};

export type CoachingInsight = {
  has_insight: boolean;
  concept_id?: string;
  concept_name?: string;
  headline?: string;
  message?: string;
  mastery_score?: number;
  cta_label?: string;
  severity?: "high" | "medium" | "low";
  is_regression?: boolean;
  target_learning_concept_id?: string;
  target_learning_concept_name?: string;
  is_prerequisite_gap?: boolean;
  evidence_summary?: string;
};


