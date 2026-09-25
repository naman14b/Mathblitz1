/**
 * MathBlitz Kingdom - Ornate Compass Medallion Level Node Component
 * Modeled precisely on the golden/bronze ancient compass medallion style.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Path,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
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

function ActiveBeaconRing({ size }: { size: number }) {
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.beaconRing,
        {
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          borderColor: "#FBBF24",
        },
        animatedPulse,
      ]}
    />
  );
}

export const MapLevelNode = React.memo(function MapLevelNode({
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

  const size = isBoss ? 80 : 70;

  return (
    <View
      style={[
        styles.container,
        {
          left: `${Math.round(x * 100)}%`,
          top: y,
          transform: [{ translateX: -size / 2 }],
        },
      ]}
    >
      {/* Active pulsating glowing beacon ring (only mounted on current level) */}
      {isCurrent && <ActiveBeaconRing size={size} />}

      {/* Main Ornate Compass Medallion */}
      <Pressable
        onPress={() => onPress(level)}
        disabled={!isUnlocked}
        style={({ pressed }) => [
          styles.nodePressable,
          { width: size, height: size },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            {/* Outer Bronze/Gold Metallic Rim Gradient */}
            <LinearGradient id="bronzeRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FDE68A" />
              <Stop offset="30%" stopColor="#D97706" />
              <Stop offset="70%" stopColor="#78350F" />
              <Stop offset="100%" stopColor="#F59E0B" />
            </LinearGradient>

            {/* Inner Dial Midnight Gradient */}
            <RadialGradient id="innerDial" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1E293B" />
              <Stop offset="75%" stopColor="#0F172A" />
              <Stop offset="100%" stopColor="#090D16" />
            </RadialGradient>

            {/* Active Gold Glowing Dial */}
            <RadialGradient id="activeDial" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#3B2E1E" />
              <Stop offset="80%" stopColor="#1E1B18" />
              <Stop offset="100%" stopColor="#0F172A" />
            </RadialGradient>
          </Defs>

          {/* 8 Compass Pointer Spikes / Star Points */}
          <G fill={isCurrent ? "#FDE68A" : isCompleted ? "#F59E0B" : "#B45309"}>
            {/* Top */}
            <Path d="M 50,0 L 55,14 L 45,14 Z" />
            {/* Bottom */}
            <Path d="M 50,100 L 55,86 L 45,86 Z" />
            {/* Left */}
            <Path d="M 0,50 L 14,45 L 14,55 Z" />
            {/* Right */}
            <Path d="M 100,50 L 86,45 L 86,55 Z" />
            {/* Diagonal Top-Right */}
            <Path d="M 85,15 L 75,22 L 78,25 Z" />
            {/* Diagonal Top-Left */}
            <Path d="M 15,15 L 25,22 L 22,25 Z" />
            {/* Diagonal Bottom-Right */}
            <Path d="M 85,85 L 75,78 L 78,75 Z" />
            {/* Diagonal Bottom-Left */}
            <Path d="M 15,85 L 25,78 L 22,75 Z" />
          </G>

          {/* Outer Beveled Metallic Ring */}
          <Circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#bronzeRim)"
            strokeWidth="5"
          />

          {/* Inner Dark Dial with Engraved Compass Lines */}
          <Circle
            cx="50"
            cy="50"
            r="38"
            fill={isCurrent ? "url(#activeDial)" : "url(#innerDial)"}
            stroke={isCurrent ? "#FBBF24" : "#B45309"}
            strokeWidth="1.5"
          />

          {/* Etched Compass Crosshairs */}
          <Path
            d="M 50,16 L 50,84 M 16,50 L 84,50"
            stroke={isCurrent ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.12)"}
            strokeWidth="1"
            strokeDasharray="2,3"
          />

          {/* Inner Engraved Accent Circle */}
          <Circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke={isCurrent ? "rgba(245, 158, 11, 0.5)" : "rgba(255, 255, 255, 0.15)"}
            strokeWidth="1"
          />
        </Svg>

        {/* Center Node Icon & Level Number */}
        <View style={styles.centerOverlay}>
          {isBoss ? (
            <View style={styles.contentCol}>
              <Text style={styles.bossCrownIcon}>👑</Text>
              <Text style={styles.bossLevelNumText}>{level.id}</Text>
            </View>
          ) : isSpeedGate ? (
            <View style={styles.contentCol}>
              <Ionicons name="flash" size={16} color="#FBBF24" />
              <Text style={styles.nodeNumText}>{level.id}</Text>
            </View>
          ) : !isUnlocked ? (
            <View style={styles.contentCol}>
              <Ionicons name="lock-closed" size={16} color="#FDE68A" />
              <Text style={styles.lockedNodeNumText}>{level.id}</Text>
            </View>
          ) : (
            <View style={styles.contentCol}>
              {isCompleted ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#10B981"
                  style={{ marginBottom: -2 }}
                />
              ) : null}
              <Text style={[styles.nodeNumText, isCurrent && styles.activeNodeNumText]}>
                {level.id}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Level Title Pill */}
      <View style={[styles.titleBadge, !isUnlocked && styles.titleBadgeLocked]}>
        <Text
          numberOfLines={1}
          style={[styles.titleText, !isUnlocked && styles.titleTextLocked]}
        >
          {level.title}
        </Text>
      </View>

      {/* 3 Stars Placed Lower Below the Circle and Title */}
      {isCompleted && (
        <View style={styles.starsRow}>
          {[1, 2, 3].map((starIndex) => (
            <Ionicons
              key={starIndex}
              name={starIndex <= stars ? "star" : "star-outline"}
              size={11}
              color={starIndex <= stars ? "#FBBF24" : "rgba(255,255,255,0.25)"}
              style={styles.starIcon}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  beaconRing: {
    position: "absolute",
    top: -8,
    borderWidth: 2.5,
    borderStyle: "dashed",
    opacity: 0.9,
    zIndex: 1,
  },
  nodePressable: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  contentCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  bossCrownIcon: {
    fontSize: 16,
    marginBottom: -2,
  },
  bossLevelNumText: {
    color: "#FDE68A",
    fontSize: 13,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  nodeNumText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  activeNodeNumText: {
    color: "#FDE68A",
    fontSize: 15,
  },
  lockedNodeNumText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    maxWidth: 104,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 6,
  },
  titleBadgeLocked: {
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  titleText: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  titleTextLocked: {
    color: "#94A3B8",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    backgroundColor: "rgba(15, 23, 42, 0.90)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: "rgba(245, 158, 11, 0.3)",
    zIndex: 6,
  },
  starIcon: {
    marginHorizontal: 1,
  },
});
