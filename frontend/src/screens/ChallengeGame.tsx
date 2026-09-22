import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ChallengeQuestion, ChallengeTier } from "@/src/api/types";
import { getChallengeQuestions, getRapidFireQuestions } from "@/src/game/challenges";
import { playSound } from "@/src/game/sounds";
import { LocalProfile } from "@/src/game/types";
import { IconButton, PrimaryButton, ScreenTitle } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type Phase = "loading" | "playing" | "review" | "empty";

export function ChallengeGame({
  tier,
  profile,
  onFinish,
  onBack,
  rapidFire = false,
}: {
  tier: ChallengeTier;
  profile: LocalProfile;
  onFinish: (summary: { tier: ChallengeTier; correct: number; total: number; xp: number }) => void;
  onBack: () => void;
  rapidFire?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pop = useRef(new Animated.Value(1)).current;

  // Rapid-fire pulsing progress bar
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (rapidFire) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }
  }, [rapidFire]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pulseScale.value }],
  }));

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  const startTimerFor = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimeLeft(seconds);
      timerRef.current = setInterval(() => {
        setTimeLeft((value) => {
          if (value <= 1) {
            stopTimer();
            setSelected(null);
            setFeedback("wrong");
            setComboCount(0);
            playSound("wrong", profile.settings.sound);
            if (profile.settings.vibration)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    },
    [profile.settings.sound, profile.settings.vibration]
  );

  useEffect(() => {
    const items = rapidFire
      ? getRapidFireQuestions(tier, 7)
      : getChallengeQuestions(tier);
    if (items.length === 0) {
      setPhase("empty");
      return;
    }
    setQuestions(items);
    setPhase("playing");
    startTimerFor(items[0].time_limit_seconds);
    return () => {
      stopTimer();
      clearAutoAdvance();
    };
  }, [tier, startTimerFor, rapidFire]);

  const current = questions[index];
  const xpMultiplier = tier === "7-day" ? 50 : 25;
  const rapidFireBonus = rapidFire ? 1.5 : 1;

  const advance = useCallback(() => {
    clearAutoAdvance();
    setSelected(null);
    setFeedback(null);
    if (index + 1 >= questions.length) {
      const baseXp = stats.current.correct * xpMultiplier;
      const finalXp = Math.round(baseXp * rapidFireBonus);
      onFinish({ tier, correct: stats.current.correct, total: questions.length, xp: finalXp });
      return;
    }
    const next = index + 1;
    setIndex(next);
    startTimerFor(questions[next].time_limit_seconds);
  }, [index, questions, tier, xpMultiplier, rapidFireBonus, onFinish, startTimerFor]);

  const answer = (option: string) => {
    if (feedback || !current) return;
    stopTimer();
    const isCorrect = option === current.correct_answer;
    stats.current.total += 1;
    if (isCorrect) {
      stats.current.correct += 1;
      setComboCount((c) => c + 1);
    } else {
      setComboCount(0);
    }
    setSelected(option);
    setFeedback(isCorrect ? "correct" : "wrong");
    playSound(isCorrect ? "correct" : "wrong", profile.settings.sound);
    if (profile.settings.vibration)
      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.05, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Auto-advance in rapid-fire mode after 1.2s
    if (rapidFire) {
      autoAdvanceRef.current = setTimeout(() => {
        advance();
      }, 1200);
    }
  };

  if (phase === "loading")
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  if (phase === "empty")
    return (
      <View style={[styles.root, { paddingTop: insets.top + 15, paddingHorizontal: 20 }]}>
        <View style={styles.topbar}>
          <IconButton name="arrow-back" label="Back" onPress={onBack} />
          <Text style={styles.topTitle}>
            {tier === "3-day" ? "Quickfire" : "Blitz master"}
          </Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.emptyBlock}>
          <Ionicons name="ribbon-outline" size={38} color={colors.muted} />
          <ScreenTitle
            eyebrow="Coming soon"
            title="No challenges yet"
            subtitle="No challenge questions are currently configured for this tier."
          />
          <PrimaryButton onPress={onBack} icon="arrow-back">
            Back to home
          </PrimaryButton>
        </View>
      </View>
    );

  if (!current) return null;
  const imageUri = current.image_path || null;
  const progress = ((index + (feedback ? 1 : 0)) / questions.length) * 100;
  const tierLabel = rapidFire
    ? "RAPID FIRE 🔥"
    : tier === "3-day"
    ? "Quickfire ⚡"
    : "Blitz Master 👑";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Top bar with rapid-fire badge */}
      <View style={styles.topbar}>
        <IconButton name="close" label="Exit challenge" onPress={onBack} />
        {rapidFire && (
          <View style={styles.rapidBadge}>
            <Text style={styles.rapidBadgeText}>{tierLabel}</Text>
          </View>
        )}
        <View style={styles.timer}>
          <Ionicons
            name="timer-outline"
            size={19}
            color={timeLeft <= 3 ? colors.error : colors.brandPrimary}
          />
          <Text
            testID="challenge-timer"
            style={[styles.timerText, { color: timeLeft <= 3 ? colors.error : colors.onSurface }]}
          >
            {timeLeft}s
          </Text>
        </View>
        <Text testID="challenge-progress" style={styles.progressText}>
          {index + 1}/{questions.length}
        </Text>
      </View>

      {/* Progress bar (pulses in rapid-fire) */}
      <View style={styles.progressTrack}>
        {rapidFire ? (
          <Reanimated.View style={[styles.progressFill, { width: `${progress}%` }, pulseStyle]} />
        ) : (
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        )}
      </View>

      {/* Combo counter for rapid-fire */}
      {rapidFire && comboCount >= 2 && (
        <View style={styles.comboBar}>
          <Text style={styles.comboText}>🔥 {comboCount}x Combo!</Text>
          <Text style={styles.comboBonus}>1.5× XP bonus</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {imageUri ? (
          <Animated.View style={[styles.imageWrap, { transform: [{ scale: pop }] }]}>
            <Image
              testID="challenge-image"
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
        ) : null}
        {current.prompt ? (
          <Text testID="challenge-prompt" style={styles.prompt}>
            {current.prompt}
          </Text>
        ) : null}
        <View style={styles.answers}>
          {current.options.map((option, i) => {
            const chosen = selected === option;
            const isRight = option === current.correct_answer;
            const showResult = feedback && (chosen || (feedback === "wrong" && isRight));
            const answerStyle = showResult ? (isRight ? styles.correct : styles.wrong) : null;
            return (
              <Pressable
                key={`${index}-${option}`}
                testID={`challenge-option-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Answer ${option}`}
                disabled={!!feedback}
                onPress={() => answer(option)}
                style={({ pressed }) => [
                  styles.answer,
                  answerStyle,
                  { opacity: pressed && !feedback ? 0.72 : 1 },
                ]}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={styles.answerText}>{option}</Text>
                {showResult ? (
                  <Ionicons
                    name={isRight ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={isRight ? colors.onSuccess : colors.onError}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {feedback && !rapidFire ? (
          <View style={styles.feedbackBar}>
            <Text style={styles.feedbackText}>
              {feedback === "correct" ? "Correct!" : `Answer: ${current.correct_answer}`}
            </Text>
            <PrimaryButton testID="challenge-next" onPress={advance} icon="arrow-forward">
              {index + 1 === questions.length ? "See results" : "Next question"}
            </PrimaryButton>
          </View>
        ) : null}
        {feedback && rapidFire ? (
          <View style={styles.feedbackBar}>
            <Text style={styles.feedbackText}>
              {feedback === "correct" ? "✓ Correct!" : `✗ Answer: ${current.correct_answer}`}
            </Text>
            <Text style={styles.autoAdvanceHint}>Auto-advancing...</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" },
  spacer: { width: 44 },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 15,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  timerText: { fontSize: 16, fontWeight: "900" },
  progressText: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.surfaceSecondary,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary },
  scroll: { paddingTop: 20, paddingBottom: 40, gap: 14 },
  imageWrap: {
    width: "100%",
    minHeight: 200,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: 220 },
  prompt: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 27,
  },
  answers: { gap: 12, marginTop: 4 },
  answer: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "900" },
  answerText: { color: colors.onSurface, fontSize: 16, fontWeight: "800", flex: 1 },
  correct: { backgroundColor: colors.success },
  wrong: { backgroundColor: colors.error },
  feedbackBar: { gap: 12, marginTop: 8 },
  feedbackText: { color: colors.muted, fontSize: 13, fontWeight: "900", textAlign: "center" },
  emptyBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 10,
  },
  // Rapid-fire specific styles
  rapidBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  rapidBadgeText: {
    color: "#1A1A1A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  comboBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.warning + "22",
    borderRadius: 99,
    alignSelf: "center",
  },
  comboText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "900",
  },
  comboBonus: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  autoAdvanceHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    fontStyle: "italic",
  },
}));
