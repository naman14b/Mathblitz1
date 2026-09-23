/**
 * MathBlitz Kingdom - Map Level Node Component
 * Styled with Sudoku & Puzzles level theme image artwork and indicators.
 */

import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
import { getLevelImage } from "@/src/game/levelAssets";

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
  const levelImage = getLevelImage(level.id);

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

  const nodeBorderColor = isCurrent
    ? "#FBBF24"
    : isCompleted
    ? "#34D399"
    : isBoss
    ? "#F59E0B"
    : !isUnlocked
    ? "#334155"
    : "#FFFFFF";

  return (
    <View
      style={[
        styles.container,
        {
          left: `${Math.round(x * 100)}%`,
          top: y,
          transform: [{ translateX: -34 }],
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

      {/* Main Node Button with Sudoku/Puzzles Level Theme Image */}
      <Pressable
        onPress={() => onPress(level)}
        disabled={!isUnlocked}
        style={({ pressed }) => [
          styles.node,
          {
            borderColor: nodeBorderColor,
            borderWidth: isCurrent ? 3.5 : isCompleted ? 2.5 : isBoss ? 3 : 2,
            opacity: pressed ? 0.85 : 1,
          },
          isBoss && styles.bossNode,
          !isUnlocked && styles.lockedNode,
        ]}
      >
        {/* Theme image thumbnail from Sudoku/Puzzles */}
        <Image
          source={levelImage}
          style={[
            styles.nodeImage,
            isBoss && styles.bossNodeImage,
            !isUnlocked && { opacity: 0.25 },
          ]}
          resizeMode="cover"
        />

        {/* Semi-transparent dark vignette overlay */}
        <View
          style={[
            styles.imageOverlay,
            isCompleted && { backgroundColor: "rgba(6, 78, 59, 0.45)" },
            isCurrent && { backgroundColor: "rgba(180, 83, 9, 0.35)" },
            !isUnlocked && { backgroundColor: "rgba(15, 23, 42, 0.82)" },
          ]}
        />

        {/* Content Over Theme Image */}
        {isBoss ? (
          <View style={styles.bossInner}>
            <Text style={styles.bossIcon}>👑</Text>
            <Text style={styles.bossLevelText}>{level.id}</Text>
          </View>
        ) : isSpeedGate ? (
          <View style={styles.centerContent}>
            <Ionicons name="flash" size={20} color="#FBBF24" />
            <Text style={styles.levelText}>{level.id}</Text>
          </View>
        ) : !isUnlocked ? (
          <View style={styles.centerContent}>
            <Ionicons name="lock-closed" size={18} color="#94A3B8" />
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
              size={11}
              color={starIndex <= stars ? "#F59E0B" : "rgba(255,255,255,0.2)"}
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
    width: 68,
    height: 96,
  },
  beaconRing: {
    position: "absolute",
    top: -7,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderStyle: "dashed",
    opacity: 0.9,
  },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#0F172A",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 7,
  },
  lockedNode: {
    backgroundColor: "#1E293B",
  },
  bossNode: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  nodeImage: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  bossNodeImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
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
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  lockedLevelText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  starIcon: {
    marginHorizontal: 0.5,
  },
  titleBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    maxWidth: 96,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  titleBadgeLocked: {
    backgroundColor: "rgba(30, 41, 59, 0.75)",
    borderColor: "transparent",
  },
  titleText: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  titleTextLocked: {
    color: "#94A3B8",
  },
});
