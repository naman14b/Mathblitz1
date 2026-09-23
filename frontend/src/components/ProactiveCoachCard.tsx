/**
 * ProactiveCoachCard Component
 * Displays actionable AI Coach insights on the Home screen when a mathematical weakness is detected.
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
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.headerTitle}>MathBlitz Coach</Text>
          </View>

          {insight.mastery_score !== undefined && (
            <View style={styles.masteryPill}>
              <Text style={styles.masteryText}>
                Mastery {Math.round(insight.mastery_score)}%
              </Text>
            </View>
          )}
        </View>

        {/* Message */}
        <Text style={styles.headline}>
          {insight.concept_name
            ? `Focus on ${insight.concept_name}`
            : "Targeted Math Practice Ready"}
        </Text>
        <Text style={styles.message}>{insight.message}</Text>

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Pressable
            testID="fix-weakness-btn"
            accessibilityRole="button"
            accessibilityLabel="Fix this weakness"
            onPress={handlePressFix}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="school" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.ctaText}>{insight.cta_label || "Fix This Weakness"}</Text>
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
    paddingVertical: 3,
    borderRadius: 12,
  },
  masteryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF6B00",
  },
  headline: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.onSurface,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    backgroundColor: "#FF6B00",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dismissText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
}));
