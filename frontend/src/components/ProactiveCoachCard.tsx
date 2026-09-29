/**
 * ProactiveCoachCard Component
 * Displays actionable AI Coach insights on the Home screen when a mathematical weakness or regression is detected.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { CoachingInsight } from "../game/types";
import { makeStyles, useTheme } from "../theme";

type ProactiveCoachCardProps = {
  insight: CoachingInsight;
  onFixWeakness: (conceptId?: string) => void;
  onDismiss?: () => void;
};

export function ProactiveCoachCard({
  insight,
  onFixWeakness,
  onDismiss,
}: ProactiveCoachCardProps) {
  const { colors, isNight } = useTheme();
  const styles = useStyles();

  if (!insight.has_insight) return null;

  const handlePressFix = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onFixWeakness(insight.concept_id);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(300)}
      style={styles.cardWrapper}
    >
      <View style={[styles.card, isNight ? styles.cardNight : styles.cardDay]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.iconCircle, insight.is_regression && { backgroundColor: "rgba(244, 63, 94, 0.15)" }]}>
              <Ionicons
                name={insight.is_regression ? "refresh" : "sparkles"}
                size={16}
                color={insight.is_regression ? "#F43F5E" : "#FF6B00"}
              />
            </View>
            <Text style={[styles.headerTitle, insight.is_regression && { color: "#F43F5E" }]}>
              {insight.is_regression ? "Skill Refresher" : "FunGanit Coach"}
            </Text>
          </View>

          {insight.mastery_score !== undefined && (
            <View style={[styles.masteryPill, insight.is_regression && { backgroundColor: "rgba(244, 63, 94, 0.15)" }]}>
              <Text style={[styles.masteryText, insight.is_regression && { color: "#F43F5E" }]}>
                Mastery {Math.round(insight.mastery_score)}%
              </Text>
            </View>
          )}
        </View>

        {/* Message */}
        <Text style={styles.headline}>
          {insight.is_prerequisite_gap && insight.target_learning_concept_name
            ? `Foundation Focus: ${insight.target_learning_concept_name}`
            : insight.concept_name
            ? `Focus on ${insight.concept_name}`
            : "Targeted Math Practice"}
        </Text>

        <Text style={styles.message}>{insight.message}</Text>

        {/* Evidence / Reason summary pill if available */}
        {insight.evidence_summary ? (
          <View style={styles.reasonPill}>
            <Ionicons name="information-circle-outline" size={14} color={isNight ? "#FFB067" : "#C2410C"} />
            <Text style={styles.reasonText}>{insight.evidence_summary}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Pressable
            testID="fix-weakness-btn"
            accessibilityRole="button"
            accessibilityLabel="Fix this weakness"
            onPress={handlePressFix}
            style={({ pressed }) => [
              styles.ctaButton,
              insight.is_regression && { backgroundColor: "#F43F5E" },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="school" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.ctaText}>{insight.is_regression ? "Start Refresher" : (insight.cta_label || "Fix This Weakness")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </Pressable>

          {onDismiss && (
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss coaching card"
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.dismissText}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardNight: {
    backgroundColor: "rgba(20, 16, 38, 0.94)",
    borderColor: "rgba(255, 107, 0, 0.45)",
  },
  cardDay: {
    backgroundColor: "rgba(255, 248, 240, 0.98)",
    borderColor: "rgba(255, 107, 0, 0.35)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 107, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF6B00",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  masteryPill: {
    backgroundColor: "rgba(255, 107, 0, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  masteryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B00",
  },
  headline: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
    marginBottom: 10,
  },
  reasonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 0, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B00",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  dismissText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
}));
