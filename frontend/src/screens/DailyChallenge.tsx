import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { DailyChallengeVideo, AnimationState } from "@/src/components/DailyChallengeVideo";

type Props = {
  onComplete: (score: number) => void;
  onBack: () => void;
};

type Question = {
  a: number;
  b: number;
  operator: "+" | "-";
  answer: number;
};

const DURATION_SECONDS = 60;
const MAX_WRONG_ALLOWED = 4;
const TARGET_WIN_SCORE = 10;

function createQuestion(): Question {
  const operator: "+" | "-" = Math.random() < 0.5 ? "+" : "-";

  let a = Math.floor(Math.random() * 50) + 1;
  let b = Math.floor(Math.random() * 50) + 1;

  // Keep subtraction answers non-negative.
  if (operator === "-" && b > a) {
    [a, b] = [b, a];
  }

  return {
    a,
    b,
    operator,
    answer: operator === "+" ? a + b : a - b,
  };
}

function createOptions(answer: number): number[] {
  const values = new Set<number>([answer]);

  while (values.size < 4) {
    const offset = Math.floor(Math.random() * 11) - 5;

    if (offset !== 0) {
      values.add(Math.max(0, answer + offset));
    }
  }

  return Array.from(values).sort(() => Math.random() - 0.5);
}

export default function DailyChallenge({ onComplete, onBack }: Props) {
  const [question, setQuestion] = useState<Question>(() => createQuestion());
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [gameStatus, setGameStatus] = useState<"playing" | "cinematic_win" | "cinematic_loss" | "won" | "lost">("playing");
  const [animationState, setAnimationState] = useState<AnimationState>("chase");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  const shakeTranslateX = useSharedValue(0);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    setOptions(createOptions(question.answer));
  }, [question]);

  // Timer Countdown
  useEffect(() => {
    if (gameStatus !== "playing") {
      return;
    }

    if (secondsLeft <= 0) {
      // If time runs out, evaluate win/loss based on score
      if (score >= 5) {
        handleWin(score);
      } else {
        handleLoss("Time's up! You couldn't outrun the snake.", score);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus, secondsLeft, score]);

  const timerText = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  const handleWin = (finalScore: number = score) => {
    // 1. Immediately hide questions & answers, switch video to Win (Boy jumping to other side of path)
    setGameStatus("cinematic_win");
    setAnimationState("win");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // 2. Play 5.2s of the full-screen cinematic video before revealing victory results
    setTimeout(() => {
      setGameStatus("won");
      onComplete(finalScore);
    }, 5200);
  };

  const handleLoss = (reason?: string, finalScore: number = score) => {
    // 1. Immediately hide questions & answers, switch video to Jail (Snake directing boy into jail)
    setGameStatus("cinematic_loss");
    setAnimationState("jail");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

    // 2. Play 5.2s of the full-screen cinematic video before revealing jail results
    setTimeout(() => {
      setGameStatus("lost");
    }, 5200);
  };

  const answerQuestion = (selected: number) => {
    if (gameStatus !== "playing" || selectedOption !== null) {
      return;
    }

    setSelectedOption(selected);
    const correct = selected === question.answer;
    setIsAnswerCorrect(correct);

    if (correct) {
      const nextScore = score + 1;
      setScore(nextScore);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Success animation on card
      cardScale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(1, { damping: 12 })
      );

      // Check win condition (Target score reached -> boy escapes)
      if (nextScore >= TARGET_WIN_SCORE) {
        setTimeout(() => {
          handleWin(nextScore);
        }, 300);
        return;
      }

      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswerCorrect(null);
        setQuestion(createQuestion());
      }, 400);
    } else {
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      // Screen shake animation on wrong answer
      shakeTranslateX.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );

      // If player gets 4 questions wrong -> Loss & Jail animation!
      if (nextWrong >= MAX_WRONG_ALLOWED) {
        setTimeout(() => {
          handleLoss("You got 4 questions wrong! The snake captured you.", score);
        }, 300);
        return;
      }

      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswerCorrect(null);
        setQuestion(createQuestion());
      }, 500);
    }
  };

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Milestone progress fraction (0 to 1)
  const progressRatio = Math.min(1, score / TARGET_WIN_SCORE);

  return (
    <View style={styles.root}>
      {/* Dynamic Animated Video Background: Chase, Win, or Jail */}
      <DailyChallengeVideo state={animationState} />

      <Animated.View style={[styles.container, shakeAnimatedStyle]}>
        {/* Top Navigation Bar matching Mockup */}
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Daily Challenge</Text>
          </View>

          <View style={styles.timer}>
            <Ionicons name="timer-outline" size={16} color="#FBBF24" />
            <Text style={styles.timerText}>{timerText}</Text>
          </View>
        </View>

        {gameStatus === "playing" && (
          <View style={styles.content}>
            {/* Subheader banner */}
            <View style={styles.instructionBanner}>
              <Text style={styles.eyebrow}>TODAY'S CHALLENGE</Text>
              <Text style={styles.instruction}>
                Solve as many as you can in 1 minute.
              </Text>
            </View>

            {/* Score box and Lives / Strikes */}
            <View style={styles.statsRow}>
              {/* Score Tile */}
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>SCORE</Text>
                <Text style={styles.score}>{score}</Text>
              </View>

              {/* Lives / Wrong Attempts Indicator */}
              <View style={styles.livesCard}>
                <Text style={styles.livesLabel}>WRONG ({wrongCount}/{MAX_WRONG_ALLOWED})</Text>
                <View style={styles.heartsRow}>
                  {Array.from({ length: MAX_WRONG_ALLOWED }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.heartDot,
                        i < wrongCount ? styles.heartDotLost : styles.heartDotActive,
                      ]}
                    >
                      <Ionicons
                        name={i < wrongCount ? "close" : "shield"}
                        size={12}
                        color={i < wrongCount ? "#EF4444" : "#10B981"}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Stone Question Card */}
            <Animated.View style={[styles.questionCard, cardAnimatedStyle]}>
              <Text style={styles.question}>
                {question.a} {question.operator} {question.b} = ?
              </Text>
            </Animated.View>

            {/* 2x2 Stone Option Buttons */}
            <View style={styles.options}>
              {options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrectOption = option === question.answer;

                let optionStyle: any = styles.option;
                let textStyle: any = styles.optionText;

                if (isSelected) {
                  if (isAnswerCorrect) {
                    optionStyle = [styles.option, styles.optionCorrect];
                    textStyle = [styles.optionText, styles.optionTextActive];
                  } else {
                    optionStyle = [styles.option, styles.optionWrong];
                    textStyle = [styles.optionText, styles.optionTextActive];
                  }
                } else if (selectedOption !== null && isCorrectOption && !isAnswerCorrect) {
                  // Show the correct answer in green on wrong attempt
                  optionStyle = [styles.option, styles.optionCorrect];
                }

                return (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [
                      optionStyle,
                      pressed && selectedOption === null && styles.optionPressed,
                    ]}
                    onPress={() => answerQuestion(option)}
                    disabled={selectedOption !== null}
                  >
                    <Text style={textStyle}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom Progress Track with Kid moving towards Finish Flag 🏁 */}
            <View style={styles.progressContainer}>
              <View style={styles.trackLine}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${Math.max(6, progressRatio * 100)}%` },
                  ]}
                />
              </View>

              {/* Stepping Checkpoints */}
              <View style={styles.checkpointsRow}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.checkpointDot,
                      score >= (i + 1) * 2 && styles.checkpointDotPassed,
                    ]}
                  />
                ))}
                <Text style={styles.flagIcon}>🏁</Text>
              </View>

              {/* Running avatar on track */}
              <View
                style={[
                  styles.avatarMarker,
                  { left: `${Math.min(88, Math.max(0, progressRatio * 88))}%` },
                ]}
              >
                <Text style={styles.avatarIcon}>🏃‍♂️</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cinematic Win View: Questions disappear, video of boy jumping across path plays full screen */}
        {gameStatus === "cinematic_win" && (
          <View style={styles.cinematicBannerContainer}>
            <View style={styles.cinematicBadgeWin}>
              <Text style={styles.cinematicBadgeText}>🏃‍♂️ Jumping across the path to safety...</Text>
            </View>
          </View>
        )}

        {/* Cinematic Loss View: Questions disappear, video of snake chasing boy into jail plays full screen */}
        {gameStatus === "cinematic_loss" && (
          <View style={styles.cinematicBannerContainer}>
            <View style={styles.cinematicBadgeLoss}>
              <Text style={styles.cinematicBadgeText}>🐍 Directed into the jail cell...</Text>
            </View>
          </View>
        )}

        {/* Win Screen Overlay (revealed after cinematic video) */}
        {gameStatus === "won" && (
          <View style={styles.resultContainer}>
            <View style={styles.resultCardWin}>
              <View style={styles.resultIconOrbWin}>
                <Text style={styles.resultEmoji}>🏆</Text>
              </View>

              <Text style={styles.resultBadgeWin}>VICTORY!</Text>
              <Text style={styles.resultTitle}>You Tricked the Snake!</Text>
              <Text style={styles.resultDesc}>
                You crossed the bridge safely and escaped into safety!
              </Text>

              <View style={styles.resultScoreBox}>
                <Text style={styles.resultScoreValue}>{score}</Text>
                <Text style={styles.resultScoreLabel}>CORRECT ANSWERS</Text>
              </View>

              <View style={styles.rewardPill}>
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.rewardText}>+5 Tokens Earned!</Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.continueBtnWin, pressed && { opacity: 0.85 }]}
                onPress={onBack}
              >
                <Text style={styles.continueBtnText}>Continue to Home →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Loss Screen Overlay */}
        {gameStatus === "lost" && (
          <View style={styles.resultContainer}>
            <View style={styles.resultCardLoss}>
              <View style={styles.resultIconOrbLoss}>
                <Text style={styles.resultEmoji}>⛓️</Text>
              </View>

              <Text style={styles.resultBadgeLoss}>CAPTURED!</Text>
              <Text style={styles.resultTitle}>Trapped in Jail!</Text>
              <Text style={styles.resultDesc}>
                {wrongCount >= MAX_WRONG_ALLOWED
                  ? "You got 4 questions wrong and the snake caught up with you."
                  : "Time ran out before you could escape the canyon."}
              </Text>

              <View style={styles.resultScoreBox}>
                <Text style={styles.resultScoreValue}>{score}</Text>
                <Text style={styles.resultScoreLabel}>QUESTIONS SOLVED</Text>
              </View>

              <View style={styles.retryRow}>
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    setScore(0);
                    setWrongCount(0);
                    setSecondsLeft(DURATION_SECONDS);
                    setGameStatus("playing");
                    setAnimationState("chase");
                    setSelectedOption(null);
                    setIsAnswerCorrect(null);
                    setQuestion(createQuestion());
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.backHomeBtn, pressed && { opacity: 0.85 }]}
                  onPress={onBack}
                >
                  <Text style={styles.backHomeBtnText}>Back</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070B16",
    position: "relative",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 46,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  // Header Bar
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(18, 24, 48, 0.82)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  backText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerTitleContainer: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(32, 22, 16, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FEF3C7",
    letterSpacing: 0.5,
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(28, 20, 10, 0.88)",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  timerText: {
    color: "#FDE68A",
    fontSize: 15,
    fontWeight: "900",
  },

  cinematicBannerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    zIndex: 20,
  },
  cinematicBadgeWin: {
    backgroundColor: "rgba(16, 185, 129, 0.92)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  cinematicBadgeLoss: {
    backgroundColor: "rgba(239, 68, 68, 0.92)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  cinematicBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  content: {
    flex: 1,
    justifyContent: "space-around",
    paddingVertical: 10,
    zIndex: 10,
  },

  // Instruction Banner
  instructionBanner: {
    alignItems: "center",
    backgroundColor: "rgba(15, 22, 42, 0.72)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#94A3B8",
  },
  instruction: {
    marginTop: 2,
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  scoreCard: {
    backgroundColor: "rgba(35, 26, 18, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.5)",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FCD34D",
    letterSpacing: 1,
  },
  score: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  livesCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.35)",
    alignItems: "center",
  },
  livesLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  heartsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  heartDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heartDotActive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  heartDotLost: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderWidth: 1,
    borderColor: "#EF4444",
  },

  // Stone Question Card
  questionCard: {
    width: "100%",
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "rgba(22, 28, 48, 0.92)",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.7)",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  question: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Stone Options (2x2 Grid)
  options: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  option: {
    width: "48%",
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: "rgba(26, 34, 56, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(96, 165, 250, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionPressed: {
    transform: [{ scale: 0.96 }],
  },
  optionCorrect: {
    backgroundColor: "rgba(6, 95, 70, 0.94)",
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.6,
  },
  optionWrong: {
    backgroundColor: "rgba(153, 27, 27, 0.94)",
    borderColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.6,
  },
  optionText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },

  // Milestone Progress Bar
  progressContainer: {
    width: "100%",
    height: 36,
    justifyContent: "center",
    position: "relative",
    marginTop: 4,
  },
  trackLine: {
    height: 8,
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderRadius: 99,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 99,
  },
  checkpointsRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  checkpointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(71, 85, 105, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  checkpointDotPassed: {
    backgroundColor: "#38BDF8",
    borderColor: "#FFFFFF",
  },
  flagIcon: {
    fontSize: 16,
  },
  avatarMarker: {
    position: "absolute",
    top: -2,
    zIndex: 20,
  },
  avatarIcon: {
    fontSize: 22,
  },

  // Win / Loss Overlays
  resultContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5, 8, 18, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 100,
  },
  resultCardWin: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    backgroundColor: "rgba(16, 24, 48, 0.95)",
    borderWidth: 2,
    borderColor: "#F59E0B",
    padding: 24,
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  resultCardLoss: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    backgroundColor: "rgba(24, 16, 24, 0.95)",
    borderWidth: 2,
    borderColor: "#EF4444",
    padding: 24,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  resultIconOrbWin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  resultIconOrbLoss: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  resultEmoji: {
    fontSize: 32,
  },
  resultBadgeWin: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#FBBF24",
  },
  resultBadgeLoss: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#F87171",
  },
  resultTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  resultDesc: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  resultScoreBox: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: "rgba(10, 14, 28, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  resultScoreValue: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  resultScoreLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  rewardText: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "900",
  },
  continueBtnWin: {
    marginTop: 20,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    color: "#1E1B4B",
    fontSize: 15,
    fontWeight: "900",
  },
  retryRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 20,
  },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: "#EF4444",
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  backHomeBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeBtnText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "800",
  },
});