import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createQuestion, scoreAnswer } from "@/src/game/engine";
import { playSound, unloadSounds } from "@/src/game/sounds";
import { AgeGroupId, GameResult, LocalProfile, Question } from "@/src/game/types";
import { IconButton } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type LiveStats = { score: number; correct: number; answered: number; combo: number; bestCombo: number; tokens: number };
const TIME_PRESSURE: Record<AgeGroupId, number> = { "6-7": 1, "8-10": 2, "11-13": 3, "14-16": 4, "17-20": 5, "21+": 6 };

export function Game({ age, profile, onFinish, onBack }: { age: AgeGroupId; profile: LocalProfile; onFinish: (result: Omit<GameResult, "personalBest">) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const today = new Date().toISOString().slice(0, 10);
  const tokensAvailable = profile.speedClaims?.[age] !== today;
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<Question>(() => createQuestion(age, 0, []));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [earned, setEarned] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [paceDeduction, setPaceDeduction] = useState(0);
  const [paceNotice, setPaceNotice] = useState("");
  const [lives, setLives] = useState(3);
  const stats = useRef<LiveStats>({ score: 0, correct: 0, answered: 0, combo: 0, bestCombo: 0, tokens: 0 });
  const recentIds = useRef<string[]>([]);
  const questionStarted = useRef(Date.now());
  const finished = useRef(false);
  const pop = useRef(new Animated.Value(1)).current;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    playSound("gameover", profile.settings.sound);
    if (profile.settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    const current = stats.current;
    onFinish({ ...current, accuracy: current.answered ? Math.round((current.correct / current.answered) * 100) : 0, xp: Math.max(20, current.score + current.correct * 3), tokens: tokensAvailable ? Math.max(0, current.tokens) : 0, tokensClaimed: tokensAvailable });
  }, [onFinish, profile.settings.sound, profile.settings.vibration, tokensAvailable]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((value) => {
      if (value <= 1) { clearInterval(timer); finish(); return 0; }
      if (value <= 6) { playSound("tick", profile.settings.sound); }
      return value - 1;
    }), 1000);
    return () => { clearInterval(timer); unloadSounds(); };
  }, [finish, profile.settings.sound]);

  const answer = async (option: string) => {
    if (feedback || finished.current) return;
    const isCorrect = Number(option) === question.answer;
    const elapsed = Date.now() - questionStarted.current;
    const current = stats.current;
    let nextLevel = level;
    current.answered += 1;
    setSelected(option);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      current.correct += 1; current.combo += 1; current.bestCombo = Math.max(current.bestCombo, current.combo);
      current.tokens += 2;
      const scoring = scoreAnswer(current.combo, elapsed, question.benchmarkSeconds);
      current.score += scoring.points; setEarned(scoring.points);
      const canLevelUp = current.answered >= 10;
      nextLevel = Math.min(4, canLevelUp && current.combo > 0 && current.combo % 3 === 0 ? level + 1 : level);
      if (nextLevel > level) {
        const deduction = TIME_PRESSURE[age] * nextLevel;
        setLevel(nextLevel); setPaceDeduction(deduction); setTimeLeft((value) => Math.max(3, value - deduction));
        setPaceNotice(`LEVEL UP · −${deduction}s`);
        setTimeout(() => setPaceNotice(""), 1200);
        playSound("levelup", profile.settings.sound);
        if (profile.settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else {
        playSound("correct", profile.settings.sound);
        if (profile.settings.vibration) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      current.combo = 0; current.tokens -= 1; setEarned(0); setLives((value) => Math.max(0, value - 1));
      playSound("wrong", profile.settings.sound);
      if (profile.settings.vibration) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.sequence([Animated.spring(pop, { toValue: 1.06, useNativeDriver: true }), Animated.spring(pop, { toValue: 1, useNativeDriver: true })]).start();
    setTimeout(() => {
      if (lives <= 1 && !isCorrect) { finish(); return; }
      recentIds.current = [question.id, ...recentIds.current].slice(0, 6);
      setQuestion(createQuestion(age, nextLevel, recentIds.current, current.answered)); questionStarted.current = Date.now(); setSelected(null); setFeedback(null);
    }, 720);
  };

  const answerOf = String(question.answer);
  return <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
    <View style={styles.topbar}><IconButton name="close" label="Exit game" onPress={onBack} /><View style={styles.timer}><Ionicons name="timer-outline" size={19} color={timeLeft <= 10 ? colors.error : colors.brandPrimary} /><Text style={[styles.timerText, { color: timeLeft <= 10 ? colors.error : colors.onSurface }]}>{timeLeft}s</Text></View><View style={styles.lives}>{[0, 1, 2].map((heart) => <Ionicons key={heart} name={heart < lives ? "heart" : "heart-outline"} size={19} color={heart < lives ? colors.error : colors.border} />)}</View></View>
    <View style={styles.scorebar}><View><Text style={styles.scoreLabel}>SCORE</Text><Text style={styles.score}>{stats.current.score}</Text><Text style={styles.levelText}>LEVEL {level + 1} · TIME PRESSURE −{paceDeduction}s</Text></View><View style={styles.combo}><Ionicons name="flash" size={16} color={colors.onBrandSecondary} /><Text style={styles.comboText}>×{Math.max(1, stats.current.combo)}</Text><Text style={styles.comboLabel}>combo</Text></View></View>
    {paceNotice ? <View style={styles.paceNotice}><Ionicons name="trending-down" size={16} color={colors.onWarning} /><Text style={styles.paceNoticeText}>{paceNotice} — keep moving!</Text></View> : null}
    {!tokensAvailable ? <View style={styles.tokenLock}><Ionicons name="lock-closed" size={13} color={colors.muted} /><Text style={styles.tokenLockText}>Tokens already claimed today for {age}. Keep practicing!</Text></View> : null}
    <View style={styles.questionWrap}><Text style={styles.topic}>{question.topic.toUpperCase()} · {age}</Text><Animated.View style={[styles.questionCard, { transform: [{ scale: pop }] }]}><Text style={styles.question}>{question.prompt}</Text><Text style={styles.benchmark}><Ionicons name="sparkles-outline" size={14} color={colors.info} /> Speed benchmark ~{question.benchmarkSeconds.toFixed(1)} sec</Text></Animated.View></View>
    <View style={styles.answers}>{question.options.map((option, index) => {
      const chosen = selected === option;
      const isRight = option === answerOf;
      const revealCorrect = feedback === "wrong" && isRight;
      const style = feedback && chosen ? (feedback === "correct" ? styles.correct : styles.wrong) : revealCorrect ? styles.correct : null;
      const showIcon = (feedback && chosen) || revealCorrect;
      return <Pressable key={`${question.id}-${option}`} testID={`game-option-${index}`} accessibilityRole="button" accessibilityLabel={`Answer ${option}`} disabled={!!feedback} onPress={() => answer(option)} style={({ pressed }) => [styles.answer, style, { opacity: pressed && !feedback ? 0.72 : 1 }]}><View style={styles.optionLetter}><Text style={styles.optionLetterText}>{String.fromCharCode(65 + index)}</Text></View><Text style={styles.answerText}>{option}</Text>{showIcon ? <Ionicons name={isRight ? "checkmark-circle" : "close-circle"} size={23} color={isRight ? colors.onSuccess : colors.onError} /> : null}</Pressable>;
    })}</View>
    <View style={styles.bottomHint}><Text style={styles.hint}>{feedback === "correct" ? `Nice! +${earned} points${tokensAvailable ? " · +2 tokens" : ""}` : feedback === "wrong" ? `Answer was ${answerOf}. Keep going!${tokensAvailable ? " (−1 token)" : ""}` : "Choose the answer before the clock does."}</Text></View>
  </View>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timer: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 15, paddingHorizontal: 14, minHeight: 40 },
  timerText: { fontSize: 16, fontWeight: "900" },
  lives: { flexDirection: "row", gap: 3, minWidth: 70, justifyContent: "flex-end" },
  scorebar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28 },
  scoreLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  score: { color: colors.onSurface, fontSize: 32, fontWeight: "900", marginTop: 2 },
  levelText: { color: colors.brandPrimary, fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginTop: 3 },
  combo: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandSecondary, borderRadius: 15, paddingHorizontal: 12, minHeight: 39 },
  comboText: { color: colors.onBrandSecondary, fontSize: 16, fontWeight: "900" },
  comboLabel: { color: colors.onBrandSecondary, fontSize: 11, fontWeight: "800" },
  paceNotice: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.warning, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8, marginTop: 13 },
  paceNoticeText: { color: colors.onWarning, fontSize: 12, fontWeight: "900" },
  tokenLock: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surfaceSecondary },
  tokenLockText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  questionWrap: { marginTop: 41, alignItems: "center" },
  topic: { color: colors.brandPrimary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginBottom: 13 },
  questionCard: { width: "100%", minHeight: 190, borderRadius: 28, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", padding: 20 },
  question: { color: colors.onSurfaceTertiary, fontSize: 38, fontWeight: "900", letterSpacing: -1, textAlign: "center" },
  benchmark: { color: colors.info, fontSize: 12, fontWeight: "700", marginTop: 19 },
  answers: { marginTop: 28, gap: 12 },
  answer: { minHeight: 61, borderRadius: 18, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 13 },
  optionLetter: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  optionLetterText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "900" },
  answerText: { color: colors.onSurface, fontSize: 18, fontWeight: "800", flex: 1 },
  correct: { backgroundColor: colors.success },
  wrong: { backgroundColor: colors.error },
  bottomHint: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 5 },
  hint: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" },
}));