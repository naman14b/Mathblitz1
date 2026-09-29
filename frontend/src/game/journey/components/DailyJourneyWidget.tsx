/**
 * FunGanit Kingdom - Daily & Weekly Journey Quest Widget
 */

import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DailyJourneyState, WeeklyJourneyState } from "../types";

interface DailyJourneyWidgetProps {
  daily: DailyJourneyState;
  weekly: WeeklyJourneyState;
  onClose?: () => void;
}

const STREAK_REWARDS = [
  { day: 1, xp: 20 },
  { day: 2, xp: 30 },
  { day: 3, xp: 40 },
  { day: 4, xp: 50 },
  { day: 5, xp: 75 },
  { day: 6, xp: 100 },
  { day: 7, xp: 250, tokens: 25, isChest: true },
];

export function DailyJourneyWidget({ daily, weekly, onClose }: DailyJourneyWidgetProps) {
  const currentStreakDay = ((daily.currentStreak - 1) % 7) + 1;

  return (
    <View style={styles.container}>
      {/* Daily Quest Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🎯</Text>
          <View>
            <Text style={styles.headerTitle}>Daily Kingdom Quest</Text>
            <Text style={styles.headerSubtitle}>Complete 3 levels to maintain your streak</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* 3 Steps Progress Row */}
      <View style={styles.progressRow}>
        {[0, 1, 2].map((idx) => {
          const isDone = idx < daily.completedLevelIds.length;
          return (
            <View
              key={idx}
              style={[
                styles.stepCircle,
                isDone && styles.stepCircleDone,
              ]}
            >
              <Ionicons
                name={isDone ? "checkmark" : "radio-button-off"}
                size={18}
                color={isDone ? "#FFFFFF" : "#6B7280"}
              />
            </View>
          );
        })}
        <View style={styles.rewardPill}>
          <Text style={styles.rewardText}>+{daily.rewardXp} XP</Text>
          <Text style={styles.rewardTokens}>🪙 +{daily.rewardTokens}</Text>
        </View>
      </View>

      {/* Streak Day-by-Day Ladder */}
      <View style={styles.streakSection}>
        <View style={styles.streakTitleRow}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakTitle}>
            {daily.currentStreak} Day Streak {daily.currentStreak > 0 ? "Active!" : "Ready to Start!"}
          </Text>
        </View>

        <View style={styles.streakDaysRow}>
          {STREAK_REWARDS.map((item) => {
            const isCompletedDay = daily.currentStreak > 0 && item.day <= currentStreakDay;
            const isToday = item.day === currentStreakDay || (daily.currentStreak === 0 && item.day === 1);

            return (
              <View
                key={item.day}
                style={[
                  styles.streakDayNode,
                  isCompletedDay && styles.streakDayCompleted,
                  isToday && styles.streakDayToday,
                ]}
              >
                <Text style={styles.dayLabel}>D{item.day}</Text>
                <Text style={styles.dayIcon}>
                  {item.isChest ? "🎁" : isCompletedDay ? "🔥" : "⭐"}
                </Text>
                <Text style={styles.dayRewardText}>+{item.xp}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Weekly Journey Quest */}
      <View style={styles.weeklySection}>
        <View style={styles.weeklyHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.weeklyIcon}>🏆</Text>
            <View>
              <Text style={styles.weeklyTitle}>Weekly Realm Conquest</Text>
              <Text style={styles.weeklyProgressText}>
                {weekly.completedLevelsCount} / {weekly.targetLevelsCount} Levels Completed
              </Text>
            </View>
          </View>
          <View style={styles.weeklyRewardBadge}>
            <Text style={styles.weeklyRewardText}>+{weekly.rewardXp} XP</Text>
            <Text style={styles.weeklyRewardTokens}>🪙 +{weekly.rewardTokens}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(
                  100,
                  Math.round((weekly.completedLevelsCount / weekly.targetLevelsCount) * 100)
                )}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderColor: "#374151",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
  },
  closeBtn: {
    padding: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(31, 41, 55, 0.6)",
    borderRadius: 12,
    padding: 8,
    marginBottom: 14,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: {
    backgroundColor: "#10B981",
  },
  rewardPill: {
    backgroundColor: "#065F46",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  rewardText: {
    color: "#D1FAE5",
    fontSize: 11,
    fontWeight: "800",
  },
  rewardTokens: {
    color: "#FEF08A",
    fontSize: 10,
    fontWeight: "700",
  },
  streakSection: {
    marginBottom: 14,
  },
  streakTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  streakFlame: {
    fontSize: 16,
  },
  streakTitle: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800",
  },
  streakDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  streakDayNode: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 40,
  },
  streakDayCompleted: {
    backgroundColor: "#78350F",
    borderColor: "#F59E0B",
  },
  streakDayToday: {
    borderColor: "#FEF08A",
    borderWidth: 1.5,
  },
  dayLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontWeight: "700",
  },
  dayIcon: {
    fontSize: 14,
    marginVertical: 2,
  },
  dayRewardText: {
    color: "#FCD34D",
    fontSize: 9,
    fontWeight: "800",
  },
  weeklySection: {
    backgroundColor: "rgba(31, 41, 55, 0.6)",
    borderRadius: 12,
    padding: 10,
  },
  weeklyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weeklyIcon: {
    fontSize: 20,
  },
  weeklyTitle: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
  },
  weeklyProgressText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "500",
  },
  weeklyRewardBadge: {
    backgroundColor: "#312E81",
    borderColor: "#6366F1",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: "center",
  },
  weeklyRewardText: {
    color: "#E0E7FF",
    fontSize: 10,
    fontWeight: "800",
  },
  weeklyRewardTokens: {
    color: "#FEF08A",
    fontSize: 9,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#374151",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
});
