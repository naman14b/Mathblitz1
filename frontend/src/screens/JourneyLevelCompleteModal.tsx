/**
 * FunGanit Kingdom - Level Complete & World Victory Modal
 */

import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { LevelResultData, StarRating } from "../game/journey/types";
import { getWorldForLevel, getLevelDef } from "../game/journey/worlds";
import { playSound } from "@/src/game/sounds";

interface JourneyLevelCompleteModalProps {
  visible: boolean;
  result: LevelResultData | null;
  onNextLevel: () => void;
  onReplay: () => void;
  onBackToMap: () => void;
}

export function JourneyLevelCompleteModal({
  visible,
  result,
  onNextLevel,
  onReplay,
  onBackToMap,
}: JourneyLevelCompleteModalProps) {
  if (!result) return null;

  const levelDef = getLevelDef(result.levelId);
  const world = getWorldForLevel(result.levelId);
  const isBoss = levelDef.levelType === "boss";

  // Animated star scales
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);
  const cardScale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 12 });
      if (result.completed) {
        playSound("levelup");
        if (result.stars >= 1) star1Scale.value = withDelay(200, withSpring(1.2, { damping: 8 }));
        if (result.stars >= 2) star2Scale.value = withDelay(500, withSpring(1.2, { damping: 8 }));
        if (result.stars >= 3) star3Scale.value = withDelay(800, withSpring(1.2, { damping: 8 }));
      } else {
        playSound("wrong");
      }
    } else {
      star1Scale.value = 0;
      star2Scale.value = 0;
      star3Scale.value = 0;
      cardScale.value = 0.8;
    }
  }, [visible, result]);

  const animatedStar1 = useAnimatedStyle(() => ({ transform: [{ scale: star1Scale.value }] }));
  const animatedStar2 = useAnimatedStyle(() => ({ transform: [{ scale: star2Scale.value }] }));
  const animatedStar3 = useAnimatedStyle(() => ({ transform: [{ scale: star3Scale.value }] }));
  const animatedCard = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, animatedCard]}>
          {/* Header Trophy / Outcome */}
          <View style={styles.header}>
            <Text style={styles.outcomeEmoji}>
              {result.completed ? (isBoss ? "👑" : "🏆") : "💔"}
            </Text>
            <Text style={styles.title}>
              {result.completed
                ? isBoss
                  ? `${world.name.toUpperCase()} CONQUERED!`
                  : "LEVEL COMPLETE!"
                : "LEVEL FAILED"}
            </Text>
            <Text style={styles.subtitle}>
              Level {result.levelId} • {levelDef.title}
            </Text>
          </View>

          {/* Stars Row */}
          {result.completed ? (
            <View style={styles.starsContainer}>
              <Animated.View style={[styles.starBox, animatedStar1]}>
                <Ionicons
                  name={result.stars >= 1 ? "star" : "star-outline"}
                  size={36}
                  color={result.stars >= 1 ? "#F59E0B" : "#4B5563"}
                />
              </Animated.View>
              <Animated.View style={[styles.starBox, styles.starCenter, animatedStar2]}>
                <Ionicons
                  name={result.stars >= 2 ? "star" : "star-outline"}
                  size={46}
                  color={result.stars >= 2 ? "#F59E0B" : "#4B5563"}
                />
              </Animated.View>
              <Animated.View style={[styles.starBox, animatedStar3]}>
                <Ionicons
                  name={result.stars >= 3 ? "star" : "star-outline"}
                  size={36}
                  color={result.stars >= 3 ? "#F59E0B" : "#4B5563"}
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
              <Text style={styles.statValue}>{result.score}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>ACCURACY</Text>
              <Text style={styles.statValue}>{Math.round(result.accuracy * 100)}%</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValue}>{result.timeTakenSeconds}s</Text>
            </View>
          </View>

          {/* Rewards Pill */}
          {result.completed && (
            <View style={styles.rewardPill}>
              <Text style={styles.rewardXp}>+{result.xpEarned} XP</Text>
              {result.tokensEarned > 0 && (
                <Text style={styles.rewardTokens}>🪙 +{result.tokensEarned} Tokens</Text>
              )}
            </View>
          )}

          {/* Next World Unlocked Banner */}
          {result.unlockedNextWorld && (
            <View style={styles.worldUnlockedBanner}>
              <Text style={styles.worldUnlockedTitle}>🎉 NEW WORLD UNLOCKED!</Text>
              <Text style={styles.worldUnlockedSub}>
                The gates to the next mathematical realm are open!
              </Text>
            </View>
          )}

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

            {result.completed && (
              <Pressable onPress={onNextLevel} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Next Level</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 2,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  outcomeEmoji: {
    fontSize: 48,
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
    marginVertical: 12,
    gap: 8,
  },
  starBox: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  starCenter: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  tryAgainText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 14,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    marginVertical: 12,
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
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
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
    marginBottom: 14,
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 8,
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
    fontSize: 14,
    fontWeight: "800",
  },
});
