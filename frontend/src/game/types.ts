export type AgeGroupId = "6-7" | "8-10" | "11-13" | "14-16" | "17-20" | "21+";

export type AgeGroup = {
  id: AgeGroupId;
  label: string;
  topics: string;
  difficulty: string;
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
};

export type AppSettings = {
  sound: boolean;
  vibration: boolean;
};

export type LocalProfile = {
  hasOnboarded: boolean;
  ageGroup: AgeGroupId | null;
  personalBest: number;
  totalXp: number;
  streak: number;
  lastPlayedDate: string | null;
  settings: AppSettings;
};

export const AGE_GROUPS: AgeGroup[] = [
  { id: "6-7", label: "6–7 years", topics: "Addition & subtraction", difficulty: "Very easy", accent: "teal" },
  { id: "8-10", label: "8–10 years", topics: "Operations & times tables", difficulty: "Easy", accent: "orange" },
  { id: "11-13", label: "11–13 years", topics: "Fractions & mixed maths", difficulty: "Medium", accent: "blue" },
  { id: "14-16", label: "14–16 years", topics: "Percentages & ratios", difficulty: "Medium–hard", accent: "pink" },
  { id: "17-20", label: "17–20 years", topics: "Mental maths & algebra", difficulty: "Hard", accent: "yellow" },
  { id: "21+", label: "21+ years", topics: "Advanced mixed challenge", difficulty: "Advanced", accent: "purple" },
];

export const DEFAULT_PROFILE: LocalProfile = {
  hasOnboarded: false,
  ageGroup: null,
  personalBest: 0,
  totalXp: 0,
  streak: 0,
  lastPlayedDate: null,
  settings: { sound: true, vibration: true },
};