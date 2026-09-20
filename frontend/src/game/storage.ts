import { storage } from "@/src/utils/storage";
import { DEFAULT_PROFILE, LocalProfile } from "./types";

const PROFILE_KEY = "mathblitz.profile.v1";

/**
 * Normalizes any loaded profile data (including legacy profiles) into a
 * complete LocalProfile. Preserves all existing tokens, streaks, personal
 * bests, and claims, while providing safe defaults for new features.
 */
export function migrateProfile(raw: unknown): LocalProfile {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PROFILE };
  }
  const saved = raw as Partial<LocalProfile> & Record<string, unknown>;
  return {
    hasOnboarded: Boolean(saved.hasOnboarded),
    ageGroup: saved.ageGroup ?? null,
    personalBest: typeof saved.personalBest === "number" ? Math.max(0, saved.personalBest) : 0,
    totalXp: typeof saved.totalXp === "number" ? Math.max(0, saved.totalXp) : 0,
    streak: typeof saved.streak === "number" ? Math.max(0, saved.streak) : 0,
    lastPlayedDate: typeof saved.lastPlayedDate === "string" ? saved.lastPlayedDate : null,
    settings: {
      sound: saved.settings?.sound ?? DEFAULT_PROFILE.settings.sound,
      vibration: saved.settings?.vibration ?? DEFAULT_PROFILE.settings.vibration,
    },
    tokens: typeof saved.tokens === "number" ? Math.max(0, saved.tokens) : 0,
    speedClaims: saved.speedClaims && typeof saved.speedClaims === "object" ? { ...saved.speedClaims } : {},
    challengeClaims: saved.challengeClaims && typeof saved.challengeClaims === "object" ? { ...saved.challengeClaims } : {},
    unlockedSudoku: saved.unlockedSudoku && typeof saved.unlockedSudoku === "object" ? { ...saved.unlockedSudoku } : {},
    completedSudoku: saved.completedSudoku && typeof saved.completedSudoku === "object" ? { ...saved.completedSudoku } : {},
    sudokuStars: saved.sudokuStars && typeof saved.sudokuStars === "object" ? { ...saved.sudokuStars } : {},
    sudokuHintsUsed: saved.sudokuHintsUsed && typeof saved.sudokuHintsUsed === "object" ? { ...saved.sudokuHintsUsed } : {},
    unlockedMathsPuzzles: saved.unlockedMathsPuzzles && typeof saved.unlockedMathsPuzzles === "object" ? { ...saved.unlockedMathsPuzzles } : {},
    completedMathsPuzzles: saved.completedMathsPuzzles && typeof saved.completedMathsPuzzles === "object" ? { ...saved.completedMathsPuzzles } : {},
  };
}

export async function loadProfile(): Promise<LocalProfile> {
  const raw = await storage.getItem(PROFILE_KEY, DEFAULT_PROFILE);
  return migrateProfile(raw);
}

export async function saveProfile(profile: LocalProfile): Promise<void> {
  await storage.setItem(PROFILE_KEY, profile);
}

export async function resetProfile(): Promise<void> {
  await storage.removeItem(PROFILE_KEY);
}

// --- Query Helpers ------------------------------------------------------------
export function isSudokuUnlocked(profile: LocalProfile, id: string): boolean {
  return Boolean(profile.unlockedSudoku?.[id]);
}

export function isSudokuCompleted(profile: LocalProfile, id: string): boolean {
  return Boolean(profile.completedSudoku?.[id]);
}

export function isMathsPuzzleUnlocked(profile: LocalProfile, id: number): boolean {
  return Boolean(profile.unlockedMathsPuzzles?.[id]);
}

export function isMathsPuzzleCompleted(profile: LocalProfile, id: number): boolean {
  return Boolean(profile.completedMathsPuzzles?.[id]);
}

export function getSudokuHintsUsed(profile: LocalProfile, id: string): number {
  return profile.sudokuHintsUsed?.[id] ?? 0;
}