import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AgeSelection } from "@/src/screens/AgeSelection";
import { Admin } from "@/src/screens/Admin";
import { Game } from "@/src/screens/Game";
import { Home } from "@/src/screens/Home";
import { Results } from "@/src/screens/Results";
import { Settings } from "@/src/screens/Settings";
import { loadProfile, resetProfile, saveProfile } from "@/src/game/storage";
import { AgeGroupId, AppSettings, DEFAULT_PROFILE, GameResult, LocalProfile } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

type Screen = "splash" | "age" | "home" | "game" | "results" | "settings" | "admin";

export default function Index() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<GameResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  useEffect(() => {
    let active = true;
    loadProfile().then((saved) => { if (!active) return; setProfile(saved); setTimeout(() => setScreen(saved.hasOnboarded ? "home" : "age"), 650); });
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
    const isBest = gameResult.score > profile.personalBest;
    const best = Math.max(profile.personalBest, gameResult.score);
    const next = { ...profile, personalBest: best, totalXp: profile.totalXp + gameResult.xp };
    const complete = { ...gameResult, personalBest: best };
    setProfile(next); setResult(complete); setNewBest(isBest); await saveProfile(next); setScreen("results");
  };
  const updateSettings = async (settings: AppSettings) => { const next = { ...profile, settings }; setProfile(next); await saveProfile(next); };
  const reset = async () => { await resetProfile(); setProfile(DEFAULT_PROFILE); setScreen("age"); };
  if (screen === "splash") return <Splash />;
  if (screen === "age") return <AgeSelection onSelect={chooseAge} />;
  if (screen === "home") return <Home profile={profile} onPlay={startGame} onSettings={() => setScreen("settings")} onAdmin={() => setScreen("admin")} onAge={() => setScreen("age")} />;
  if (screen === "game" && profile.ageGroup) return <Game age={profile.ageGroup} profile={profile} onFinish={finishGame} onBack={() => setScreen("home")} />;
  if (screen === "results" && result) return <Results result={result} isNewBest={newBest} onAgain={startGame} onHome={() => setScreen("home")} />;
  if (screen === "settings") return <Settings profile={profile} onSave={updateSettings} onBack={() => setScreen("home")} onAge={() => setScreen("age")} onReset={reset} />;
  if (screen === "admin") return <Admin onBack={() => setScreen("home")} />;
  return <Home profile={profile} onPlay={startGame} onSettings={() => setScreen("settings")} onAdmin={() => setScreen("admin")} onAge={() => setScreen("age")} />;
}

function Splash() {
  const insets = useSafeAreaInsets(); const { colors } = useTheme(); const styles = useStyles();
  return <View style={[styles.splash, { paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={styles.splashOrb}><Ionicons name="flash" size={44} color={colors.onBrandPrimary} /></View><Text style={styles.splashTitle}>MathBlitz</Text><Text style={styles.splashSub}>Fast maths. Big brain energy.</Text><ActivityIndicator color={colors.brandPrimary} size="small" style={styles.loader} /></View>;
}

const useStyles = makeStyles((colors) => ({
  splash: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  splashOrb: { width: 86, height: 86, borderRadius: 30, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  splashTitle: { color: colors.onSurface, fontSize: 34, fontWeight: "900", letterSpacing: -1.1, marginTop: 18 },
  splashSub: { color: colors.muted, fontSize: 14, fontWeight: "700", marginTop: 4 },
  loader: { marginTop: 32 },
}));