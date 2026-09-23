/**
 * AICoachScreen
 * Interactive personalized mathematics coaching experience:
 * Math Profile Dashboard + 5-Step Interactive Guided Lesson (Understand -> Example -> Your Turn -> Feedback -> Challenge & Growth)
 */
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { aiCoachApi } from "../api/aiCoach";
import { IconButton } from "../components/ui";
import {
  CoachingPracticeItem,
  CoachingSessionData,
  DetectedWeakness,
  LearningProfile,
  LocalProfile,
} from "../game/types";
import { makeStyles, useTheme } from "../theme";

type AICoachScreenProps = {
  profile: LocalProfile;
  initialConceptId?: string | null;
  onBack: () => void;
};

type Step = 1 | 2 | 3 | 4 | 5;

export function AICoachScreen({
  profile,
  initialConceptId,
  onBack,
}: AICoachScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isNight } = useTheme();
  const styles = useStyles();

  const [loading, setLoading] = useState(true);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);

  // Active Session State
  const [activeSession, setActiveSession] = useState<CoachingSessionData | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedPracticeIndex, setSelectedPracticeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    is_correct: boolean;
    correct_answer: string;
    feedback: string;
    mastery_before: number;
    mastery_after: number;
    mastery_delta: number;
  } | null>(null);

  // Contextual Q&A Modal
  const [showQAModal, setShowQAModal] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [isAskingQA, setIsAskingQA] = useState(false);

  // Load player math profile on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfileAndStart = async () => {
      setLoading(true);
      const playerId = profile.playerName || "player_local";
      const prof = await aiCoachApi.getProfile(playerId);
      if (isMounted) {
        setLearningProfile(prof);
      }

      // If opened with a specific concept target or has active weakness, initiate coaching session
      const targetCid = initialConceptId || prof.active_intervention?.concept_id;
      if (targetCid) {
        const session = await aiCoachApi.startSession(
          playerId,
          targetCid,
          profile.playerName || "Player"
        );
        if (isMounted) {
          setActiveSession(session);
          setCurrentStep(1);
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchProfileAndStart();
    return () => {
      isMounted = false;
    };
  }, [initialConceptId, profile.playerName]);

  const handleStartTargetedSession = async (conceptId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    const playerId = profile.playerName || "player_local";
    const session = await aiCoachApi.startSession(
      playerId,
      conceptId,
      profile.playerName || "Player"
    );
    setActiveSession(session);
    setCurrentStep(1);
    setSelectedPracticeIndex(0);
    setSelectedAnswer(null);
    setFeedbackData(null);
    setLoading(false);
  };

  const handleAnswerOption = (option: string) => {
    if (selectedAnswer !== null || isSubmitting) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedAnswer(option);
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || selectedAnswer === null || isSubmitting) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    const playerId = profile.playerName || "player_local";
    const result = await aiCoachApi.submitPractice(
      activeSession.session_id,
      playerId,
      selectedPracticeIndex,
      selectedAnswer
    );

    setFeedbackData(result);
    setCurrentStep(4); // Move to Step 4 (Feedback)
    setIsSubmitting(false);
  };

  const handleNextFromFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (selectedPracticeIndex < (activeSession?.verified_practice.length || 1) - 1) {
      // Advance to Step 5 (Challenge Question)
      setSelectedPracticeIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setFeedbackData(null);
      setCurrentStep(5);
    } else {
      // Session Completed
      Alert.alert(
        "🎉 Concept Mastered!",
        `You improved your mastery by +${feedbackData?.mastery_delta || 18}%! Keep up the sharp math work!`,
        [
          {
            text: "Back to Dashboard",
            onPress: () => {
              setActiveSession(null);
              // Refresh profile
              aiCoachApi.getProfile(profile.playerName || "player_local").then(setLearningProfile);
            },
          },
        ]
      );
    }
  };

  const handleContextualAsk = async () => {
    if (!userQuery.trim() || !activeSession || isAskingQA) return;
    setIsAskingQA(true);
    const currentQ = activeSession.verified_practice[selectedPracticeIndex];
    const res = await aiCoachApi.contextualQuery(
      profile.playerName || "player_local",
      currentQ.prompt,
      currentQ.correct_answer,
      selectedAnswer || "none",
      activeSession.topic,
      userQuery.trim()
    );
    setQaAnswer(res.answer);
    setIsAskingQA(false);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>MathBlitz Coach analyzing your gameplay...</Text>
      </View>
    );
  }

  // ── ACTIVE COACHING SESSION VIEW (5 STEPS) ──────────────────────────────────
  if (activeSession) {
    const practiceQuestions = activeSession.verified_practice || [];
    const currentQ = practiceQuestions[selectedPracticeIndex] || practiceQuestions[0];

    return (
      <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <IconButton
            name="close"
            label="Exit session"
            onPress={() => {
              setActiveSession(null);
            }}
          />
          <View style={styles.sessionHeaderWrap}>
            <Text style={styles.sessionTopicBadge}>{activeSession.topic.toUpperCase()}</Text>
            <Text style={styles.sessionHeaderTitle} numberOfLines={1}>
              {activeSession.concept_name}
            </Text>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {currentStep}/5</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(currentStep / 5) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* STEP 1: UNDERSTAND */}
          {currentStep === 1 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.stepCard}>
              <View style={styles.stepBadgePill}>
                <Ionicons name="bulb" size={16} color="#FF6B00" />
                <Text style={styles.stepBadgePillText}>STEP 1 · UNDERSTAND THE CONCEPT</Text>
              </View>

              <Text style={styles.stepHeadline}>Why this mistake happens</Text>
              {activeSession.common_mistake ? (
                <View style={styles.pitfallNotice}>
                  <Ionicons name="warning-outline" size={18} color="#EF4444" />
                  <Text style={styles.pitfallNoticeText}>{activeSession.common_mistake}</Text>
                </View>
              ) : null}

              <Text style={styles.explanationText}>{activeSession.concept_explanation}</Text>

              {activeSession.formula_breakdown ? (
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaLabel}>CORE RULE / FORMULA</Text>
                  <Text style={styles.formulaText}>{activeSession.formula_breakdown}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setCurrentStep(2);
                }}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryBtnText}>Next: See an Example</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          )}

          {/* STEP 2: EXAMPLE */}
          {currentStep === 2 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.stepCard}>
              <View style={styles.stepBadgePill}>
                <Ionicons name="book" size={16} color="#3B82F6" />
                <Text style={[styles.stepBadgePillText, { color: "#3B82F6" }]}>STEP 2 · WORKED EXAMPLE</Text>
              </View>

              <Text style={styles.stepHeadline}>Step-by-step walkthrough</Text>

              <View style={styles.exampleCard}>
                <Text style={styles.exampleProblem}>{activeSession.example_problem}</Text>
                <View style={styles.divider} />
                <Text style={styles.exampleSolution}>{activeSession.example_solution}</Text>
              </View>

              <View style={styles.rowBtns}>
                <Pressable
                  onPress={() => setCurrentStep(1)}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setCurrentStep(3);
                  }}
                  style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.primaryBtnText}>Your Turn to Practice</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* STEP 3 & STEP 5: YOUR TURN & CHALLENGE PRACTICE */}
          {(currentStep === 3 || currentStep === 5) && currentQ && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.stepCard}>
              <View style={styles.stepBadgePill}>
                <Ionicons
                  name={currentStep === 5 ? "flame" : "create"}
                  size={16}
                  color={currentStep === 5 ? "#EC4899" : "#10B981"}
                />
                <Text
                  style={[
                    styles.stepBadgePillText,
                    { color: currentStep === 5 ? "#EC4899" : "#10B981" },
                  ]}
                >
                  {currentStep === 5 ? "STEP 5 · PROGRESSIVE CHALLENGE" : "STEP 3 · YOUR TURN"}
                </Text>
              </View>

              <Text style={styles.stepHeadline}>
                {currentStep === 5 ? "Try a slightly harder problem" : "Solve this problem"}
              </Text>

              <View style={styles.questionCard}>
                <Text style={styles.questionPrompt}>{currentQ.prompt}</Text>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option;
                  return (
                    <Pressable
                      key={`opt-${idx}`}
                      onPress={() => handleAnswerOption(option)}
                      style={({ pressed }) => [
                        styles.optionBtn,
                        isSelected && styles.optionBtnSelected,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={[styles.optionLetterBox, isSelected && styles.optionLetterBoxSelected]}>
                        <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                          {String.fromCharCode(65 + idx)}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#FF6B00" />}
                    </Pressable>
                  );
                })}
              </View>

              {/* Contextual Ask Coach button */}
              <Pressable
                onPress={() => {
                  setUserQuery("");
                  setQaAnswer(null);
                  setShowQAModal(true);
                }}
                style={({ pressed }) => [styles.askCoachLink, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#3B82F6" />
                <Text style={styles.askCoachLinkText}>Need a hint or explanation?</Text>
              </Pressable>

              <Pressable
                disabled={selectedAnswer === null || isSubmitting}
                onPress={handleSubmitAnswer}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  selectedAnswer === null && { opacity: 0.5 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Check Answer</Text>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </Animated.View>
          )}

          {/* STEP 4: FEEDBACK */}
          {currentStep === 4 && feedbackData && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.stepCard}>
              <View
                style={[
                  styles.feedbackHeader,
                  feedbackData.is_correct ? styles.feedbackHeaderCorrect : styles.feedbackHeaderWrong,
                ]}
              >
                <Ionicons
                  name={feedbackData.is_correct ? "checkmark-circle" : "close-circle"}
                  size={32}
                  color={feedbackData.is_correct ? "#10B981" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: feedbackData.is_correct ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {feedbackData.is_correct ? "Correct! Excellent job!" : "Not quite, but good effort!"}
                </Text>
              </View>

              <Text style={styles.feedbackBody}>{feedbackData.feedback}</Text>

              {/* Mastery Delta Pill */}
              <View style={styles.masteryDeltaCard}>
                <Text style={styles.masteryDeltaLabel}>Mastery Level</Text>
                <View style={styles.masteryDeltaRow}>
                  <Text style={styles.masteryBefore}>{feedbackData.mastery_before}%</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FF6B00" />
                  <Text style={styles.masteryAfter}>{feedbackData.mastery_after}%</Text>
                  <View style={styles.deltaBadge}>
                    <Text style={styles.deltaBadgeText}>+{feedbackData.mastery_delta}%</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleNextFromFeedback}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryBtnText}>
                  {selectedPracticeIndex < practiceQuestions.length - 1
                    ? "Next: Try Progressive Challenge"
                    : "Complete Session"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>

        {/* Contextual Q&A Modal */}
        <Modal visible={showQAModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, isNight ? styles.modalNight : styles.modalDay]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="sparkles" size={18} color="#FF6B00" />
                  <Text style={styles.modalTitle}>Ask Coach</Text>
                </View>
                <IconButton name="close" label="Close" onPress={() => setShowQAModal(false)} />
              </View>

              <Text style={styles.modalSub}>
                Ask a specific question about: {currentQ?.prompt}
              </Text>

              <TextInput
                placeholder="e.g. Why do we divide by 100 instead of 10?"
                placeholderTextColor={colors.muted}
                value={userQuery}
                onChangeText={setUserQuery}
                style={[styles.modalInput, { color: colors.onSurface }]}
                multiline
              />

              {qaAnswer ? (
                <View style={styles.qaAnswerBox}>
                  <Text style={styles.qaAnswerText}>{qaAnswer}</Text>
                </View>
              ) : null}

              <Pressable
                disabled={!userQuery.trim() || isAskingQA}
                onPress={handleContextualAsk}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !userQuery.trim() && { opacity: 0.5 },
                  pressed && { opacity: 0.85 },
                  { marginTop: 12 },
                ]}
              >
                {isAskingQA ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Get Explanation</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── MATH PROFILE DASHBOARD VIEW ─────────────────────────────────────────────
  const weakAreas = learningProfile?.weak_areas || [];
  const metrics = learningProfile?.topic_metrics || {};

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <IconButton name="arrow-back" label="Back" onPress={onBack} />
        <View style={styles.dashboardTitleWrap}>
          <Text style={styles.dashboardTitle}>Math Profile & Coach</Text>
          <Text style={styles.dashboardSub}>Personalized Learning Hub</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Overall Mastery Hero Card */}
        <View style={[styles.heroCard, isNight ? styles.heroCardNight : styles.heroCardDay]}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>OVERALL ACCURACY</Text>
              <Text style={styles.heroScore}>{learningProfile?.overall_accuracy ?? 0}%</Text>
              <Text style={styles.heroAttempts}>
                Based on {learningProfile?.total_attempts ?? 0} verified attempts
              </Text>
            </View>
            <View style={styles.heroOrb}>
              <Ionicons name="school" size={32} color="#FF6B00" />
            </View>
          </View>
        </View>

        {/* Section: Detected Weak Areas */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash" size={18} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Detected Weak Areas</Text>
        </View>

        {weakAreas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={36} color="#10B981" />
            <Text style={styles.emptyTitle}>No Critical Weaknesses Detected!</Text>
            <Text style={styles.emptySub}>
              Keep playing Blitz, Daily Challenges, and Puzzles. As you answer questions, MathBlitz AI Coach will analyze your mistakes and offer targeted lessons.
            </Text>
          </View>
        ) : (
          weakAreas.map((weak, idx) => (
            <Animated.View
              key={`weak-${weak.concept_id}-${idx}`}
              entering={FadeInDown.delay(idx * 80).duration(300)}
              style={[styles.weakCard, isNight ? styles.weakCardNight : styles.weakCardDay]}
            >
              <View style={styles.weakHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weakTopicBadge}>{weak.topic.toUpperCase()}</Text>
                  <Text style={styles.weakName}>{weak.concept_name}</Text>
                </View>
                <View
                  style={[
                    styles.severityPill,
                    weak.severity === "high" ? styles.severityHigh : styles.severityMed,
                  ]}
                >
                  <Text style={styles.severityText}>
                    {weak.severity.toUpperCase()} PRIORITY
                  </Text>
                </View>
              </View>

              <Text style={styles.weakMistake}>⚠️ {weak.common_mistake}</Text>

              <View style={styles.weakFooter}>
                <View style={styles.weakStat}>
                  <Text style={styles.weakStatLabel}>Accuracy</Text>
                  <Text style={styles.weakStatVal}>{weak.accuracy}%</Text>
                </View>
                <View style={styles.weakStat}>
                  <Text style={styles.weakStatLabel}>Mastery</Text>
                  <Text style={styles.weakStatVal}>{Math.round(weak.mastery_score)}%</Text>
                </View>

                <Pressable
                  onPress={() => handleStartTargetedSession(weak.concept_id)}
                  style={({ pressed }) => [styles.fixBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                  <Text style={styles.fixBtnText}>Fix This</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}

        {/* Section: Concept Mastery Breakdown */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Ionicons name="pie-chart" size={18} color="#3B82F6" />
          <Text style={styles.sectionTitle}>Concept Mastery Breakdown</Text>
        </View>

        {Object.keys(metrics).length === 0 ? (
          <Text style={styles.emptyNoticeText}>
            Play 60-second Blitz or Challenges to generate your mathematical mastery radar.
          </Text>
        ) : (
          Object.values(metrics).map((m, idx) => (
            <View key={`metric-${m.concept_id}-${idx}`} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricName}>{m.concept_name}</Text>
                <Text style={styles.metricScore}>{Math.round(m.mastery_score)}% Mastery</Text>
              </View>
              <View style={styles.metricBarBg}>
                <View
                  style={[
                    styles.metricBarFill,
                    {
                      width: `${m.mastery_score}%`,
                      backgroundColor:
                        m.mastery_score >= 70
                          ? "#10B981"
                          : m.mastery_score >= 50
                          ? "#FF6B00"
                          : "#EF4444",
                    },
                  ]}
                />
              </View>
              <View style={styles.metricMetaRow}>
                <Text style={styles.metricMetaText}>
                  {m.correct_attempts}/{m.total_attempts} Correct · {m.accuracy}% Acc
                </Text>
                <Text style={styles.metricMetaText}>Trend: {m.trend.toUpperCase()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 14,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sessionHeaderWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  sessionTopicBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FF6B00",
    letterSpacing: 0.6,
  },
  sessionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  stepBadge: {
    backgroundColor: "rgba(255, 107, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B00",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FF6B00",
    borderRadius: 2,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  stepBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 107, 0, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  stepBadgePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B00",
    letterSpacing: 0.4,
  },
  stepHeadline: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.onSurface,
    marginBottom: 12,
  },
  pitfallNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  pitfallNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
    lineHeight: 18,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    marginBottom: 16,
  },
  formulaBox: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    marginBottom: 20,
  },
  formulaLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#3B82F6",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  exampleCard: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  exampleProblem: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  exampleSolution: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: "600",
  },
  questionCard: {
    backgroundColor: "rgba(255, 107, 0, 0.08)",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.25)",
  },
  questionPrompt: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
    textAlign: "center",
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  optionBtnSelected: {
    borderColor: "#FF6B00",
    backgroundColor: "rgba(255, 107, 0, 0.12)",
  },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterBoxSelected: {
    backgroundColor: "#FF6B00",
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
  },
  optionLetterTextSelected: {
    color: "#FFFFFF",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  optionTextSelected: {
    fontWeight: "900",
    color: "#FF6B00",
  },
  askCoachLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  askCoachLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3B82F6",
  },
  primaryBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  rowBtns: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackHeader: {
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    gap: 8,
  },
  feedbackHeaderCorrect: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  feedbackHeaderWrong: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    marginBottom: 18,
  },
  masteryDeltaCard: {
    backgroundColor: "rgba(255, 107, 0, 0.08)",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.25)",
    marginBottom: 20,
  },
  masteryDeltaLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B00",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  masteryDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  masteryBefore: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.muted,
  },
  masteryAfter: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
  },
  deltaBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  deltaBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "80%",
  },
  modalNight: {
    backgroundColor: "#111827",
  },
  modalDay: {
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FF6B00",
  },
  modalSub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  qaAnswerBox: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  qaAnswerText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },

  // ── DASHBOARD STYLES ────────────────────────────────────────────────────────
  dashboardTitleWrap: {
    alignItems: "center",
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.onSurface,
  },
  dashboardSub: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    elevation: 6,
  },
  heroCardNight: {
    backgroundColor: "rgba(20, 16, 38, 0.94)",
    borderColor: "rgba(255, 107, 0, 0.45)",
  },
  heroCardDay: {
    backgroundColor: "rgba(255, 248, 240, 0.98)",
    borderColor: "rgba(255, 107, 0, 0.35)",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B00",
    letterSpacing: 0.6,
  },
  heroScore: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.onSurface,
  },
  heroAttempts: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  heroOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 107, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.onSurface,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyNoticeText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
  weakCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  weakCardNight: {
    backgroundColor: "rgba(18, 24, 38, 0.9)",
    borderColor: "rgba(255, 107, 0, 0.3)",
  },
  weakCardDay: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0,0,0,0.08)",
  },
  weakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  weakTopicBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FF6B00",
    letterSpacing: 0.5,
  },
  weakName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  severityHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  severityMed: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  severityText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FF6B00",
  },
  weakMistake: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  weakFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 10,
  },
  weakStat: {
    alignItems: "center",
  },
  weakStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  weakStatVal: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.onSurface,
  },
  fixBtn: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fixBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metricName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
  },
  metricScore: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
  },
  metricBarBg: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  metricBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  metricMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricMetaText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
}));
