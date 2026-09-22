import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mathBossApi, BossChallenge, BossResult } from "@/src/api/admin";
import { IconButton, PrimaryButton } from "@/src/components/ui";
import { playSound } from "@/src/game/sounds";
import { LocalProfile } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";
import { SurrealBackground } from "@/src/components/SurrealBackground";

type MathBossProps = {
  profile: LocalProfile;
  onComplete: (won: boolean, tokensChange: number) => void;
};

// Fallback local boss profiles & generator for offline play
const LOCAL_BOSSES = [
  { name: "Count Calculo", avatar: "🤖", title: "The Formula Fiend", quote: "Ah, 10 wins? How adorable. Let's see if your CPU can handle 20 questions in 2 minutes!" },
  { name: "The Divisor", avatar: "👹", title: "Lord of Remainder", quote: "You think you're fast? I divide legends into zero! Face me if you dare!" },
  { name: "Professor Primus", avatar: "🧙‍♂️", title: "Master of Primes", quote: "Fascinating... A challenger! Let us test your numerical endurance under pressure." },
  { name: "Mathemagician X", avatar: "🎩", title: "Grand Illusionist", quote: "Now you see your streak... now you don't! Solve 20 questions or lose 10 tokens!" },
  { name: "Dr. Infinity", avatar: "💀", title: "Emperor of Chaos", quote: "You survived until now, mortal. But nobody escapes Dr. Infinity's rapid-fire blitz!" },
];

function generateLocalQuestions(level: number, count = 20) {
  const questions = [];
  const maxNum = Math.min(12 + level * 3, 50);

  for (let i = 0; i < count; i++) {
    const ops = ["+", "-", "×", "÷"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 0, b = 0, ans = 0;

    if (op === "+") {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      ans = a + b;
    } else if (op === "-") {
      a = Math.floor(Math.random() * maxNum) + 5;
      b = Math.floor(Math.random() * a) + 1;
      ans = a - b;
    } else if (op === "×") {
      const multMax = Math.min(6 + level * 2, 12);
      a = Math.floor(Math.random() * multMax) + 2;
      b = Math.floor(Math.random() * multMax) + 2;
      ans = a * b;
    } else {
      b = Math.floor(Math.random() * Math.min(8 + level, 12)) + 2;
      ans = Math.floor(Math.random() * Math.min(8 + level, 12)) + 1;
      a = b * ans;
    }

    const wrong1 = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
    const wrong2 = ans + (Math.random() > 0.5 ? 2 : -2) * (Math.floor(Math.random() * 4) + 2);
    const wrong3 = ans + (Math.random() > 0.5 ? 5 : -5) * (Math.floor(Math.random() * 3) + 1);

    const rawOptions = [ans, wrong1, wrong2, wrong3].map(n => Math.max(0, n));
    const uniqueOptions = Array.from(new Set(rawOptions));
    while (uniqueOptions.length < 4) {
      uniqueOptions.push(ans + uniqueOptions.length + 3);
    }
    const shuffled = uniqueOptions.sort(() => Math.random() - 0.5).map(String);

    questions.push({
      id: `q_${i}`,
      prompt: `${a} ${op} ${b}`,
      answer: ans,
      options: shuffled,
    });
  }

  return questions;
}

export function MathBossScreen({ profile, onComplete }: MathBossProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const level = profile.mathBossLevel || 1;
  const playerName = profile.playerName || "Player";
  const wins = profile.totalWins || 10;

  // Screen phase: "intro" | "battle" | "victory" | "defeat"
  const [phase, setPhase] = useState<"intro" | "battle" | "victory" | "defeat">("intro");
  const [challenge, setChallenge] = useState<BossChallenge | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean | null>(null);
  const [bossMessage, setBossMessage] = useState("");

  // Reanimated animations
  const bossScale = useSharedValue(1);
  const bossTranslateX = useSharedValue(0);
  const bossTranslateY = useSharedValue(0);
  const bossRotate = useSharedValue(0);
  const tokenFlyY = useSharedValue(0);
  const tokenFlyOpacity = useSharedValue(0);

  // Screen shake on intro
  useEffect(() => {
    // Initial boss entrance shake
    bossTranslateX.value = withSequence(
      withTiming(15, { duration: 60 }),
      withTiming(-15, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );

    // Fetch challenge from backend or generate locally
    let mounted = true;
    mathBossApi.getChallenge(level, playerName, wins)
      .then((data) => {
        if (mounted) setChallenge(data);
      })
      .catch(() => {
        if (mounted) {
          const bossInfo = LOCAL_BOSSES[(level - 1) % LOCAL_BOSSES.length];
          setChallenge({
            level,
            boss_name: bossInfo.name,
            boss_avatar: bossInfo.avatar,
            boss_title: bossInfo.title,
            challenge_quote: bossInfo.quote,
            questions: generateLocalQuestions(level, 20),
            time_limit: 120,
          });
        }
      });

    return () => { mounted = false; };
  }, [level, playerName, wins]);

  // Timer loop in battle phase
  useEffect(() => {
    if (phase !== "battle") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishBattle(score, questionIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, score, questionIndex]);

  const startBattle = () => {
    if (profile.settings.vibration) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    playSound("tick", profile.settings.sound);
    setPhase("battle");
  };

  const currentQuestion = challenge?.questions[questionIndex];

  const handleSelectOption = (opt: string) => {
    if (selectedOption !== null || !currentQuestion) return;

    setSelectedOption(opt);
    const isRight = Number(opt) === currentQuestion.answer;
    setIsCorrectFeedback(isRight);

    if (isRight) {
      setScore((s) => s + 1);
      playSound("correct", profile.settings.sound);
      if (profile.settings.vibration) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } else {
      playSound("wrong", profile.settings.sound);
      if (profile.settings.vibration) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }

    setTimeout(() => {
      setSelectedOption(null);
      setIsCorrectFeedback(null);

      if (questionIndex + 1 < (challenge?.questions.length || 20)) {
        setQuestionIndex((i) => i + 1);
      } else {
        finishBattle(isRight ? score + 1 : score, 20);
      }
    }, 300);
  };

  const finishBattle = async (finalCorrect: number, totalAnswered: number) => {
    const total = challenge?.questions.length || 20;
    const won = finalCorrect >= Math.ceil(total * 0.55); // 11 out of 20 to win

    // Play sounds
    if (won) {
      playSound("levelup", profile.settings.sound);
      setPhase("victory");

      // Boss Kick Out Animation: spins and flies off to top-right
      bossRotate.value = withTiming(720, { duration: 800 });
      bossScale.value = withTiming(0.1, { duration: 800 });
      bossTranslateX.value = withTiming(350, { duration: 800 });
      bossTranslateY.value = withTiming(-400, { duration: 800 });
    } else {
      playSound("gameover", profile.settings.sound);
      setPhase("defeat");

      // Boss Eating Tokens Animation: grows big, shaking munching effect
      bossScale.value = withSequence(
        withSpring(1.6),
        withTiming(1.4, { duration: 300 }),
        withSpring(1.6)
      );
      tokenFlyY.value = withTiming(-120, { duration: 700 });
      tokenFlyOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 500 })
      );
    }

    // Try backend result call
    try {
      const res = await mathBossApi.submitResult(level, finalCorrect, total);
      setBossMessage(res.message);
    } catch {
      if (won) {
        setBossMessage(`Kicked ${challenge?.boss_name || "Math Boss"} into orbit! You won +10 Tokens!`);
      } else {
        setBossMessage(`${challenge?.boss_name || "Math Boss"} devoured 10 of your hard-earned tokens!`);
      }
    }
  };

  // Reanimated style bindings
  const bossAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bossTranslateX.value },
      { translateY: bossTranslateY.value },
      { scale: bossScale.value },
      { rotate: `${bossRotate.value}deg` },
    ],
  }));

  const tokenFlyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tokenFlyY.value }],
    opacity: tokenFlyOpacity.value,
  }));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View style={styles.container}>
      <SurrealBackground />

      {/* Top Banner */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.badgeRow}>
          <View style={styles.warningBadge}>
            <Ionicons name="warning-outline" size={16} color="#FF6B6B" />
            <Text style={styles.warningText}>SURPRISE MATH BOSS!</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {level}</Text>
          </View>
        </View>
      </View>

      {/* Intro Phase */}
      {phase === "intro" && (
        <View style={styles.contentCenter}>
          <Animated.View style={[styles.bossAvatarBox, bossAnimatedStyle]}>
            <Text style={styles.bossAvatarText}>{challenge?.boss_avatar || challenge?.boss_emoji || "👹"}</Text>
          </Animated.View>

          <Text style={styles.bossName}>{challenge?.boss_name || "Math Boss"}</Text>
          <Text style={styles.bossTitle}>{challenge?.boss_title || "The Ultimate Challenge"}</Text>

          <View style={styles.quoteCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFE600" style={{ marginBottom: 6 }} />
            <Text style={styles.quoteText}>
              "{challenge?.challenge_quote || challenge?.taunt || "Think you're fast? Solve 20 questions in 2 minutes!"}"
            </Text>
          </View>

          <View style={styles.rulesCard}>
            <View style={styles.ruleItem}>
              <Ionicons name="stopwatch-outline" size={20} color="#00E5FF" />
              <Text style={styles.ruleText}>2 Minutes Time Limit</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="help-circle-outline" size={20} color="#00E5FF" />
              <Text style={styles.ruleText}>20 Rapid-Fire Questions</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="trophy-outline" size={20} color="#FFD700" />
              <Text style={styles.ruleText}>Win: +10 Tokens | Loss: -10 Tokens</Text>
            </View>
          </View>

          <View style={styles.actionBox}>
            <PrimaryButton
              label="ACCEPT CHALLENGE"
              onPress={startBattle}
            />
          </View>
        </View>
      )}

      {/* Battle Phase */}
      {phase === "battle" && (
        <View style={styles.battleContent}>
          {/* Progress & Timer */}
          <View style={styles.timerRow}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Question {questionIndex + 1} / {challenge?.questions.length || 20}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((questionIndex + 1) / (challenge?.questions.length || 20)) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.timerBadge, timeLeft <= 15 && styles.timerBadgeUrgent]}>
              <Ionicons name="time-outline" size={18} color={timeLeft <= 15 ? "#FF4A4A" : "#FFFFFF"} />
              <Text style={[styles.timerText, timeLeft <= 15 && styles.timerTextUrgent]}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          </View>

          {/* Boss Reaction Header */}
          <View style={styles.miniBossBar}>
            <Text style={styles.miniBossAvatar}>{challenge?.boss_avatar || challenge?.boss_emoji || "🤖"}</Text>
            <Text style={styles.miniBossName}>{challenge?.boss_name}</Text>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionPrompt}>
              {currentQuestion?.prompt ?? "Loading..."} = ?
            </Text>
          </View>

          {/* Options Grid */}
          <View style={styles.optionsGrid}>
            {currentQuestion?.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isRight = isSelected && isCorrectFeedback === true;
              const isWrong = isSelected && isCorrectFeedback === false;

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.optionBtn,
                    isRight && styles.optionBtnRight,
                    isWrong && styles.optionBtnWrong,
                  ]}
                  onPress={() => handleSelectOption(option)}
                  disabled={selectedOption !== null}
                >
                  <Text style={[styles.optionText, (isRight || isWrong) && styles.optionTextHighlight]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Victory Scene */}
      {phase === "victory" && (
        <View style={styles.contentCenter}>
          <Animated.View style={[styles.bossAvatarBox, bossAnimatedStyle]}>
            <Text style={styles.bossAvatarText}>{challenge?.boss_avatar || "🤖"}</Text>
          </Animated.View>

          <Text style={styles.victoryTitle}>BOSS DEFEATED!</Text>
          <Text style={styles.victorySub}>You kicked {challenge?.boss_name} into outer space!</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultScoreText}>
              {score} / {challenge?.questions.length || 20} Correct
            </Text>
            <Text style={styles.resultMessage}>{bossMessage}</Text>

            <View style={styles.rewardBox}>
              <Ionicons name="server" size={28} color="#FFD700" />
              <Text style={styles.rewardText}>+10 TOKENS REWARD</Text>
            </View>
          </View>

          <View style={styles.actionBox}>
            <PrimaryButton
              label="CLAIM TOKENS & CONTINUE"
              onPress={() => onComplete(true, 10)}
            />
          </View>
        </View>
      )}

      {/* Defeat Scene */}
      {phase === "defeat" && (
        <View style={styles.contentCenter}>
          <Animated.View style={[styles.bossAvatarBox, bossAnimatedStyle]}>
            <Text style={styles.bossAvatarText}>{challenge?.boss_avatar || "👹"}</Text>
          </Animated.View>

          {/* Floating Tokens being eaten animation */}
          <Animated.View style={[styles.stolenTokenBox, tokenFlyStyle]}>
            <Ionicons name="server" size={32} color="#FF4A4A" />
            <Text style={styles.stolenTokenText}>-10 TOKENS</Text>
          </Animated.View>

          <Text style={styles.defeatTitle}>MATH BOSS DEFEATED YOU!</Text>
          <Text style={styles.defeatSub}>{challenge?.boss_name} devoured 10 of your tokens!</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultScoreText}>
              {score} / {challenge?.questions.length || 20} Correct
            </Text>
            <Text style={styles.resultMessage}>{bossMessage}</Text>
          </View>

          <View style={styles.actionBox}>
            <PrimaryButton
              label="TRY AGAIN NEXT TIME"
              onPress={() => onComplete(false, -10)}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: colors.error,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  warningText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  levelBadge: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelText: {
    color: colors.onBrandPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  contentCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  bossAvatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.brandPrimary,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  bossAvatarText: {
    fontSize: 64,
  },
  bossName: {
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  bossTitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  quoteCard: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.brandPrimary + "44",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  quoteText: {
    color: colors.onSurface,
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },
  rulesCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    gap: 10,
    marginBottom: 24,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  actionBox: {
    width: "100%",
  },
  battleContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.brandPrimary,
    borderRadius: 4,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerBadgeUrgent: {
    backgroundColor: colors.error + "20",
    borderColor: colors.error,
    borderWidth: 1,
  },
  timerText: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  timerTextUrgent: {
    color: colors.error,
  },
  miniBossBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    marginTop: 12,
  },
  miniBossAvatar: {
    fontSize: 24,
  },
  miniBossName: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
  scoreText: {
    color: colors.brandPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  questionCard: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.divider,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  questionPrompt: {
    color: colors.onSurface,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 1,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  optionBtn: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.divider,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBtnRight: {
    backgroundColor: colors.success + "30",
    borderColor: colors.success,
  },
  optionBtnWrong: {
    backgroundColor: colors.error + "30",
    borderColor: colors.error,
  },
  optionText: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "800",
  },
  optionTextHighlight: {
    color: colors.onSurface,
  },
  victoryTitle: {
    color: colors.success,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 10,
  },
  victorySub: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  defeatTitle: {
    color: colors.error,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 10,
  },
  defeatSub: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  stolenTokenBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  stolenTokenText: {
    color: colors.error,
    fontSize: 22,
    fontWeight: "900",
  },
  resultCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  resultScoreText: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "900",
  },
  resultMessage: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  rewardBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.brandPrimary + "15",
    borderColor: colors.brandPrimary,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rewardText: {
    color: colors.brandPrimary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
}));

