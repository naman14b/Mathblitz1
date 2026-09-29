import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View, useColorScheme, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AgeSelection } from "@/src/screens/AgeSelection";
import { NameEntry } from "@/src/screens/NameEntry";
import DailyChallenge from "@/src/screens/DailyChallenge";
import { SudokuHub } from "@/src/game/sudoku/SudokuHub";
import { SudokuGame } from "@/src/game/sudoku/SudokuGame";
import { MathsPuzzlesHub } from "@/src/game/mathspuzzles/MathsPuzzlesHub";
import { MathsPuzzleGame } from "@/src/game/mathspuzzles/MathsPuzzleGame";
import { isSudokuUnlocked } from "@/src/game/storage";
import { MATHS_CATALOGUE } from "@/src/game/mathspuzzles/catalogue";
import { SUDOKU_TIERS } from "@/src/game/sudoku/types";
import { ChallengeGame } from "@/src/screens/ChallengeGame";
import { Game } from "@/src/screens/Game";
import { Home } from "@/src/screens/Home";
import { HowToPlay } from "@/src/screens/HowToPlay";
import type { SudokuDifficulty } from "@/src/game/sudoku/types";
import { Results } from "@/src/screens/Results";
import { Settings } from "@/src/screens/Settings";
import { Achievements } from "@/src/screens/Achievements";
import { ThemeStore } from "@/src/screens/ThemeStore";
import { Leaderboards } from "@/src/screens/Leaderboards";
import { ChallengeTier } from "@/src/api/types";
import { leaderboardApi } from "@/src/api/admin";
import { loadProfile, resetProfile, saveProfile } from "@/src/game/storage";
import { loadJourneyState } from "@/src/game/journey/storage";
import { checkAchievements, applyAchievements } from "@/src/game/achievements";
import { MathBossScreen } from "@/src/screens/MathBoss";
import { AICoachScreen } from "@/src/screens/AICoachScreen";
import { JourneyMapScreen } from "@/src/screens/JourneyMapScreen";
import { JourneyPlayScreen } from "@/src/screens/JourneyPlayScreen";
import { BottomNavBar, NavTab } from "@/src/components/BottomNavBar";
import { AgeGroupId, AchievementId, ACHIEVEMENTS, AppSettings, AvatarId, AVATARS, DEFAULT_PROFILE, GameResult, LocalProfile, PremiumBadgeId, PREMIUM_BADGES, STREAK_MILESTONES, ThemeId, ThemeMode } from "@/src/game/types";
import { ThemeContext, getThemeColors, isNightTime, makeStyles, useTheme } from "@/src/theme";
import { SurrealBackground } from "@/src/components/SurrealBackground";
import { initAdMob, updateAdMobAudienceForAge } from "@/src/services/adMobService";

type Screen =
  | "splash"
  | "name"
  | "age"
  | "home"
  | "game"
  | "results"
  | "settings"
  | "challenge"
  | "daily-challenge"
  | "howto"
  | "sudoku-hub"
  | "sudoku-game"
  | "puzzles-hub"
  | "puzzle-game"
  | "leaderboards"
  | "achievements"
  | "theme-store"
  | "math-boss"
  | "ai-coach"
  | "journey-map"
  | "journey-play";

const CHALLENGE_TOKEN_REWARD: Record<ChallengeTier, number> = { "3-day": 20, "7-day": 30 };
function Splash() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View
      style={[
        styles.splash,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.splashHero}>
        <View style={styles.splashOrb}>
          <Ionicons name="flash" size={54} color={colors.onBrandPrimary} />
        </View>
        <Text style={styles.splashTitle}>FunGanit</Text>
        <Text style={styles.splashSub}>
          60 Seconds. Solve. Think. Win.
        </Text>
      </View>

      <View style={styles.splashPresenter}>
        <View style={styles.splashDivider} />
        <Text style={styles.splashPresentedBy}>PRESENTED BY</Text>
        <Text style={styles.splashBrand}>Bansal Tutorials</Text>
        <ActivityIndicator
          color={colors.brandPrimary}
          size="small"
          style={styles.loader}
        />
      </View>
    </View>
  );
}
const useStyles = makeStyles((colors) => ({
  splash: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 64,
  },
  splashHero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  splashOrb: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  splashTitle: {
    color: colors.onSurface,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1.4,
    marginTop: 22,
  },
  splashSub: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  splashPresenter: {
    alignItems: "center",
    gap: 6,
    width: "78%",
  },
  splashDivider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.divider,
  },
  splashPresentedBy: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 16,
  },
  splashBrand: {
    color: colors.brandPrimary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  loader: {
    marginTop: 18,
  },
}));

function PhoneScreenWrapper({ children, isNight }: { children: React.ReactNode; isNight: boolean }) {
  const { width: windowWidth } = useWindowDimensions();
  const isWidescreen = Platform.OS === "web" && windowWidth > 640;

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: isNight ? "#04060F" : "#4FA5F8",
        overflow: "hidden",
      }}
    >
      <SurrealBackground />
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: isWidescreen ? 540 : "100%",
          alignSelf: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const ScreenContainer = PhoneScreenWrapper;

export default function Index() {
  // Wrap the whole app in ThemeContext so every screen reacts to theme changes
  const [screen, setScreen] = useState<Screen>("splash");
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<GameResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [challengeTier, setChallengeTier] = useState<ChallengeTier | null>(null);
  const [challengeRapidFire, setChallengeRapidFire] = useState(false);
  const [selectedSudokuDifficulty, setSelectedSudokuDifficulty] =
    useState<SudokuDifficulty | null>(null);
  const [selectedSudokuLevel, setSelectedSudokuLevel] = useState<number | null>(null);
  const [selectedMathsPuzzle, setSelectedMathsPuzzle] = useState<number | null>(null);
  const [selectedCoachConcept, setSelectedCoachConcept] = useState<string | null>(null);
  const [selectedJourneyLevel, setSelectedJourneyLevel] = useState<number>(1);

  const [pendingBossNextScreen, setPendingBossNextScreen] = useState<Screen>("home");

  // Helper to increment totalWins and trigger Math Boss every 10 wins
  const processWinAndNavigate = async (baseProfile: LocalProfile, targetScreen: Screen) => {
    const newTotalWins = (baseProfile.totalWins || 0) + 1;
    const isBossTrigger = newTotalWins > 0 && newTotalWins % 10 === 0;

    const nextProfile = {
      ...baseProfile,
      totalWins: newTotalWins,
    };

    setProfile(nextProfile);
    await saveProfile(nextProfile);

    if (isBossTrigger) {
      setPendingBossNextScreen(targetScreen);
      setScreen("math-boss");
    } else {
      setScreen(targetScreen);
    }
  };

  const handleMathBossComplete = async (won: boolean, tokensChange: number) => {
    const nextTokens = Math.max(0, profile.tokens + tokensChange);
    const nextLevel = (profile.mathBossLevel || 1) + 1;
    const nextDefeated = (profile.mathBossDefeated || 0) + (won ? 1 : 0);

    const next = {
      ...profile,
      tokens: nextTokens,
      mathBossLevel: nextLevel,
      mathBossDefeated: nextDefeated,
    };

    setProfile(next);
    await saveProfile(next);
    setScreen(pendingBossNextScreen);
  };

  const systemColorScheme = useColorScheme();
  const themeMode: ThemeMode = profile.settings?.themeMode ?? "auto";

  const isNight = useMemo(() => {
    if (themeMode === "night") return true;
    if (themeMode === "day") return false;
    // Auto: Follow phone light and dark mode first
    if (systemColorScheme === "dark") return true;
    if (systemColorScheme === "light") return false;
    // Fallback: Clock day/night (6am - 6pm day, 6pm - 6am night)
    return isNightTime();
  }, [themeMode, systemColorScheme]);

  const toggleThemeMode = useCallback(async () => {
    const nextMode: ThemeMode = isNight ? "day" : "night";
    const next = {
      ...profile,
      settings: {
        ...profile.settings,
        themeMode: nextMode,
      },
    };
    setProfile(next);
    await saveProfile(next);
  }, [isNight, profile]);

  const handleSetThemeMode = useCallback(async (mode: ThemeMode) => {
    const next = {
      ...profile,
      settings: {
        ...profile.settings,
        themeMode: mode,
      },
    };
    setProfile(next);
    await saveProfile(next);
  }, [profile]);

  // Theme context value — recomputed whenever activeTheme, isNight, or themeMode changes
  const themeContextValue = useMemo(() => ({
    themeId: profile.activeTheme ?? "classic",
    colors: getThemeColors(profile.activeTheme ?? "classic", isNight),
    themeMode,
    isNight,
    toggleThemeMode,
    setThemeMode: handleSetThemeMode,
  }), [profile.activeTheme, isNight, themeMode, toggleThemeMode, handleSetThemeMode]);

  useEffect(() => {
    let active = true;
    initAdMob().catch(() => {});
    loadJourneyState().catch(() => {});
    loadProfile().then((saved) => {
      if (!active) return;
      setProfile({
        ...DEFAULT_PROFILE,
        ...saved,
        totalWins: saved.totalWins ?? 0,
        mathBossLevel: saved.mathBossLevel ?? 1,
        mathBossDefeated: saved.mathBossDefeated ?? 0,
        speedClaims: saved.speedClaims ?? {},
        challengeClaims: saved.challengeClaims ?? {},
        unlockedSudoku: saved.unlockedSudoku ?? {},
        completedSudoku: saved.completedSudoku ?? {},
        sudokuStars: saved.sudokuStars ?? {},
        sudokuBestTime: saved.sudokuBestTime ?? {},
        sudokuHintsUsed: saved.sudokuHintsUsed ?? {},
        unlockedMathsPuzzles: saved.unlockedMathsPuzzles ?? {},
        completedMathsPuzzles: saved.completedMathsPuzzles ?? {},
        mathsPuzzleStars: saved.mathsPuzzleStars ?? {},
        mathsPuzzleBestTime: saved.mathsPuzzleBestTime ?? {},
        streakMilestone: saved.streakMilestone ?? 3,
        avatar: saved.avatar,
      });
      if (saved.ageGroup) {
        updateAdMobAudienceForAge(saved.ageGroup).catch(() => {});
      }
      setTimeout(() => {
        if (!saved.playerName) {
          setScreen("name");
        } else {
          setScreen(saved.hasOnboarded ? "home" : "age");
        }
      }, 3000);

    });
    return () => { active = false; };
  }, []);

  const saveName = async (name: string, avatar: AvatarId) => {
    const next = { ...profile, playerName: name, avatar };
    setProfile(next);
    await saveProfile(next);
    setScreen(next.hasOnboarded ? "home" : "age");
  };

  const changeAvatar = async (avatar: AvatarId) => {
    const next = { ...profile, avatar };
    setProfile(next);
    await saveProfile(next);
  };

  const chooseAge = async (ageGroup: AgeGroupId) => {
    updateAdMobAudienceForAge(ageGroup).catch(() => {});
    const next = { ...profile, hasOnboarded: true, ageGroup };
    setProfile(next); await saveProfile(next); setScreen("home");
  };
  const startGame = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const previous = profile.lastPlayedDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = previous === today ? profile.streak : previous === yesterday ? profile.streak + 1 : 1;
    // Advance streak milestone when current one is reached
    let nextMilestone = profile.streakMilestone ?? 3;
    if (streak >= nextMilestone) {
      const idx = STREAK_MILESTONES.indexOf(nextMilestone as any);
      if (idx >= 0 && idx < STREAK_MILESTONES.length - 1) {
        nextMilestone = STREAK_MILESTONES[idx + 1];
      }
    }
    const next = { ...profile, streak, lastPlayedDate: today, streakMilestone: nextMilestone };
    setProfile(next); await saveProfile(next); setScreen("game");
  };
  const finishGame = async (gameResult: Omit<GameResult, "personalBest">) => {
    const today = new Date().toISOString().slice(0, 10);
    const isBest = gameResult.score > profile.personalBest;
    const best = Math.max(profile.personalBest, gameResult.score);
    const tokenGain = gameResult.tokensClaimed ? Math.max(0, gameResult.tokens) : 0;
    const speedClaims = { ...profile.speedClaims };
    if (gameResult.tokensClaimed && profile.ageGroup) speedClaims[profile.ageGroup] = today;
    let next = { ...profile, personalBest: best, totalXp: profile.totalXp + gameResult.xp, tokens: profile.tokens + tokenGain, speedClaims };
    // Check achievements
    const newAch = checkAchievements(next, { gameResult: { score: gameResult.score, correct: gameResult.correct, answered: gameResult.answered, accuracy: gameResult.accuracy, bestCombo: gameResult.bestCombo ?? 0 } });
    if (newAch.length > 0) next = applyAchievements(next, newAch);
    const complete = { ...gameResult, personalBest: best };
    setResult(complete); setNewBest(isBest);
    // Submit to leaderboard
    if (profile.playerName && profile.ageGroup) {
      leaderboardApi.submit(profile.playerName, gameResult.score, profile.ageGroup, "classic").catch(() => { });
    }
    await processWinAndNavigate(next, "results");
  };
  const finishChallenge = async (summary: { tier: ChallengeTier; correct: number; total: number; xp: number }) => {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyClaimed = profile.challengeClaims?.[summary.tier] === today;
    const passed = summary.total > 0 && summary.correct >= Math.ceil(summary.total * 0.6);
    const shouldGrant = !alreadyClaimed && passed;
    const tokenReward = shouldGrant ? CHALLENGE_TOKEN_REWARD[summary.tier] : 0;
    const challengeClaims = { ...profile.challengeClaims };
    if (shouldGrant) challengeClaims[summary.tier] = today;
    let next = { ...profile, totalXp: profile.totalXp + summary.xp, tokens: profile.tokens + tokenReward, challengeClaims };
    // Check achievements
    const newAch = checkAchievements(next, { challengeCompleted: passed });
    if (newAch.length > 0) next = applyAchievements(next, newAch);
    setResult({ score: summary.correct, correct: summary.correct, answered: summary.total, accuracy: summary.total ? Math.round((summary.correct / summary.total) * 100) : 0, bestCombo: summary.correct, xp: summary.xp, personalBest: profile.personalBest, tokens: tokenReward, tokensClaimed: shouldGrant });
    setNewBest(false); setChallengeTier(null);
    if (passed) {
      await processWinAndNavigate(next, "results");
    } else {
      setProfile(next); await saveProfile(next); setScreen("results");
    }
  };
  const openDailyChallenge = () => {
    setScreen("daily-challenge");
  };

  const finishDailyChallenge = async (score: number) => {
    const today = new Date().toISOString().slice(0, 10);

    const alreadyCompleted =
      profile.dailyChallengeDate === today &&
      profile.dailyChallengeCompleted;

    const next = {
      ...profile,
      dailyChallengeDate: today,
      dailyChallengeScore: score,
      dailyChallengeCompleted: true,
      tokens: alreadyCompleted ? profile.tokens : profile.tokens + 5,
    };

    // Submit daily score to leaderboard
    if (!alreadyCompleted && profile.playerName && profile.ageGroup) {
      leaderboardApi.submit(profile.playerName, score, profile.ageGroup, "daily").catch(() => { });
    }
    await processWinAndNavigate(next, "home");
  };

  const openLeaderboards = () => setScreen("leaderboards");
  const updateSettings = async (settings: AppSettings) => { const next = { ...profile, settings }; setProfile(next); await saveProfile(next); };
  const reset = async () => { await resetProfile(); setProfile(DEFAULT_PROFILE); setScreen("age"); };
  const openChallenge = (tier: ChallengeTier, rapid: boolean = false) => { setChallengeTier(tier); setChallengeRapidFire(rapid); setScreen("challenge"); };

  // ── Badge & Achievement handlers (Max 2 badges equipped at a time) ─────────
  const toggleEquipBadge = async (id: string): Promise<boolean> => {
    const current = profile.equippedBadges ?? [];
    let nextBadges: string[];
    if (current.includes(id)) {
      nextBadges = current.filter((b) => b !== id);
    } else {
      if (current.length >= 2) {
        Alert.alert(
          "Badge Limit Reached",
          "You can only equip up to 2 badges at a time. Please unequip one badge first to equip this badge."
        );
        return false;
      }
      nextBadges = [...current, id];
    }
    const next = {
      ...profile,
      equippedBadges: nextBadges,
      equippedAchievementBadge: (nextBadges.find((b) => ACHIEVEMENTS.some((a) => a.id === b)) as any) ?? null,
      equippedPremiumBadge: (nextBadges.find((b) => PREMIUM_BADGES.some((p) => p.id === b)) as any) ?? null,
    };
    setProfile(next);
    await saveProfile(next);
    return true;
  };

  const equipAchievementBadge = async (id: AchievementId | null) => {
    if (id) {
      await toggleEquipBadge(id);
    }
  };

  const equipPremiumBadge = async (id: PremiumBadgeId | null) => {
    if (id) {
      await toggleEquipBadge(id);
    }
  };

  const purchasePremiumBadge = async (id: PremiumBadgeId, utr?: string) => {
    const already = profile.purchasedPremiumBadges ?? [];
    const payments = profile.verifiedPayments ?? [];
    const next = {
      ...profile,
      purchasedPremiumBadges: already.includes(id) ? already : [...already, id],
      verifiedPayments: utr ? [...payments, { itemId: id, utr, date: new Date().toISOString() }] : payments,
    };
    setProfile(next);
    await saveProfile(next);
  };

  // ── Theme handlers (Payment verification before unlock) ───────────────────
  const activateTheme = async (id: ThemeId) => {
    const next = { ...profile, activeTheme: id };
    setProfile(next);
    await saveProfile(next);
  };

  const purchaseTheme = async (id: ThemeId, utr?: string) => {
    const already = profile.purchasedThemes ?? [];
    const payments = profile.verifiedPayments ?? [];
    const next = {
      ...profile,
      purchasedThemes: already.includes(id) ? already : [...already, id],
      activeTheme: id,
      verifiedPayments: utr ? [...payments, { itemId: id, utr, date: new Date().toISOString() }] : payments,
    };
    setProfile(next);
    await saveProfile(next);
  };

  if (screen === "splash") {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <PhoneScreenWrapper isNight={isNight}>
          <Splash />
        </PhoneScreenWrapper>
      </ThemeContext.Provider>
    );
  }
  if (screen === "name") {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <PhoneScreenWrapper isNight={isNight}>
          <NameEntry onSave={saveName} />
        </PhoneScreenWrapper>
      </ThemeContext.Provider>
    );
  }
  if (screen === "age") {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <PhoneScreenWrapper isNight={isNight}>
          <AgeSelection onSelect={chooseAge} />
        </PhoneScreenWrapper>
      </ThemeContext.Provider>
    );
  }
  // All themed screens are wrapped in ThemeContext.Provider
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <PhoneScreenWrapper isNight={isNight}>
        <AppShell
          screen={screen}
          profile={profile}
          result={result}
          newBest={newBest}
          challengeTier={challengeTier}
          selectedSudokuDifficulty={selectedSudokuDifficulty}
          selectedSudokuLevel={selectedSudokuLevel}
          selectedMathsPuzzle={selectedMathsPuzzle}
          selectedCoachConcept={selectedCoachConcept}
          setSelectedCoachConcept={setSelectedCoachConcept}
          setScreen={setScreen}
          setProfile={setProfile}
          setResult={setResult}
          setNewBest={setNewBest}
          setChallengeTier={setChallengeTier}
          setSelectedSudokuDifficulty={setSelectedSudokuDifficulty}
          setSelectedSudokuLevel={setSelectedSudokuLevel}
          setSelectedMathsPuzzle={setSelectedMathsPuzzle}
          selectedJourneyLevel={selectedJourneyLevel}
          setSelectedJourneyLevel={setSelectedJourneyLevel}
          startGame={startGame}
          finishGame={finishGame}
          finishChallenge={finishChallenge}
          finishDailyChallenge={finishDailyChallenge}
          openDailyChallenge={openDailyChallenge}
          openLeaderboards={openLeaderboards}
          updateSettings={updateSettings}
          reset={reset}
          openChallenge={openChallenge}
          challengeRapidFire={challengeRapidFire}
          setChallengeRapidFire={setChallengeRapidFire}
          equipAchievementBadge={equipAchievementBadge}
          equipPremiumBadge={equipPremiumBadge}
          toggleEquipBadge={toggleEquipBadge}
          purchasePremiumBadge={purchasePremiumBadge}
          activateTheme={activateTheme}
          purchaseTheme={purchaseTheme}
          saveName={saveName}
          changeAvatar={changeAvatar}
          chooseAge={chooseAge}
          processWinAndNavigate={processWinAndNavigate}
          onMathBossComplete={handleMathBossComplete}
        />
      </PhoneScreenWrapper>
    </ThemeContext.Provider>
  );
}

type AppShellProps = {
  screen: Screen;
  profile: LocalProfile;
  result: GameResult | null;
  newBest: boolean;
  challengeTier: ChallengeTier | null;
  challengeRapidFire: boolean;
  selectedSudokuDifficulty: SudokuDifficulty | null;
  selectedSudokuLevel: number | null;
  selectedMathsPuzzle: number | null;
  selectedCoachConcept: string | null;
  selectedJourneyLevel: number;
  setSelectedCoachConcept: (c: string | null) => void;
  setSelectedJourneyLevel: (l: number) => void;
  setScreen: (s: Screen) => void;
  setProfile: (p: LocalProfile) => void;
  setResult: (r: GameResult | null) => void;
  setNewBest: (b: boolean) => void;
  setChallengeTier: (t: ChallengeTier | null) => void;
  setSelectedSudokuDifficulty: (d: SudokuDifficulty | null) => void;
  setSelectedSudokuLevel: (l: number | null) => void;
  setSelectedMathsPuzzle: (n: number | null) => void;
  startGame: () => Promise<void>;
  finishGame: (r: Omit<GameResult, "personalBest">) => Promise<void>;
  finishChallenge: (s: { tier: ChallengeTier; correct: number; total: number; xp: number }) => Promise<void>;
  finishDailyChallenge: (score: number) => Promise<void>;
  openDailyChallenge: () => void;
  openLeaderboards: () => void;
  updateSettings: (s: AppSettings) => Promise<void>;
  reset: () => Promise<void>;
  openChallenge: (t: ChallengeTier, rapid?: boolean) => void;
  setChallengeRapidFire: (r: boolean) => void;
  equipAchievementBadge: (id: AchievementId | null) => Promise<void>;
  equipPremiumBadge: (id: PremiumBadgeId | null) => Promise<void>;
  toggleEquipBadge: (id: string) => Promise<boolean>;
  purchasePremiumBadge: (id: PremiumBadgeId, utr?: string) => Promise<void>;
  activateTheme: (id: ThemeId) => Promise<void>;
  purchaseTheme: (id: ThemeId, utr?: string) => Promise<void>;
  saveName: (name: string, avatar: AvatarId) => Promise<void>;
  changeAvatar: (avatar: AvatarId) => Promise<void>;
  chooseAge: (age: AgeGroupId) => Promise<void>;
  processWinAndNavigate: (p: LocalProfile, targetScreen: Screen) => Promise<void>;
  onMathBossComplete: (won: boolean, tokensChange: number) => Promise<void>;
};

function AppShell({
  screen, profile, result, newBest, challengeTier, challengeRapidFire,
  selectedSudokuDifficulty, selectedSudokuLevel, selectedMathsPuzzle,
  selectedCoachConcept, setSelectedCoachConcept,
  selectedJourneyLevel, setSelectedJourneyLevel,
  setScreen, setProfile, setResult, setNewBest, setChallengeTier,
  setSelectedSudokuDifficulty, setSelectedSudokuLevel, setSelectedMathsPuzzle,
  startGame, finishGame, finishChallenge, finishDailyChallenge, openDailyChallenge, openLeaderboards,
  updateSettings, reset, openChallenge,
  equipAchievementBadge, equipPremiumBadge, toggleEquipBadge, purchasePremiumBadge, activateTheme, purchaseTheme,
  processWinAndNavigate, onMathBossComplete, changeAvatar, setChallengeRapidFire,
}: AppShellProps) {
  const { isNight } = useTheme();
  const showNavBar =
    screen === "home" ||
    screen === "journey-map" ||
    screen === "ai-coach" ||
    screen === "sudoku-hub" ||
    screen === "puzzles-hub" ||
    screen === "leaderboards" ||
    screen === "achievements" ||
    screen === "theme-store";

  const activeTab: NavTab =
    screen === "journey-map" || screen === "journey-play"
      ? "journey"
      : screen === "ai-coach"
      ? "ai-coach"
      : screen === "sudoku-hub"
      ? "sudoku-hub"
      : screen === "puzzles-hub"
      ? "puzzles-hub"
      : screen === "leaderboards"
      ? "leaderboards"
      : screen === "achievements" || screen === "theme-store"
      ? "achievements"
      : "home";

  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ home: true });

  useEffect(() => {
    if (
      screen === "home" ||
      screen === "journey-map" ||
      screen === "sudoku-hub" ||
      screen === "puzzles-hub" ||
      screen === "achievements" ||
      screen === "ai-coach" ||
      screen === "leaderboards"
    ) {
      setVisitedTabs((prev) => (prev[screen] ? prev : { ...prev, [screen]: true }));
    }
  }, [screen]);

  const isHubScreen =
    screen === "home" ||
    screen === "journey-map" ||
    screen === "sudoku-hub" ||
    screen === "puzzles-hub" ||
    screen === "achievements" ||
    screen === "ai-coach" ||
    screen === "leaderboards";

  const renderHubTabs = () => (
    <View style={[{ flex: 1 }, !isHubScreen && { display: "none" }]}>
      {visitedTabs["home"] && (
        <View style={[{ flex: 1 }, screen !== "home" && { display: "none" }]}>
          <Home
            profile={profile}
            onPlay={startGame}
            onJourney={() => setScreen("journey-map")}
            onSettings={() => setScreen("settings")}
            onAge={() => setScreen("age")}
            onChallenge={openChallenge}
            onDailyChallenge={openDailyChallenge}
            onLeaderboards={openLeaderboards}
            onAchievements={() => setScreen("achievements")}
            onThemeStore={() => setScreen("theme-store")}
            onHowToPlay={() => setScreen("howto")}
            onSudoku={() => setScreen("sudoku-hub")}
            onMathsPuzzles={() => setScreen("puzzles-hub")}
            onAICoach={(conceptId?: string) => {
              setSelectedCoachConcept(conceptId || null);
              setScreen("ai-coach");
            }}
          />
        </View>
      )}

      {visitedTabs["journey-map"] && (
        <View style={[{ flex: 1 }, screen !== "journey-map" && { display: "none" }]}>
          <JourneyMapScreen
            profile={profile}
            isActive={screen === "journey-map"}
            onPlayLevel={(lvl) => {
              setSelectedJourneyLevel(lvl);
              setScreen("journey-play");
            }}
            onSpeedGate={() => {
              startGame();
            }}
            onDailyChallenge={openDailyChallenge}
            onBackHome={() => setScreen("home")}
          />
        </View>
      )}

      {visitedTabs["sudoku-hub"] && (
        <View style={[{ flex: 1 }, screen !== "sudoku-hub" && { display: "none" }]}>
          <SudokuHub
            profile={profile}
            onBack={() => setScreen("home")}
            onPlay={async (difficulty, level) => {
              const tier = SUDOKU_TIERS.find(
                (item) => item.difficulty === difficulty,
              );

              if (!tier) return;

              const id = `sudoku-${difficulty}-${level}`;
              const unlocked = level === 1 || isSudokuUnlocked(profile, id);

              if (!unlocked) {
                if (profile.tokens < tier.unlockCost) {
                  return;
                }

                const next = {
                  ...profile,
                  tokens: profile.tokens - tier.unlockCost,
                  unlockedSudoku: {
                    ...profile.unlockedSudoku,
                    [id]: true,
                  },
                };

                setProfile(next);
                await saveProfile(next);
              }

              setSelectedSudokuDifficulty(difficulty);
              setSelectedSudokuLevel(level);
              setScreen("sudoku-game");
            }}
          />
        </View>
      )}

      {visitedTabs["puzzles-hub"] && (
        <View style={[{ flex: 1 }, screen !== "puzzles-hub" && { display: "none" }]}>
          <MathsPuzzlesHub
            profile={profile}
            onBack={() => setScreen("home")}
            onPlay={async (level, unlockCost) => {
              const unlocked = level === 1 || profile.unlockedMathsPuzzles?.[level];

              if (!unlocked) {
                if (profile.tokens < unlockCost) return;
                const next = {
                  ...profile,
                  tokens: profile.tokens - unlockCost,
                  unlockedMathsPuzzles: {
                    ...profile.unlockedMathsPuzzles,
                    [level]: true,
                  },
                };
                setProfile(next);
                await saveProfile(next);
              }

              setSelectedMathsPuzzle(level);
              setScreen("puzzle-game");
            }}
          />
        </View>
      )}

      {visitedTabs["achievements"] && (
        <View style={[{ flex: 1 }, screen !== "achievements" && { display: "none" }]}>
          <Achievements
            profile={profile}
            onBack={() => setScreen("home")}
            onEquipAchievementBadge={equipAchievementBadge}
            onEquipPremiumBadge={equipPremiumBadge}
            onToggleEquipBadge={toggleEquipBadge}
            onPurchasePremiumBadge={purchasePremiumBadge}
          />
        </View>
      )}

      {visitedTabs["ai-coach"] && (
        <View style={[{ flex: 1 }, screen !== "ai-coach" && { display: "none" }]}>
          <AICoachScreen
            profile={profile}
            initialConceptId={selectedCoachConcept}
            onBack={() => {
              setSelectedCoachConcept(null);
              setScreen("home");
            }}
          />
        </View>
      )}

      {visitedTabs["leaderboards"] && (
        <View style={[{ flex: 1 }, screen !== "leaderboards" && { display: "none" }]}>
          <Leaderboards profile={profile} onBack={() => setScreen("home")} />
        </View>
      )}
    </View>
  );

  const renderModalOrGame = () => {
    if (screen === "journey-play") {
      return (
        <JourneyPlayScreen
          key={selectedJourneyLevel || 1}
          levelId={selectedJourneyLevel || 1}
          profile={profile}
          onUpdateProfile={async (updater) => {
            const next = updater(profile);
            setProfile(next);
            await saveProfile(next);
          }}
          onBackToMap={() => setScreen("journey-map")}
          onNavigateToLevel={(nextLvl) => {
            setSelectedJourneyLevel(nextLvl);
            setScreen("journey-play");
          }}
        />
      );
    }

    if (screen === "game" && profile.ageGroup) {
      return (
        <Game
          age={profile.ageGroup}
          profile={profile}
          onFinish={finishGame}
          onBack={() => setScreen("home")}
        />
      );
    }

    if (screen === "challenge" && challengeTier) {
      return (
        <ChallengeGame
          tier={challengeTier}
          profile={profile}
          onFinish={finishChallenge}
          rapidFire={challengeRapidFire}
          onBack={() => {
            setChallengeTier(null);
            setChallengeRapidFire(false);
            setScreen("home");
          }}
        />
      );
    }

    if (screen === "daily-challenge") {
      return (
        <DailyChallenge
          onComplete={finishDailyChallenge}
          onBack={() => setScreen("home")}
        />
      );
    }

    if (
      screen === "sudoku-game" &&
      selectedSudokuDifficulty &&
      selectedSudokuLevel &&
      profile.ageGroup
    ) {
      return (
        <SudokuGame
          profile={profile}
          difficulty={selectedSudokuDifficulty}
          gameNumber={selectedSudokuLevel}
          onBack={() => setScreen("sudoku-hub")}
          onComplete={(puzzleId, mistakes, elapsedSeconds) => {
            const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
            const currentBestTime = profile.sudokuBestTime?.[puzzleId];
            const newBestTime = (!currentBestTime || elapsedSeconds < currentBestTime) ? elapsedSeconds : currentBestTime;

            if (profile.completedSudoku[puzzleId]) {
              const currentStars = profile.sudokuStars?.[puzzleId] || 0;
              const nextStars = Math.max(currentStars, stars);
              const next = {
                ...profile,
                sudokuStars: { ...profile.sudokuStars, [puzzleId]: nextStars },
                sudokuBestTime: { ...profile.sudokuBestTime, [puzzleId]: newBestTime },
              };
              setProfile(next);
              void saveProfile(next);
              setScreen("sudoku-hub");
              return;
            }

            const next = {
              ...profile,
              tokens: profile.tokens + 5,
              completedSudoku: {
                ...profile.completedSudoku,
                [puzzleId]: true,
              },
              sudokuStars: {
                ...profile.sudokuStars,
                [puzzleId]: stars,
              },
              sudokuBestTime: {
                ...profile.sudokuBestTime,
                [puzzleId]: newBestTime,
              },
            };

            void processWinAndNavigate(next, "sudoku-hub");
          }}
        />
      );
    }

    if (screen === "puzzle-game" && selectedMathsPuzzle) {
      const puzzle = MATHS_CATALOGUE.find(p => p.level === selectedMathsPuzzle);
      if (puzzle) {
        return (
          <MathsPuzzleGame
            profile={profile}
            puzzle={puzzle}
            onBack={() => setScreen("puzzles-hub")}
            onComplete={(level, mistakes, elapsedSeconds) => {
              const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
              const rawPrevTime = profile.mathsPuzzleBestTime?.[level] ?? (profile.mathsPuzzleBestTime as any)?.[String(level)];
              const prevBestTime = typeof rawPrevTime === "number" ? rawPrevTime : (rawPrevTime ? Number(rawPrevTime) : 0);
              const validElapsed = typeof elapsedSeconds === "number" && elapsedSeconds > 0 ? elapsedSeconds : 1;
              const newBestTime = (!prevBestTime || validElapsed < prevBestTime) ? validElapsed : prevBestTime;

              const isAlreadyCompleted = Boolean(profile.completedMathsPuzzles?.[level] || (profile.completedMathsPuzzles as any)?.[String(level)]);

              if (isAlreadyCompleted) {
                const currentStars = Number(profile.mathsPuzzleStars?.[level] ?? (profile.mathsPuzzleStars as any)?.[String(level)] ?? 0);
                const nextStars = Math.max(currentStars, stars);
                const next = {
                  ...profile,
                  completedMathsPuzzles: {
                    ...profile.completedMathsPuzzles,
                    [level]: true,
                    [String(level)]: true,
                  },
                  mathsPuzzleStars: {
                    ...profile.mathsPuzzleStars,
                    [level]: nextStars,
                    [String(level)]: nextStars,
                  },
                  mathsPuzzleBestTime: {
                    ...profile.mathsPuzzleBestTime,
                    [level]: newBestTime,
                    [String(level)]: newBestTime,
                  },
                };
                setProfile(next);
                void saveProfile(next);
                setScreen("puzzles-hub");
                return;
              }

              const next = {
                ...profile,
                tokens: profile.tokens + 5,
                completedMathsPuzzles: {
                  ...profile.completedMathsPuzzles,
                  [level]: true,
                  [String(level)]: true,
                },
                mathsPuzzleStars: {
                  ...profile.mathsPuzzleStars,
                  [level]: stars,
                  [String(level)]: stars,
                },
                mathsPuzzleBestTime: {
                  ...profile.mathsPuzzleBestTime,
                  [level]: newBestTime,
                  [String(level)]: newBestTime,
                },
              };

              void processWinAndNavigate(next, "puzzles-hub");
            }}
          />
        );
      }
    }

    if (screen === "math-boss") {
      return (
        <MathBossScreen
          profile={profile}
          onComplete={onMathBossComplete}
        />
      );
    }

    if (screen === "results" && result) {
      return (
        <Results
          result={result}
          isNewBest={newBest}
          tokenBalance={profile.tokens}
          onAgain={startGame}
          onHome={() => setScreen("home")}
        />
      );
    }

    if (screen === "settings") {
      return (
        <Settings
          profile={profile}
          onSave={updateSettings}
          onBack={() => setScreen("home")}
          onAge={() => setScreen("age")}
          onReset={reset}
          onChangeAvatar={changeAvatar}
        />
      );
    }

    if (screen === "howto") {
      return <HowToPlay onBack={() => setScreen("home")} />;
    }

    if (screen === "theme-store") {
      return (
        <ThemeStore
          profile={profile}
          onBack={() => setScreen("home")}
          onActivateTheme={activateTheme}
          onPurchaseTheme={purchaseTheme}
        />
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: isNight ? "#090A14" : "#F0F8FF" }}>
      {renderHubTabs()}
      {!isHubScreen && renderModalOrGame()}
      {showNavBar && (
        <BottomNavBar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === "ai-coach") {
              setSelectedCoachConcept(null);
              setScreen("ai-coach");
            } else if (tab === "journey") {
              setScreen("journey-map");
            } else {
              setScreen(tab);
            }
          }}
          vibrationEnabled={profile.settings.vibration}
        />
      )}
    </View>
  );
}