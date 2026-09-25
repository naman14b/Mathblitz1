/**
 * MathBlitz Kingdom - Journey Play Screen
 * Features 3-Lives mechanic, competitive timers, and "Watch Ad to Revive (+30s & +1 Life)" second chance recovery.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { JourneyLevelDef, JourneyQuestion, LevelResultData } from "../game/journey/types";
import { getLevelDef, getWorldForLevel } from "../game/journey/worlds";
import { JourneyQuestionEngine } from "../game/journey/questionEngine";
import { submitLocalLevelResult } from "../game/journey/storage";
import { JourneyLevelCompleteModal } from "./JourneyLevelCompleteModal";
import { playSound } from "@/src/game/sounds";
import { LocalProfile } from "@/src/game/types";
import { getLevelImage } from "@/src/game/levelAssets";
import { showRewardedAd } from "@/src/services/ads";

interface JourneyPlayScreenProps {
  levelId: number;
  profile: LocalProfile;
  onUpdateProfile: (updater: (prev: LocalProfile) => LocalProfile) => void;
  onBackToMap: () => void;
  onNavigateToLevel: (nextLevelId: number) => void;
}

export function JourneyPlayScreen({
  levelId,
  profile,
  onUpdateProfile,
  onBackToMap,
  onNavigateToLevel,
}: JourneyPlayScreenProps) {
  const insets = useSafeAreaInsets();
  const levelDef = getLevelDef(levelId);
  const world = getWorldForLevel(levelId);
  const isBoss = levelDef.levelType === "boss";
  const levelThemeImage = getLevelImage(levelDef.id);

  const [questions, setQuestions] = useState<JourneyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(levelDef.timeLimitSeconds);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [resultData, setResultData] = useState<LevelResultData | null>(null);
  const [bossDialogue, setBossDialogue] = useState(
    isBoss && levelDef.boss ? levelDef.boss.introDialogue : ""
  );

  // Revive & Ad Watch state
  const [showReviveModal, setShowReviveModal] = useState(false);
  const [reviveReason, setReviveReason] = useState<"timeout" | "lives">("timeout");
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [hasUsedRevive, setHasUsedRevive] = useState(false);

  // Synchronized refs to eliminate race conditions and stale closures
  const correctCountRef = useRef(0);
  const scoreRef = useRef(0);
  const timeTakenRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const isGameOverRef = useRef(false);
  const hasUsedReviveRef = useRef(false);

  // Boss health tracker
  const [bossHealth, setBossHealth] = useState(levelDef.questionCount);

  const timerRef = useRef<any>(null);

  const handleRestartLevel = useCallback(() => {
    const generated = JourneyQuestionEngine.generateQuestionsForLevel(levelId);
    setQuestions(generated);
    setCurrentIndex(0);
    setCorrectCount(0);
    setScore(0);
    setCombo(0);
    setLives(3);
    setTimeRemaining(levelDef.timeLimitSeconds);
    setTimeTaken(0);
    setIsGameOver(false);
    setResultData(null);
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setBossHealth(generated.length);
    setShowReviveModal(false);
    setIsLoadingAd(false);
    setHasUsedRevive(false);

    correctCountRef.current = 0;
    scoreRef.current = 0;
    timeTakenRef.current = 0;
    comboRef.current = 0;
    livesRef.current = 3;
    isGameOverRef.current = false;
    hasUsedReviveRef.current = false;
  }, [levelId, levelDef.timeLimitSeconds]);

  // Initialize questions on level change
  useEffect(() => {
    handleRestartLevel();
  }, [levelId, handleRestartLevel]);

  const handleFinishLevel = useCallback(
    async (finalCorrect?: number, finalScore?: number, finalTime?: number) => {
      if (isGameOverRef.current) return;
      isGameOverRef.current = true;
      setIsGameOver(true);
      setShowReviveModal(false);
      setIsLoadingAd(false);
      if (timerRef.current) clearInterval(timerRef.current);

      const resolvedCorrect = typeof finalCorrect === "number" ? finalCorrect : correctCountRef.current;
      const resolvedScore = typeof finalScore === "number" ? finalScore : scoreRef.current;
      const resolvedTime = typeof finalTime === "number" ? finalTime : timeTakenRef.current;

      const playerId = profile.playerName || "player_local";
      const { resultData: res, xpDelta, tokensDelta } = await submitLocalLevelResult(playerId, {
        levelId,
        score: resolvedScore,
        correctAnswers: resolvedCorrect,
        totalQuestions: questions.length,
        timeTakenSeconds: resolvedTime,
      });

      setResultData(res);

      // Apply tokens and XP delta to profile
      if (xpDelta > 0 || tokensDelta > 0) {
        onUpdateProfile((prev) => ({
          ...prev,
          totalXp: prev.totalXp + xpDelta,
          tokens: prev.tokens + tokensDelta,
        }));
      }
    },
    [profile.playerName, levelId, questions.length, onUpdateProfile]
  );

  // Trigger Revive Modal or Level End
  const handleTriggerDefeatOrRevive = useCallback(
    (reason: "timeout" | "lives") => {
      if (timerRef.current) clearInterval(timerRef.current);

      if (!hasUsedReviveRef.current) {
        setReviveReason(reason);
        setShowReviveModal(true);
      } else {
        handleFinishLevel();
      }
    },
    [handleFinishLevel]
  );

  // Main countdown timer
  useEffect(() => {
    if (isGameOver || showReviveModal || isLoadingAd || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTriggerDefeatOrRevive("timeout");
          return 0;
        }
        return prev - 1;
      });
      setTimeTaken((prev) => {
        const next = prev + 1;
        timeTakenRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, showReviveModal, isLoadingAd, questions.length, handleTriggerDefeatOrRevive]);

  // Handle Watch Ad to Continue with +30 Seconds
  const handleStartWatchAd = async () => {
    if (isLoadingAd || hasUsedReviveRef.current) return;
    setIsLoadingAd(true);

    try {
      let rewardEarned = false;
      const success = await showRewardedAd(() => {
        rewardEarned = true;
      });

      if (success && rewardEarned) {
        // Anti-abuse: Allowed only ONCE per level attempt
        hasUsedReviveRef.current = true;
        setHasUsedRevive(true);
        setShowReviveModal(false);

        // Exactly 30 additional seconds
        setTimeRemaining((prev) => prev + 30);

        // If level failed from running out of lives, grant 1 life buffer back so player can continue
        if (livesRef.current <= 0) {
          livesRef.current = 1;
          setLives(1);
        }

        setIsAnswered(false);
        setSelectedChoiceId(null);
        playSound("levelup");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        // If player closes, skips, fails to load, fails to show, or no EARNED_REWARD:
        // Give NO extra time, do NOT resume the level, leave failure state intact.
      }
    } catch (err) {
      console.log("[Kingdom] Rewarded ad continue exception:", err);
    } finally {
      setIsLoadingAd(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleSelectChoice = (choiceId: string, choiceValue: string | number) => {
    if (isAnswered || isGameOver || showReviveModal || isLoadingAd || !currentQ) return;

    setSelectedChoiceId(choiceId);
    setIsAnswered(true);

    const isCorrect = String(choiceValue) === String(currentQ.correctAnswer);
    let nextCorrect = correctCountRef.current;
    let nextScore = scoreRef.current;
    let nextCombo = comboRef.current;

    if (isCorrect) {
      playSound("correct");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      nextCorrect += 1;
      nextCombo += 1;
      const pointsEarned = 100 + nextCombo * 20;
      nextScore += pointsEarned;

      correctCountRef.current = nextCorrect;
      comboRef.current = nextCombo;
      scoreRef.current = nextScore;

      setCorrectCount(nextCorrect);
      setCombo(nextCombo);
      setScore(nextScore);

      if (isBoss) {
        setBossHealth((bh) => Math.max(0, bh - 1));
        setBossDialogue("Arrgh! That calculation was sharp!");
      }

      // Move to next question after delay
      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex((i) => i + 1);
          setSelectedChoiceId(null);
          setIsAnswered(false);
        } else {
          handleFinishLevel(nextCorrect, nextScore, timeTakenRef.current);
        }
      }, 700);
    } else {
      playSound("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      nextCombo = 0;
      comboRef.current = 0;
      setCombo(0);

      const nextLives = Math.max(0, livesRef.current - 1);
      livesRef.current = nextLives;
      setLives(nextLives);

      if (isBoss) {
        setBossDialogue("Ha! The Guardian's math remains unyielding!");
      }

      if (nextLives <= 0) {
        setTimeout(() => {
          handleTriggerDefeatOrRevive("lives");
        }, 600);
      } else {
        // Move to next question after short delay
        setTimeout(() => {
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((i) => i + 1);
            setSelectedChoiceId(null);
            setIsAnswered(false);
          } else {
            handleFinishLevel(nextCorrect, nextScore, timeTakenRef.current);
          }
        }, 700);
      }
    }
  };

  if (!currentQ && !isGameOver) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading Kingdom Level...</Text>
      </View>
    );
  }

  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const timePercent = (timeRemaining / levelDef.timeLimitSeconds) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Level Theme Artwork Background */}
      <Image
        source={levelThemeImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.darkBackdropOverlay} />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={onBackToMap} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </Pressable>

        <View style={styles.levelInfo}>
          <Text style={styles.realmLabel}>{world.name.toUpperCase()}</Text>
          <Text style={styles.levelTitleText}>Level {levelDef.id}: {levelDef.title}</Text>
        </View>

        {/* Lives & Score Group */}
        <View style={styles.headerRightGroup}>
          {/* 3 Lives Hearts */}
          <View style={styles.livesBadge}>
            {[1, 2, 3].map((heartIndex) => (
              <Text
                key={heartIndex}
                style={[
                  styles.heartIcon,
                  heartIndex > lives && styles.heartLost,
                ]}
              >
                {heartIndex <= lives ? "❤️" : "🖤"}
              </Text>
            ))}
          </View>

          <View style={styles.scoreBadge}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${Math.min(100, Math.max(0, timePercent))}%`,
              backgroundColor: timeRemaining < 10 ? "#EF4444" : "#F59E0B",
            },
          ]}
        />
      </View>

      {/* Boss Encounter Header Card (if boss level) */}
      {isBoss && levelDef.boss && (
        <View style={styles.bossCard}>
          <View style={styles.bossAvatarBubble}>
            <Text style={styles.bossAvatarText}>{levelDef.boss.avatar}</Text>
          </View>
          <View style={styles.bossInfoCol}>
            <View style={styles.bossNameRow}>
              <Text style={styles.bossName}>{levelDef.boss.name}</Text>
              <Text style={styles.bossHealthText}>Resolve: {bossHealth}/{questions.length}</Text>
            </View>
            <Text style={styles.bossDialogueText} numberOfLines={2}>
              "{bossDialogue}"
            </Text>
          </View>
        </View>
      )}

      {/* Progress & Combo */}
      <View style={styles.subHeaderRow}>
        <Text style={styles.questionIndexText}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        {combo > 1 && (
          <View style={styles.comboPill}>
            <Text style={styles.comboText}>🔥 {combo}x COMBO</Text>
          </View>
        )}
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionPrompt}>{currentQ?.prompt}</Text>
        {currentQ?.explanation && isAnswered && (
          <Text style={styles.hintText}>{currentQ.explanation}</Text>
        )}
      </View>

      {/* Choices Grid */}
      <View style={styles.choicesGrid}>
        {currentQ?.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isCorrectChoice = String(choice.value) === String(currentQ.correctAnswer);

          let btnBg = "rgba(30, 41, 59, 0.92)";
          let btnBorder = "rgba(71, 85, 105, 0.6)";

          if (isAnswered) {
            if (isCorrectChoice) {
              btnBg = "rgba(16, 185, 129, 0.95)";
              btnBorder = "#34D399";
            } else if (isSelected) {
              btnBg = "rgba(239, 68, 68, 0.95)";
              btnBorder = "#F87171";
            }
          } else if (isSelected) {
            btnBg = "#3B82F6";
            btnBorder = "#60A5FA";
          }

          return (
            <Pressable
              key={choice.id}
              disabled={isAnswered}
              onPress={() => handleSelectChoice(choice.id, choice.value)}
              style={({ pressed }) => [
                styles.choiceBtn,
                {
                  backgroundColor: btnBg,
                  borderColor: btnBorder,
                  transform: [{ scale: pressed && !isAnswered ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={styles.choiceText}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom Progress Tracker */}
      <View style={styles.bottomBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Second Chance Revive Modal (+30s) */}
      <Modal visible={showReviveModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.reviveCard}>
            <Text style={styles.reviveEmoji}>
              {reviveReason === "timeout" ? "⏳" : "💔"}
            </Text>
            <Text style={styles.reviveTitle}>
              {reviveReason === "timeout" ? "OUT OF TIME!" : "NO LIVES REMAINING!"}
            </Text>
            <Text style={styles.reviveSubtitle}>
              Need another chance?{"\n"}Watch an ad to get +30 seconds
            </Text>

            <View style={styles.rewardBanner}>
              <Text style={styles.rewardBannerText}>🎁 REWARD: +30 SECONDS</Text>
            </View>

            <Pressable
              onPress={handleStartWatchAd}
              disabled={isLoadingAd}
              style={({ pressed }) => [
                styles.watchAdBtn,
                isLoadingAd && { opacity: 0.6 },
                pressed && { opacity: 0.85 },
              ]}
            >
              {isLoadingAd ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.watchAdBtnText}>Watch Ad +30s</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setShowReviveModal(false);
                handleFinishLevel();
              }}
              disabled={isLoadingAd}
              style={styles.giveUpBtn}
            >
              <Text style={styles.giveUpBtnText}>Give Up</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Victory / Defeat Modal */}
      <JourneyLevelCompleteModal
        visible={isGameOver && resultData !== null}
        result={resultData}
        onNextLevel={() => onNavigateToLevel(levelId + 1)}
        onReplay={handleRestartLevel}
        onBackToMap={onBackToMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#022C22",
    justifyContent: "space-between",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.92,
  },
  darkBackdropOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  levelInfo: {
    alignItems: "center",
  },
  realmLabel: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  levelTitleText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    gap: 2,
  },
  heartIcon: {
    fontSize: 12,
  },
  heartLost: {
    opacity: 0.3,
  },
  scoreBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
  },
  scoreValue: {
    color: "#FBBF24",
    fontSize: 14,
    fontWeight: "900",
  },
  timerTrack: {
    height: 5,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    width: "100%",
  },
  timerFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  bossCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  bossAvatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bossAvatarText: {
    fontSize: 26,
  },
  bossInfoCol: {
    flex: 1,
  },
  bossNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bossName: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "900",
  },
  bossHealthText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  bossDialogueText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 3,
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 2,
  },
  questionIndexText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  comboPill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  comboText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "900",
  },
  questionCard: {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    marginHorizontal: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  questionPrompt: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  hintText: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },
  choicesGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 2,
  },
  choiceBtn: {
    width: "48%",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  choiceText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  reviveCard: {
    backgroundColor: "#0F172A",
    borderColor: "#F59E0B",
    borderWidth: 2,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  reviveEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  reviveTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  reviveSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  rewardBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  rewardBannerText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  watchAdBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  watchAdBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  giveUpBtn: {
    paddingVertical: 12,
    marginTop: 8,
  },
  giveUpBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
});
