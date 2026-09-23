import { storage } from "@/src/utils/storage";
import { AvatarId, AVATARS, DEFAULT_PROFILE, LocalProfile } from "./types";

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
  // Validate avatar exists in AVATARS list
  const savedAvatar = typeof saved.avatar === "string" && AVATARS.some((a) => a.id === saved.avatar)
    ? (saved.avatar as AvatarId)
    : undefined;
  return {
    playerName: typeof saved.playerName === "string" ? saved.playerName : undefined,
    avatar: savedAvatar,
    hasOnboarded: Boolean(saved.hasOnboarded),
    ageGroup: saved.ageGroup ?? null,
    personalBest: typeof saved.personalBest === "number" ? Math.max(0, saved.personalBest) : 0,
    totalXp: typeof saved.totalXp === "number" ? Math.max(0, saved.totalXp) : 0,
    streak: typeof saved.streak === "number" ? Math.max(0, saved.streak) : 0,
    streakMilestone: typeof saved.streakMilestone === "number" ? saved.streakMilestone : 3,
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
    sudokuBestTime: saved.sudokuBestTime && typeof saved.sudokuBestTime === "object" ? { ...saved.sudokuBestTime } : {},
    sudokuHintsUsed: saved.sudokuHintsUsed && typeof saved.sudokuHintsUsed === "object" ? { ...saved.sudokuHintsUsed } : {},
    unlockedMathsPuzzles: saved.unlockedMathsPuzzles && typeof saved.unlockedMathsPuzzles === "object" ? { ...saved.unlockedMathsPuzzles } : {},
    completedMathsPuzzles: saved.completedMathsPuzzles && typeof saved.completedMathsPuzzles === "object" ? { ...saved.completedMathsPuzzles } : {},
    mathsPuzzleStars: saved.mathsPuzzleStars && typeof saved.mathsPuzzleStars === "object" ? { ...saved.mathsPuzzleStars } : {},
    mathsPuzzleBestTime: saved.mathsPuzzleBestTime && typeof saved.mathsPuzzleBestTime === "object" ? { ...saved.mathsPuzzleBestTime } : {},
    dailyChallengeDate: typeof saved.dailyChallengeDate === "string" ? saved.dailyChallengeDate : null,
    dailyChallengeScore: typeof saved.dailyChallengeScore === "number" ? Math.max(0, saved.dailyChallengeScore) : 0,
    dailyChallengeCompleted: Boolean(saved.dailyChallengeCompleted),
    // Achievements
    earnedAchievements: saved.earnedAchievements && typeof saved.earnedAchievements === "object" ? { ...saved.earnedAchievements } as any : {},
    equippedAchievementBadge: (saved.equippedAchievementBadge as any) ?? null,
    // Themes
    activeTheme: (saved.activeTheme as any) ?? "classic",
    purchasedThemes: Array.isArray(saved.purchasedThemes) ? [...saved.purchasedThemes as any[]] : [],
    // Premium Badges
    purchasedPremiumBadges: Array.isArray(saved.purchasedPremiumBadges) ? [...saved.purchasedPremiumBadges as any[]] : [],
    equippedPremiumBadge: (saved.equippedPremiumBadge as any) ?? null,
    equippedBadges: Array.isArray(saved.equippedBadges) ? [...saved.equippedBadges as string[]] : (saved.equippedAchievementBadge ? [saved.equippedAchievementBadge as string] : []),
    verifiedPayments: Array.isArray(saved.verifiedPayments) ? [...saved.verifiedPayments as any[]] : [],
    // Math Boss
    totalWins: typeof saved.totalWins === "number" ? Math.max(0, saved.totalWins) : 0,
    mathBossLevel: typeof saved.mathBossLevel === "number" ? Math.max(0, saved.mathBossLevel) : 0,
    mathBossDefeated: typeof saved.mathBossDefeated === "number" ? Math.max(0, saved.mathBossDefeated) : 0,
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

// ─── AI Coach Telemetry Storage & Offline Sync Queue ────────────────────────
const ATTEMPTS_KEY = "mathblitz.attempts.v1";
const PENDING_SYNC_KEY = "mathblitz.pending_sync_attempts.v1";
const COACH_INSIGHT_KEY = "mathblitz.coach_insight.v1";

export async function saveAttempts(newAttempts: any[]): Promise<void> {
  if (!newAttempts || !newAttempts.length) return;
  const enriched = newAttempts.map((a) => ({
    ...a,
    attempt_id: a.attempt_id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  }));
  const existing = (await storage.getItem<any[]>(ATTEMPTS_KEY, [])) || [];
  const merged = [...existing, ...enriched].slice(-200); // Keep last 200 attempts locally
  await storage.setItem(ATTEMPTS_KEY, merged);

  // Also queue for server sync
  const pending = (await storage.getItem<any[]>(PENDING_SYNC_KEY, [])) || [];
  const mergedPending = [...pending, ...enriched].slice(-100);
  await storage.setItem(PENDING_SYNC_KEY, mergedPending);
}

export async function getPendingSyncAttempts(): Promise<any[]> {
  return (await storage.getItem<any[]>(PENDING_SYNC_KEY, [])) || [];
}

export async function clearSyncedAttempts(syncedIds: string[]): Promise<void> {
  if (!syncedIds || !syncedIds.length) return;
  const idSet = new Set(syncedIds);
  const pending = (await storage.getItem<any[]>(PENDING_SYNC_KEY, [])) || [];
  const remaining = pending.filter((a) => !idSet.has(a.attempt_id));
  await storage.setItem(PENDING_SYNC_KEY, remaining);
}

export async function loadRecentAttempts(limit: number = 50): Promise<any[]> {
  const existing = (await storage.getItem<any[]>(ATTEMPTS_KEY, [])) || [];
  return existing.slice(-limit);
}

export async function saveCachedInsight(insight: any): Promise<void> {
  await storage.setItem(COACH_INSIGHT_KEY, insight);
}

export async function loadCachedInsight(): Promise<any | null> {
  return await storage.getItem(COACH_INSIGHT_KEY, null);
}


