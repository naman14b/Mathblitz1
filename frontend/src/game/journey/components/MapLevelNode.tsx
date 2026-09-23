/**
 * MathBlitz Kingdom - Map Level Node Component
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { JourneyLevelDef, StarRating } from "../types";
import { getWorldForLevel } from "../worlds";

interface MapLevelNodeProps {
  level: JourneyLevelDef;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  stars: StarRating;
  bestTime?: number;
  onPress: (level: JourneyLevelDef) => void;
  x: number; // Percentage or absolute X (0 to 1)
  y: number; // Absolute Y
}

export function MapLevelNode({
  level,
  isUnlocked,
  isCompleted,
  isCurrent,
  stars,
  bestTime,
  onPress,
  x,
  y,
}: MapLevelNodeProps) {
  const world = getWorldForLevel(level.id);
  const isBoss = level.levelType === "boss";
  const isSpeedGate = level.levelType === "speed_gate";

  // Pulse animation for active current level
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isCurrent]);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const nodeColor = !isUnlocked
    ? world.palette.nodeLocked
    : isBoss
    ? world.palette.nodeBoss
    : isSpeedGate
    ? "#F59E0B"
    : world.palette.nodeUnlocked;

  const nodeBorderColor = isCurrent
    ? "#FBBF24"
    : isCompleted
    ? "#FCD34D"
    : !isUnlocked
    ? "#4B5563"
    : "#FFFFFF";

  return (
    <View
      style={[
        styles.container,
        {
          left: `${Math.round(x * 100)}%`,
          top: y,
          transform: [{ translateX: -32 }],
        },
      ]}
    >
      {/* Active pulsating beacon ring */}
      {isCurrent && (
        <Animated.View
          style={[
            styles.beaconRing,
            { borderColor: world.palette.accent },
            animatedPulse,
          ]}
        />
      )}

      {/* Main Node Button */}
      <Pressable
        onPress={() => onPress(level)}
        disabled={!isUnlocked}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: nodeColor,
            borderColor: nodeBorderColor,
            borderWidth: isCurrent ? 3.5 : isCompleted ? 2.5 : 2,
            opacity: pressed ? 0.85 : 1,
          },
          isBoss && styles.bossNode,
        ]}
      >
        {isBoss ? (
          <View style={styles.bossInner}>
            <Text style={styles.bossIcon}>👑</Text>
            <Text style={styles.bossLevelText}>{level.id}</Text>
          </View>
        ) : isSpeedGate ? (
          <View style={styles.centerContent}>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.levelText}>{level.id}</Text>
          </View>
        ) : !isUnlocked ? (
          <View style={styles.centerContent}>
            <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
            <Text style={styles.lockedLevelText}>{level.id}</Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.levelText}>{level.id}</Text>
          </View>
        )}
      </Pressable>

      {/* Stars indicator under completed levels */}
      {isCompleted && (
        <View style={styles.starsRow}>
          {[1, 2, 3].map((starIndex) => (
            <Ionicons
              key={starIndex}
              name={starIndex <= stars ? "star" : "star-outline"}
              size={12}
              color={starIndex <= stars ? "#F59E0B" : "#9CA3AF"}
              style={styles.starIcon}
            />
          ))}
        </View>
      )}

      {/* Level Title banner label */}
      <View style={[styles.titleBadge, !isUnlocked && styles.titleBadgeLocked]}>
        <Text
          numberOfLines={1}
          style={[styles.titleText, !isUnlocked && styles.titleTextLocked]}
        >
          {level.title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 90,
  },
  beaconRing: {
    position: "absolute",
    top: -6,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderStyle: "dashed",
    opacity: 0.85,
  },
  node: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  bossNode: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  bossInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  bossIcon: {
    fontSize: 20,
    marginBottom: -4,
  },
  bossLevelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockedLevelText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  starIcon: {
    marginHorizontal: 0.5,
  },
  titleBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    maxWidth: 90,
  },
  titleBadgeLocked: {
    backgroundColor: "rgba(31, 41, 55, 0.7)",
  },
  titleText: {
    color: "#F3F4F6",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  titleTextLocked: {
    color: "#9CA3AF",
  },
});
