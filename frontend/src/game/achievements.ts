import { AchievementId, GameResult, LocalProfile } from "./types";

export type AchievementContext = {
  gameResult?: Pick<GameResult, "score" | "correct" | "answered" | "accuracy" | "bestCombo">;
  sudokuCompleted?: boolean;
  challengeCompleted?: boolean;
  dailyChallengeCompleted?: boolean;
};

/**
 * Checks all achievement criteria against the new profile state.
 * Returns a list of newly earned achievement IDs (not already in earnedAchievements).
 */
export function checkAchievements(
  profile: LocalProfile,
  ctx: AchievementContext = {}
): AchievementId[] {
  const earned = profile.earnedAchievements ?? {};
  const newlyEarned: AchievementId[] = [];

  function grant(id: AchievementId) {
    if (!earned[id]) newlyEarned.push(id);
  }

  const completedSudokuCount = Object.values(profile.completedSudoku ?? {}).filter(Boolean).length;
  const completedPuzzlesCount = Object.values(profile.completedMathsPuzzles ?? {}).filter(Boolean).length;

  // 🏅 First Blood — complete any challenge
  if (ctx.challengeCompleted || ctx.dailyChallengeCompleted) {
    grant("first-blood");
  }

  // ⚡ Speed Demon — answer 15+ questions in a 60s game
  if (ctx.gameResult && ctx.gameResult.answered >= 15) {
    grant("speed-demon");
  }

  // 🔥 On Fire — 10 correct in a row (bestCombo >= 10)
  if (ctx.gameResult && ctx.gameResult.bestCombo >= 10) {
    grant("on-fire");
  }

  // 🧠 Math Master — 50 maths puzzles completed
  if (completedPuzzlesCount >= 50) {
    grant("math-master");
  }

  // 🧩 Sudoku Solver — 10 sudoku games completed
  if (completedSudokuCount >= 10) {
    grant("sudoku-solver");
  }

  // 👑 Blitz Legend — score 30+ in a 60s game
  if (ctx.gameResult && ctx.gameResult.score >= 30) {
    grant("blitz-legend");
  }

  // 🔥 Streak Warrior — 7-day streak
  if (profile.streak >= 7) {
    grant("streak-warrior");
  }

  // 💎 Token Tycoon — 500+ tokens
  if (profile.tokens >= 500) {
    grant("token-tycoon");
  }

  // 🎯 Sharp Shooter — 100% accuracy in a 60s game
  if (ctx.gameResult && ctx.gameResult.answered >= 5 && ctx.gameResult.accuracy === 100) {
    grant("sharp-shooter");
  }

  // 🏆 Grand Champion — cannot be auto-earned (requires leaderboard check)
  // Grant manually when leaderboard submission confirms top 3

  return newlyEarned;
}

/**
 * Merges newly earned achievements into the profile and returns the updated profile.
 */
export function applyAchievements(
  profile: LocalProfile,
  newlyEarned: AchievementId[]
): LocalProfile {
  if (newlyEarned.length === 0) return profile;
  const now = new Date().toISOString();
  const updated = { ...profile.earnedAchievements };
  for (const id of newlyEarned) {
    updated[id] = now;
  }
  return { ...profile, earnedAchievements: updated };
}
