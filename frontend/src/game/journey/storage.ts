/**
 * MathBlitz Kingdom - Local Storage & Offline Progression Synchronization
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerJourneyState, LevelResultData, StarRating, WorldId } from "./types";
import { getWorldForLevel, getLevelDef } from "./worlds";

const JOURNEY_STATE_STORAGE_KEY = "mathblitz_journey_state_v1";
const JOURNEY_SYNC_QUEUE_KEY = "mathblitz_journey_sync_queue_v1";

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

const getMondayDateStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
};

export const DEFAULT_JOURNEY_STATE: PlayerJourneyState = {
  currentLevel: 1,
  highestUnlockedLevel: 1,
  completedLevels: {},
  starsByLevel: {},
  bestScoresByLevel: {},
  bestTimesByLevel: {},
  attemptCountsByLevel: {},
  totalStars: 0,
  unlockedWorlds: {
    number_forest: true,
  },
  dailyJourney: {
    date: getTodayDateStr(),
    completedLevelIds: [],
    targetLevelsCount: 3,
    isClaimed: false,
    rewardXp: 100,
    rewardTokens: 20,
    currentStreak: 0,
    longestStreak: 0,
    lastQualifyingDate: null,
  },
  weeklyJourney: {
    weekStartDate: getMondayDateStr(),
    completedLevelsCount: 0,
    targetLevelsCount: 20,
    isClaimed: false,
    rewardXp: 500,
    rewardTokens: 100,
  },
};

export async function loadJourneyState(): Promise<PlayerJourneyState> {
  try {
    const raw = await AsyncStorage.getItem(JOURNEY_STATE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_JOURNEY_STATE };
    const state: PlayerJourneyState = JSON.parse(raw);

    // Refresh daily quest if date changed
    const today = getTodayDateStr();
    if (state.dailyJourney.date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const streakKept = state.dailyJourney.lastQualifyingDate === yesterday;

      state.dailyJourney = {
        date: today,
        completedLevelIds: [],
        targetLevelsCount: 3,
        isClaimed: false,
        rewardXp: 100,
        rewardTokens: 20,
        currentStreak: streakKept ? state.dailyJourney.currentStreak : 0,
        longestStreak: state.dailyJourney.longestStreak,
        lastQualifyingDate: state.dailyJourney.lastQualifyingDate,
      };
    }

    // Refresh weekly quest if monday date changed
    const thisMonday = getMondayDateStr();
    if (state.weeklyJourney.weekStartDate !== thisMonday) {
      state.weeklyJourney = {
        weekStartDate: thisMonday,
        completedLevelsCount: 0,
        targetLevelsCount: 20,
        isClaimed: false,
        rewardXp: 500,
        rewardTokens: 100,
      };
    }

    return state;
  } catch {
    return { ...DEFAULT_JOURNEY_STATE };
  }
}

export async function saveJourneyState(state: PlayerJourneyState): Promise<void> {
  try {
    await AsyncStorage.setItem(JOURNEY_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export interface LevelSubmissionPayload {
  submissionId: string;
  playerId: string;
  levelId: number;
  worldId: string;
  score: number;
  stars: number;
  correctCount: number;
  totalCount: number;
  timeTakenSeconds: number;
  accuracy: number;
  completedAt: string;
}

export async function submitLocalLevelResult(
  playerId: string,
  result: {
    levelId: number;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeTakenSeconds: number;
  }
): Promise<{
  state: PlayerJourneyState;
  resultData: LevelResultData;
  xpDelta: number;
  tokensDelta: number;
}> {
  const state = await loadJourneyState();
  const levelDef = getLevelDef(result.levelId);
  const world = getWorldForLevel(result.levelId);

  const accuracy = result.totalQuestions > 0 ? result.correctAnswers / result.totalQuestions : 0;
  const isCompleted = accuracy >= 0.5; // At least 50% to clear level

  // Star calculation
  let stars: StarRating = 0;
  if (isCompleted) {
    stars = 1;
    if (accuracy >= levelDef.starThresholds.twoStarMinAccuracy) {
      stars = 2;
    }
    if (
      accuracy >= levelDef.starThresholds.threeStarMinAccuracy &&
      (!levelDef.starThresholds.threeStarMaxTimeSeconds || result.timeTakenSeconds <= levelDef.starThresholds.threeStarMaxTimeSeconds)
    ) {
      stars = 3;
    }
  }

  const prevStars = state.starsByLevel[result.levelId] || 0;
  const isFirstCompletion = !state.completedLevels[result.levelId] && isCompleted;
  const isNewBestScore = result.score > (state.bestScoresByLevel[result.levelId] || 0);
  const isNewBestTime = !state.bestTimesByLevel[result.levelId] || result.timeTakenSeconds < state.bestTimesByLevel[result.levelId];

  let xpDelta = 0;
  let tokensDelta = 0;

  if (isCompleted) {
    state.completedLevels[result.levelId] = true;
    state.starsByLevel[result.levelId] = Math.max(prevStars, stars) as StarRating;

    if (isNewBestScore) state.bestScoresByLevel[result.levelId] = result.score;
    if (isNewBestTime) state.bestTimesByLevel[result.levelId] = result.timeTakenSeconds;

    // First time clear rewards
    if (isFirstCompletion) {
      xpDelta += levelDef.rewardXp;
      tokensDelta += levelDef.rewardTokens;
    } else {
      // Replay fractional XP
      xpDelta += Math.floor(levelDef.rewardXp * 0.25);
    }

    // Star improvement bonus
    if (stars > prevStars) {
      tokensDelta += (stars - prevStars) * 2;
    }

    // Level progression
    let unlockedNextLevel = false;
    let unlockedNextWorld = false;

    if (result.levelId === state.highestUnlockedLevel) {
      state.highestUnlockedLevel = result.levelId + 1;
      state.currentLevel = state.highestUnlockedLevel;
      unlockedNextLevel = true;
    }

    // Boss victory unlocks next world
    if (levelDef.levelType === "boss" && stars >= 1) {
      const nextWorld = getWorldForLevel(result.levelId + 1);
      if (!state.unlockedWorlds[nextWorld.id]) {
        state.unlockedWorlds[nextWorld.id] = true;
        unlockedNextWorld = true;
      }
    }

    // Update Daily Journey
    if (!state.dailyJourney.completedLevelIds.includes(result.levelId)) {
      state.dailyJourney.completedLevelIds.push(result.levelId);
      if (
        state.dailyJourney.completedLevelIds.length >= state.dailyJourney.targetLevelsCount &&
        !state.dailyJourney.isClaimed
      ) {
        state.dailyJourney.isClaimed = true;
        state.dailyJourney.currentStreak += 1;
        state.dailyJourney.longestStreak = Math.max(state.dailyJourney.longestStreak, state.dailyJourney.currentStreak);
        state.dailyJourney.lastQualifyingDate = state.dailyJourney.date;
        xpDelta += state.dailyJourney.rewardXp;
        tokensDelta += state.dailyJourney.rewardTokens;
      }
    }

    // Update Weekly Journey
    state.weeklyJourney.completedLevelsCount += 1;
    if (
      state.weeklyJourney.completedLevelsCount >= state.weeklyJourney.targetLevelsCount &&
      !state.weeklyJourney.isClaimed
    ) {
      state.weeklyJourney.isClaimed = true;
      xpDelta += state.weeklyJourney.rewardXp;
      tokensDelta += state.weeklyJourney.rewardTokens;
    }

    // Recalculate total stars
    state.totalStars = Object.values(state.starsByLevel).reduce((acc: number, s: StarRating) => acc + s, 0);
    state.lastPlayedLevelId = result.levelId;

    await saveJourneyState(state);

    // Queue for backend sync
    const submissionId = `sub_${playerId}_${result.levelId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload: LevelSubmissionPayload = {
      submissionId,
      playerId,
      levelId: result.levelId,
      worldId: world.id,
      score: result.score,
      stars,
      correctCount: result.correctAnswers,
      totalCount: result.totalQuestions,
      timeTakenSeconds: result.timeTakenSeconds,
      accuracy,
      completedAt: new Date().toISOString(),
    };
    await queueJourneySubmission(payload);

    const resultData: LevelResultData = {
      levelId: result.levelId,
      worldId: world.id,
      completed: true,
      score: result.score,
      stars,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      timeTakenSeconds: result.timeTakenSeconds,
      accuracy,
      xpEarned: xpDelta,
      tokensEarned: tokensDelta,
      isReplay: !isFirstCompletion,
      isNewBestScore,
      isNewBestTime,
      isFirstCompletion,
      unlockedNextLevel,
      unlockedNextWorld,
    };

    return { state, resultData, xpDelta, tokensDelta };
  } else {
    // Level failed
    const resultData: LevelResultData = {
      levelId: result.levelId,
      worldId: world.id,
      completed: false,
      score: result.score,
      stars: 0,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      timeTakenSeconds: result.timeTakenSeconds,
      accuracy,
      xpEarned: 0,
      tokensEarned: 0,
      isReplay: false,
      isNewBestScore: false,
      isNewBestTime: false,
      isFirstCompletion: false,
      unlockedNextLevel: false,
      unlockedNextWorld: false,
    };
    return { state, resultData, xpDelta: 0, tokensDelta: 0 };
  }
}

export async function queueJourneySubmission(payload: LevelSubmissionPayload): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(JOURNEY_SYNC_QUEUE_KEY);
    const list: LevelSubmissionPayload[] = raw ? JSON.parse(raw) : [];
    list.push(payload);
    await AsyncStorage.setItem(JOURNEY_SYNC_QUEUE_KEY, JSON.stringify(list));
  } catch {}
}

export async function getPendingJourneySubmissions(): Promise<LevelSubmissionPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNEY_SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearSyncedJourneySubmissions(submissionIds: string[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(JOURNEY_SYNC_QUEUE_KEY);
    if (!raw) return;
    const list: LevelSubmissionPayload[] = JSON.parse(raw);
    const remaining = list.filter((s) => !submissionIds.includes(s.submissionId));
    await AsyncStorage.setItem(JOURNEY_SYNC_QUEUE_KEY, JSON.stringify(remaining));
  } catch {}
}
