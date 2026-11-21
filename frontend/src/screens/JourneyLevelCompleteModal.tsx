/**
 * FunGanit Kingdom - Level Complete & World Victory Modal with Interactive Review
 */

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { JourneyAnswerRecord, JourneyQuestion, LevelResultData } from "../game/journey/types";
import { getWorldForLevel, getLevelDef } from "../game/journey/worlds";
import { playSound } from "@/src/game/sounds";

interface JourneyLevelCompleteModalProps {
  visible: boolean;
  result: LevelResultData | null;
  questions?: JourneyQuestion[];
  answerRecords?: JourneyAnswerRecord[];
  onNextLevel: () => void;
  onReplay: () => void;
  onBackToMap: () => void;
}

export function JourneyLevelCompleteModal({
  visible,
  result,
  questions = [],
  answerRecords = [],
  onNextLevel,
  onReplay,
  onBackToMap,
}: JourneyLevelCompleteModalProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Animated star scales
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);
  const cardScale = useSharedValue(0.8);

  const animatedStar1 = useAnimatedStyle(() => ({ transform: [{ scale: star1Scale.value }] }));
  const animatedStar2 = useAnimatedStyle(() => ({ transform: [{ scale: star2Scale.value }] }));
  const animatedStar3 = useAnimatedStyle(() => ({ transform: [{ scale: star3Scale.value }] }));
  const animatedCard = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  useEffect(() => {
    if (visible && result) {
      setIsReviewOpen(false);
      cardScale.value = withSpring(1, { damping: 12 });
      if (result.completed) {
        playSound("levelup");
        const stars = typeof result.stars === "number" ? result.stars : 0;
        if (stars >= 1) star1Scale.value = withDelay(200, withSpring(1.2, { damping: 8 }));
        if (stars >= 2) star2Scale.value = withDelay(500, withSpring(1.2, { damping: 8 }));
        if (stars >= 3) star3Scale.value = withDelay(800, withSpring(1.2, { damping: 8 }));
      } else {
        playSound("wrong");
      }
    } else {
      star1Scale.value = 0;
      star2Scale.value = 0;
      star3Scale.value = 0;
      cardScale.value = 0.8;
      setIsReviewOpen(false);
    }
  }, [visible, result]);

  if (!visible || !result) return null;

  const safeLevelId = typeof result.levelId === "number" ? result.levelId : 1;
  let levelDef;
  let world;
  try {
    levelDef = getLevelDef(safeLevelId);
    world = getWorldForLevel(safeLevelId);
  } catch (err) {
    console.error("[JourneyLevelCompleteModal] Error resolving level or world:", err);
    levelDef = { id: safeLevelId, title: `Level ${safeLevelId}`, levelType: "mixed" as const };
    world = { id: 1, name: "Number Plains" };
  }
  const isBoss = levelDef.levelType === "boss";

  const safeStars = typeof result.stars === "number" && !isNaN(result.stars) ? result.stars : 0;
  const safeScore = typeof result.score === "number" && !isNaN(result.score) ? result.score : 0;
  const safeAccuracy = typeof result.accuracy === "number" && !isNaN(result.accuracy) ? result.accuracy : 0;
  const safeCompleted = Boolean(result.completed);
  const safeTimeTaken = typeof result.timeTakenSeconds === "number" && !isNaN(result.timeTakenSeconds) ? result.timeTakenSeconds : 0;
  const safeXpEarned = typeof result.xpEarned === "number" && !isNaN(result.xpEarned) ? result.xpEarned : 0;
  const safeTokensEarned = typeof result.tokensEarned === "number" && !isNaN(result.tokensEarned) ? result.tokensEarned : 0;
  const safeCorrectAnswers = typeof result.correctAnswers === "number" && !isNaN(result.correctAnswers) ? result.correctAnswers : 0;
  const safeTotalQuestions = typeof result.totalQuestions === "number" && !isNaN(result.totalQuestions) ? result.totalQuestions : 5;
  const safeUnlockedNextWorld = Boolean(result.unlockedNextWorld);

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const safeAnswerRecords = Array.isArray(answerRecords) ? answerRecords : [];

  // Assemble full question list for review
  const reviewItems = safeQuestions
    .filter((q) => q && typeof q === "object")
    .map((q, idx) => {
      const record = safeAnswerRecords.find((r) => r && r.questionId === q.id) || safeAnswerRecords[idx];
      return {
        index: idx + 1,
        question: q,
        record,
      };
    });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {!isReviewOpen ? (
          /* ── Summary View ── */
          <Animated.View style={[styles.card, animatedCard]}>
            {/* Header Trophy / Outcome */}
            <View style={styles.header}>
              <Text style={styles.outcomeEmoji}>
                {safeCompleted ? (isBoss ? "👑" : "🏆") : "💔"}
              </Text>
              <Text style={styles.title}>
                {safeCompleted
                  ? isBoss
                    ? `${world.name.toUpperCase()} CONQUERED!`
                    : "LEVEL COMPLETE!"
                  : "LEVEL FAILED"}
              </Text>
              <Text style={styles.subtitle}>
                Level {safeLevelId} • {levelDef.title}
              </Text>
            </View>

            {/* Stars Row */}
            {safeCompleted ? (
              <View style={styles.starsContainer}>
                <Animated.View style={[styles.starBox, animatedStar1]}>
                  <Ionicons
                    name={safeStars >= 1 ? "star" : "star-outline"}
                    size={36}
                    color={safeStars >= 1 ? "#F59E0B" : "#4B5563"}
                  />
                </Animated.View>
                <Animated.View style={[styles.starBox, styles.starCenter, animatedStar2]}>
                  <Ionicons
                    name={safeStars >= 2 ? "star" : "star-outline"}
                    size={46}
                    color={safeStars >= 2 ? "#F59E0B" : "#4B5563"}
                  />
                </Animated.View>
                <Animated.View style={[styles.starBox, animatedStar3]}>
                  <Ionicons
                    name={safeStars >= 3 ? "star" : "star-outline"}
                    size={36}
                    color={safeStars >= 3 ? "#F59E0B" : "#4B5563"}
                  />
                </Animated.View>
              </View>
            ) : (
              <Text style={styles.tryAgainText}>
                You need at least 75% accuracy to clear this level. Try again!
              </Text>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>SCORE</Text>
                <Text style={styles.statValue}>{safeScore}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>ACCURACY</Text>
                <Text style={styles.statValue}>{Math.round(safeAccuracy * 100)}%</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>TIME</Text>
                <Text style={styles.statValue}>{safeTimeTaken}s</Text>
              </View>
            </View>

            {/* Rewards Pill */}
            {safeCompleted && (
              <View style={styles.rewardPill}>
                <Text style={styles.rewardXp}>+{safeXpEarned} XP</Text>
                {safeTokensEarned > 0 && (
                  <Text style={styles.rewardTokens}>🪙 +{safeTokensEarned} Tokens</Text>
                )}
              </View>
            )}

            {/* Next World Unlocked Banner */}
            {safeUnlockedNextWorld && (
              <View style={styles.worldUnlockedBanner}>
                <Text style={styles.worldUnlockedTitle}>🎉 NEW WORLD UNLOCKED!</Text>
                <Text style={styles.worldUnlockedSub}>
                  The gates to the next mathematical realm are open!
                </Text>
              </View>
            )}

            {/* Review Button */}
            <Pressable
              onPress={() => {
                playSound("tick");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setIsReviewOpen(true);
              }}
              style={({ pressed }) => [
                styles.reviewTriggerBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.reviewBtnIconWrap}>
                <Ionicons name="clipboard-outline" size={18} color="#38BDF8" />
              </View>
              <View style={styles.reviewBtnTextCol}>
                <Text style={styles.reviewTriggerTitle}>Review Answers</Text>
                <Text style={styles.reviewTriggerSub}>
                  {safeCorrectAnswers}/{safeTotalQuestions} Correct • Check what you pressed
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
            </Pressable>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable onPress={onBackToMap} style={styles.secondaryBtn}>
                <Ionicons name="map" size={18} color="#9CA3AF" />
                <Text style={styles.secondaryBtnText}>Map</Text>
              </Pressable>

              <Pressable onPress={onReplay} style={styles.secondaryBtn}>
                <Ionicons name="refresh" size={18} color="#9CA3AF" />
                <Text style={styles.secondaryBtnText}>Play Again</Text>
              </Pressable>

              {safeCompleted && (
                <Pressable onPress={onNextLevel} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Next Level</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </Animated.View>
        ) : (
          /* ── Dedicated Review View ── */
          <View style={styles.reviewCard}>
            {/* Review Header */}
            <View style={styles.reviewHeader}>
              <Pressable
                onPress={() => {
                  playSound("tick");
                  setIsReviewOpen(false);
                }}
                style={styles.reviewBackBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
                <Text style={styles.reviewBackText}>Summary</Text>
              </Pressable>

              <View style={styles.reviewTitleBlock}>
                <Text style={styles.reviewTitle}>Level {safeLevelId} Review</Text>
                <Text style={styles.reviewSubtitle}>
                  {safeCorrectAnswers} of {safeTotalQuestions} questions correct ({Math.round(safeAccuracy * 100)}%)
                </Text>
              </View>

              <View
                style={[
                  styles.reviewAccuracyBadge,
                  {
                    backgroundColor:
                      safeAccuracy >= 0.75
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(239, 68, 68, 0.2)",
                    borderColor: safeAccuracy >= 0.75 ? "#10B981" : "#EF4444",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reviewAccuracyBadgeText,
                    { color: safeAccuracy >= 0.75 ? "#34D399" : "#F87171" },
                  ]}
                >
                  {safeCompleted ? "CLEARED" : "FAILED"}
                </Text>
              </View>
            </View>

            {/* Questions Review ScrollView */}
            <ScrollView
              style={styles.reviewScrollView}
              contentContainerStyle={styles.reviewScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {reviewItems.map((item) => {
                const isAnswered = Boolean(item.record);
                const isCorrect = Boolean(item.record?.isCorrect);

                return (
                  <View key={item.question.id} style={styles.questionReviewBox}>
                    {/* Top Row: Question number & status pill */}
                    <View style={styles.qReviewTopRow}>
                      <Text style={styles.qReviewIndex}>
                        Question {item.index} of {reviewItems.length}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          isAnswered
                            ? isCorrect
                              ? styles.statusPillCorrect
                              : styles.statusPillWrong
                            : styles.statusPillSkipped,
                        ]}
                      >
                        <Ionicons
                          name={
                            isAnswered
                              ? isCorrect
                                ? "checkmark-circle"
                                : "close-circle"
                              : "time-outline"
                          }
                          size={14}
                          color={
                            isAnswered
                              ? isCorrect
                                ? "#34D399"
                                : "#F87171"
                              : "#FBBF24"
                          }
                        />
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color: isAnswered
                                ? isCorrect
                                  ? "#34D399"
                                  : "#F87171"
                                : "#FBBF24",
                            },
                          ]}
                        >
                          {isAnswered
                            ? isCorrect
                              ? "Correct"
                              : "Incorrect"
                            : "Not Answered"}
                        </Text>
                      </View>
                    </View>

                    {/* Question Prompt */}
                    <Text style={styles.qPromptText}>{item.question.prompt}</Text>

                    {/* Choices Review */}
                    <View style={styles.choicesReviewGrid}>
                      {(item.question?.choices || []).map((choice) => {
                        const isUserChoice =
                          isAnswered &&
                          (item.record?.selectedChoiceId === choice.id ||
                            String(item.record?.selectedValue) === String(choice.value));
                        const isCorrectAnswer =
                          String(choice.value) === String(item.question.correctAnswer);

                        let cardBg = "#0F172A";
                        let borderColor = "#334155";
                        let textColor = "#CBD5E1";
                        let tagText: string | null = null;
                        let tagBg = "transparent";
                        let tagColor = "#94A3B8";

                        if (isUserChoice && isCorrectAnswer) {
                          // Player pressed this choice and it was correct!
                          cardBg = "rgba(16, 185, 129, 0.22)";
                          borderColor = "#10B981";
                          textColor = "#6EE7B7";
                          tagText = "Your Choice ✓";
                          tagBg = "rgba(16, 185, 129, 0.35)";
                          tagColor = "#34D399";
                        } else if (isUserChoice && !isCorrectAnswer) {
                          // Player pressed this choice and it was wrong!
                          cardBg = "rgba(239, 68, 68, 0.22)";
                          borderColor = "#EF4444";
                          textColor = "#FCA5A5";
                          tagText = "Your Choice ✗";
                          tagBg = "rgba(239, 68, 68, 0.35)";
                          tagColor = "#F87171";
                        } else if (isCorrectAnswer) {
                          // The correct answer that player didn't pick
                          cardBg = "rgba(16, 185, 129, 0.1)";
                          borderColor = "#10B981";
                          textColor = "#6EE7B7";
                          tagText = "Correct Answer ✓";
                          tagBg = "rgba(16, 185, 129, 0.25)";
                          tagColor = "#34D399";
                        }

                        return (
                          <View
                            key={choice.id}
                            style={[
                              styles.choiceReviewTile,
                              {
                                backgroundColor: cardBg,
                                borderColor: borderColor,
                                borderWidth: isUserChoice || isCorrectAnswer ? 1.5 : 1,
                              },
                            ]}
                          >
                            <View style={styles.choiceTileContent}>
                              <Ionicons
                                name={
                                  isUserChoice
                                    ? isCorrectAnswer
                                      ? "checkmark-circle"
                                      : "close-circle"
                                    : isCorrectAnswer
                                    ? "checkmark-circle-outline"
                                    : "radio-button-off-outline"
                                }
                                size={18}
                                color={
                                  isUserChoice
                                    ? isCorrectAnswer
                                      ? "#34D399"
                                      : "#EF4444"
                                    : isCorrectAnswer
                                    ? "#10B981"
                                    : "#64748B"
                                }
                              />
                              <Text style={[styles.choiceReviewLabel, { color: textColor }]}>
                                {choice.label}
                              </Text>
                            </View>

                            {tagText && (
                              <View style={[styles.choiceTag, { backgroundColor: tagBg }]}>
                                <Text style={[styles.choiceTagText, { color: tagColor }]}>
                                  {tagText}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Explanation */}
                    {item.question.explanation && (
                      <View style={styles.explanationBox}>
                        <Ionicons name="bulb-outline" size={16} color="#FBBF24" style={styles.explanationIcon} />
                        <Text style={styles.explanationText}>
                          {item.question.explanation}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Bottom Actions in Review Mode */}
            <View style={styles.reviewFooter}>
              <Pressable
                onPress={() => {
                  playSound("tick");
                  setIsReviewOpen(false);
                }}
                style={styles.reviewBackSummaryBtn}
              >
                <Ionicons name="arrow-back" size={16} color="#E2E8F0" />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsReviewOpen(false);
                  onReplay();
                }}
                style={styles.reviewReplayBtn}
              >
                <Ionicons name="refresh" size={16} color="#E2E8F0" />
                <Text style={styles.secondaryBtnText}>Play Again</Text>
              </Pressable>

              {safeCompleted && (
                <Pressable
                  onPress={() => {
                    setIsReviewOpen(false);
                    onNextLevel();
                  }}
                  style={styles.reviewNextBtn}
                >
                  <Text style={styles.primaryBtnText}>Next Level</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 2,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  outcomeEmoji: {
    fontSize: 46,
    marginBottom: 4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    gap: 8,
  },
  starBox: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  starCenter: {
    width: 58,
    height: 58,
    marginBottom: 10,
  },
  tryAgainText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  statTile: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10B981",
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardXp: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "800",
  },
  rewardTokens: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "800",
  },
  worldUnlockedBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "#F59E0B",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  worldUnlockedTitle: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "900",
  },
  worldUnlockedSub: {
    color: "#FEF3C7",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },

  // Review Trigger Button in Summary
  reviewTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.4)",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  reviewBtnIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBtnTextCol: {
    flex: 1,
  },
  reviewTriggerTitle: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewTriggerSub: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // ── Dedicated Review Card ──
  reviewCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 2,
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    marginBottom: 10,
  },
  reviewBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  reviewBackText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  reviewTitleBlock: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  reviewTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  reviewSubtitle: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  reviewAccuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewAccuracyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  reviewScrollView: {
    flexGrow: 1,
  },
  reviewScrollContent: {
    paddingVertical: 6,
    gap: 12,
  },
  questionReviewBox: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  qReviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  qReviewIndex: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillCorrect: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  statusPillWrong: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statusPillSkipped: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  qPromptText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 12,
  },
  choicesReviewGrid: {
    gap: 8,
  },
  choiceReviewTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  choiceTileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  choiceReviewLabel: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  choiceTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  choiceTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  explanationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  explanationIcon: {
    marginTop: 1,
  },
  explanationText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    flex: 1,
  },

  // Review Footer
  reviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    marginTop: 8,
  },
  reviewBackSummaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#334155",
    paddingVertical: 10,
    borderRadius: 10,
  },
  reviewReplayBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#334155",
    paddingVertical: 10,
    borderRadius: 10,
  },
  reviewNextBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    borderRadius: 10,
  },
});
