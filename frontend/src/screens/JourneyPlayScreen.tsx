/**
 * MathBlitz Kingdom - Journey Play Screen
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { JourneyLevelDef, JourneyQuestion, LevelResultData } from "../game/journey/types";
import { getLevelDef, getWorldForLevel } from "../game/journey/worlds";
import { JourneyQuestionEngine } from "../game/journey/questionEngine";
import { submitLocalLevelResult } from "../game/journey/storage";
import { JourneyLevelCompleteModal } from "./JourneyLevelCompleteModal";
import { playSound } from "@/src/game/sounds";
import { LocalProfile } from "@/src/game/types";

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

  const [questions, setQuestions] = useState<JourneyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(levelDef.timeLimitSeconds);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [resultData, setResultData] = useState<LevelResultData | null>(null);
  const [bossDialogue, setBossDialogue] = useState(
    isBoss && levelDef.boss ? levelDef.boss.introDialogue : ""
  );

  // Boss health tracker
  const [bossHealth, setBossHealth] = useState(levelDef.questionCount);

  const timerRef = useRef<any>(null);

  // Initialize questions
  useEffect(() => {
    const generated = JourneyQuestionEngine.generateQuestionsForLevel(levelId);
    setQuestions(generated);
    setCurrentIndex(0);
    setCorrectCount(0);
    setScore(0);
    setCombo(0);
    setTimeRemaining(levelDef.timeLimitSeconds);
    setTimeTaken(0);
    setIsGameOver(false);
    setResultData(null);
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setBossHealth(generated.length);
  }, [levelId]);

  // Main countdown timer
  useEffect(() => {
    if (isGameOver || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinishLevel();
          return 0;
        }
        return prev - 1;
      });
      setTimeTaken((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, questions.length]);

  const currentQ = questions[currentIndex];

  const handleFinishLevel = useCallback(async () => {
    if (isGameOver) return;
    setIsGameOver(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const playerId = profile.playerName || "player_local";
    const { resultData: res, xpDelta, tokensDelta } = await submitLocalLevelResult(playerId, {
      levelId,
      score,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      timeTakenSeconds: timeTaken,
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
  }, [isGameOver, profile.playerName, levelId, score, correctCount, questions.length, timeTaken, onUpdateProfile]);

  const handleSelectChoice = (choiceId: string, choiceValue: string | number) => {
    if (isAnswered || isGameOver || !currentQ) return;

    setSelectedChoiceId(choiceId);
    setIsAnswered(true);

    const isCorrect = String(choiceValue) === String(currentQ.correctAnswer);

    if (isCorrect) {
      playSound("correct");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const nextCorrect = correctCount + 1;
      const nextCombo = combo + 1;
      const pointsEarned = 100 + nextCombo * 20;

      setCorrectCount(nextCorrect);
      setCombo(nextCombo);
      setScore((s) => s + pointsEarned);

      if (isBoss) {
        setBossHealth((bh) => Math.max(0, bh - 1));
        setBossDialogue("Arrgh! That calculation was sharp!");
      }
    } else {
      playSound("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setCombo(0);
      if (isBoss) {
        setBossDialogue("Ha! The Guardian's math remains unyielding!");
      }
    }

    // Move to next question after 900ms delay
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedChoiceId(null);
        setIsAnswered(false);
      } else {
        handleFinishLevel();
      }
    }, 850);
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
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={onBackToMap} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </Pressable>

        <View style={styles.levelInfo}>
          <Text style={styles.realmLabel}>{world.name.toUpperCase()}</Text>
          <Text style={styles.levelTitleText}>Level {levelDef.id}: {levelDef.title}</Text>
        </View>

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${timePercent}%`,
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

      {/* Main Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.conceptBadge}>{currentQ?.concept.replace(/_/g, " ").toUpperCase()}</Text>
        <Text style={styles.promptText}>{currentQ?.prompt}</Text>
      </View>

      {/* Answer Choices Grid */}
      <View style={styles.choicesGrid}>
        {currentQ?.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isCorrectChoice = String(choice.value) === String(currentQ.correctAnswer);

          let btnBg = "#1E293B";
          let btnBorder = "#334155";
          let textColor = "#F8FAFC";

          if (isAnswered) {
            if (isCorrectChoice) {
              btnBg = "#065F46";
              btnBorder = "#10B981";
              textColor = "#D1FAE5";
            } else if (isSelected) {
              btnBg = "#7F1D1D";
              btnBorder = "#EF4444";
              textColor = "#FEE2E2";
            }
          }

          return (
            <Pressable
              key={choice.id}
              onPress={() => handleSelectChoice(choice.id, choice.value)}
              disabled={isAnswered}
              style={({ pressed }) => [
                styles.choiceBtn,
                {
                  backgroundColor: btnBg,
                  borderColor: btnBorder,
                  transform: [{ scale: pressed && !isAnswered ? 0.96 : 1 }],
                },
              ]}
            >
              <Text style={[styles.choiceText, { color: textColor }]}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Level Complete / Results Modal */}
      <JourneyLevelCompleteModal
        visible={isGameOver && resultData !== null}
        result={resultData}
        onNextLevel={() => onNavigateToLevel(levelId + 1)}
        onReplay={() => {
          setIsGameOver(false);
          setResultData(null);
          const generated = JourneyQuestionEngine.generateQuestionsForLevel(levelId);
          setQuestions(generated);
          setCurrentIndex(0);
          setCorrectCount(0);
          setScore(0);
          setCombo(0);
          setTimeRemaining(levelDef.timeLimitSeconds);
          setTimeTaken(0);
          setSelectedChoiceId(null);
          setIsAnswered(false);
          setBossHealth(generated.length);
        }}
        onBackToMap={onBackToMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  levelInfo: {
    alignItems: "center",
  },
  realmLabel: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  levelTitleText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreBadge: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },
  scoreValue: {
    color: "#FBBF24",
    fontSize: 14,
    fontWeight: "800",
  },
  timerTrack: {
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 8,
  },
  timerFill: {
    height: "100%",
    borderRadius: 3,
  },
  bossCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderColor: "#EF4444",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    marginVertical: 8,
    gap: 10,
  },
  bossAvatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7F1D1D",
    alignItems: "center",
    justifyContent: "center",
  },
  bossAvatarText: {
    fontSize: 24,
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
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
  },
  bossHealthText: {
    color: "#F87171",
    fontSize: 11,
    fontWeight: "700",
  },
  bossDialogueText: {
    color: "#FCD34D",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  questionIndexText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  comboPill: {
    backgroundColor: "#78350F",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comboText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
  },
  questionCard: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  conceptBadge: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  promptText: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  choiceBtn: {
    width: "48%",
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  choiceText: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
