import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AgeSelection } from "@/src/screens/AgeSelection";
import { Admin } from "@/src/screens/Admin";
import { ChallengeGame } from "@/src/screens/ChallengeGame";
import { Game } from "@/src/screens/Game";
import { Home } from "@/src/screens/Home";
import { HowToPlay } from "@/src/screens/HowToPlay";
import { Results } from "@/src/screens/Results";
import { Settings } from "@/src/screens/Settings";
import { ChallengeTier } from "@/src/api/types";
import { loadProfile, resetProfile, saveProfile } from "@/src/game/storage";
import { AgeGroupId, AppSettings, DEFAULT_PROFILE, GameResult, LocalProfile } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

type Screen = "splash" | "age" | "home" | "game" | "results" | "settings" | "admin" | "challenge" | "howto";

const CHALLENGE_TOKEN_REWARD: Record<ChallengeTier, number> = { "3-day": 20, "7-day": 30 };

export default function Index() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<GameResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [challengeTier, setChallengeTier] = useState<ChallengeTier | null>(null);
  useEffect(() => {
    let active = true;
    loadProfile().then((saved) => { if (!active) return; setProfile({ ...DEFAULT_PROFILE, ...saved, speedClaims: saved.speedClaims ?? {}, challengeClaims: saved.challengeClaims ?? {} }); setTimeout(() => setScreen(saved.hasOnboarded ? "home" : "age"), 900); });
    return () => { active = false; };
  }, []);

  const chooseAge = async (ageGroup: AgeGroupId) => {
    const next = { ...profile, hasOnboarded: true, ageGroup };
    setProfile(next); await saveProfile(next); setScreen("home");
  };
  const startGame = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const previous = profile.lastPlayedDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = previous === today ? profile.streak : previous === yesterday ? profile.streak + 1 : 1;
    const next = { ...profile, streak, lastPlayedDate: today };
    setProfile(next); await saveProfile(next); setScreen("game");
  };
  const finishGame = async (gameResult: Omit<GameResult, "personalBest">) => {
    const today = new Date().toISOString().slice(0, 10);
    const isBest = gameResult.score > profile.personalBest;
    const best = Math.max(profile.personalBest, gameResult.score);
    const tokenGain = gameResult.tokensClaimed ? Math.max(0, gameResult.tokens) : 0;
    const speedClaims = { ...profile.speedClaims };
    if (gameResult.tokensClaimed && profile.ageGroup) speedClaims[profile.ageGroup] = today;
    const next = { ...profile, personalBest: best, totalXp: profile.totalXp + gameResult.xp, tokens: profile.tokens + tokenGain, speedClaims };
    const complete = { ...gameResult, personalBest: best };
    setProfile(next); setResult(complete); setNewBest(isBest); await saveProfile(next); setScreen("results");
  };
  const finishChallenge = async (summary: { tier: ChallengeTier; correct: number; total: number; xp: number }) => {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyClaimed = profile.challengeClaims?.[summary.tier] === today;
    const passed = summary.total > 0 && summary.correct >= Math.ceil(summary.total * 0.6);
    const shouldGrant = !alreadyClaimed && passed;
    const tokenReward = shouldGrant ? CHALLENGE_TOKEN_REWARD[summary.tier] : 0;
    const challengeClaims = { ...profile.challengeClaims };
    if (shouldGrant) challengeClaims[summary.tier] = today;
    const next = { ...profile, totalXp: profile.totalXp + summary.xp, tokens: profile.tokens + tokenReward, challengeClaims };
    setProfile(next); await saveProfile(next);
    setResult({ score: summary.correct, correct: summary.correct, answered: summary.total, accuracy: summary.total ? Math.round((summary.correct / summary.total) * 100) : 0, bestCombo: summary.correct, xp: summary.xp, personalBest: profile.personalBest, tokens: tokenReward, tokensClaimed: shouldGrant });
    setNewBest(false); setScreen("results"); setChallengeTier(null);
  };
  const updateSettings = async (settings: AppSettings) => { const next = { ...profile, settings }; setProfile(next); await saveProfile(next); };
  const reset = async () => { await resetProfile(); setProfile(DEFAULT_PROFILE); setScreen("age"); };
  const openChallenge = (tier: ChallengeTier) => { setChallengeTier(tier); setScreen("challenge"); };

  if (screen === "splash") return <Splash />;
  if (screen === "age") return <AgeSelection onSelect={chooseAge} />;
  if (screen === "home") return <Home profile={profile} onPlay={startGame} onSettings={() => setScreen("settings")} onAdmin={() => setScreen("admin")} onAge={() => setScreen("age")} onChallenge={openChallenge} onHowToPlay={() => setScreen("howto")} />;
  if (screen === "game" && profile.ageGroup) return <Game age={profile.ageGroup} profile={profile} onFinish={finishGame} onBack={() => setScreen("home")} />;
  if (screen === "challenge" && challengeTier) return <ChallengeGame tier={challengeTier} profile={profile} onFinish={finishChallenge} onBack={() => { setChallengeTier(null); setScreen("home"); }} />;
  if (screen === "results" && result) return <Results result={result} isNewBest={newBest} tokenBalance={profile.tokens} onAgain={startGame} onHome={() => setScreen("home")} />;
  if (screen === "settings") return <Settings profile={profile} onSave={updateSettings} onBack={() => setScreen("home")} onAge={() => setScreen("age")} onReset={reset} />;
  if (screen === "admin") return <Admin onBack={() => setScreen("home")} />;
  if (screen === "howto") return <HowToPlay onBack={() => setScreen("home")} />;
  return <Home profile={profile} onPlay={startGame} onSettings={() => setScreen("settings")} onAdmin={() => setScreen("admin")} onAge={() => setScreen("age")} onChallenge={openChallenge} onHowToPlay={() => setScreen("howto")} />;
}

function Splash() {
  const insets = useSafeAreaInsets(); const { colors } = useTheme(); const styles = useStyles();
  return <View style={[styles.splash, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.splashHero}>
      <View style={styles.splashOrb}><Ionicons name="flash" size={54} color={colors.onBrandPrimary} /></View>
      <Text style={styles.splashTitle}>MathBlitz</Text>
      <Text style={styles.splashSub}>Fast maths. Big brain energy.</Text>
    </View>
    <View style={styles.splashPresenter}>
      <View style={styles.splashDivider} />
      <Text style={styles.splashPresentedBy}>PRESENTED BY</Text>
      <Text style={styles.splashBrand}>Bansal Tutorials</Text>
      <ActivityIndicator color={colors.brandPrimary} size="small" style={styles.loader} />
    </View>
  </View>;
}

const useStyles = makeStyles((colors) => ({
  splash: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "space-between", paddingVertical: 64 },
  splashHero: { alignItems: "center", flex: 1, justifyContent: "center", gap: 6 },
  splashOrb: { width: 110, height: 110, borderRadius: 34, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  splashTitle: { color: colors.onSurface, fontSize: 44, fontWeight: "900", letterSpacing: -1.4, marginTop: 22 },
  splashSub: { color: colors.muted, fontSize: 15, fontWeight: "700", marginTop: 4 },
  splashPresenter: { alignItems: "center", gap: 6, width: "78%" },
  splashDivider: { height: 1, width: "100%", backgroundColor: colors.divider },
  splashPresentedBy: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 3, marginTop: 16 },
  splashBrand: { color: colors.brandPrimary, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  loader: { marginTop: 18 },
}));
