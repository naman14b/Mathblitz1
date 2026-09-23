/**
 * MathBlitz Kingdom - Player Character Token Component
 *
 * Renders the player's equipped avatar on the map and animates
 * physical walking / hopping movement between level nodes.
 */

import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { AVATARS, AvatarId } from "@/src/game/types";

interface PlayerCharacterTokenProps {
  avatarId?: AvatarId;
  playerName?: string;
  targetXPercent: number; // 0 to 1
  targetY: number; // Absolute Y pixels
  containerWidth: number;
  onMovementComplete?: () => void;
  isMoving?: boolean;
}

export function PlayerCharacterToken({
  avatarId,
  playerName = "Player",
  targetXPercent,
  targetY,
  containerWidth,
  onMovementComplete,
  isMoving = false,
}: PlayerCharacterTokenProps) {
  // Find avatar metadata
  const avatarDef = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

  const targetX = targetXPercent * containerWidth;

  const posX = useSharedValue(targetX);
  const posY = useSharedValue(targetY);
  const hopY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Animate movement when target position changes
  useEffect(() => {
    if (Math.abs(posX.value - targetX) > 1 || Math.abs(posY.value - targetY) > 1) {
      // Hopping animation during travel
      hopY.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) })
        ),
        4,
        true
      );

      // Smooth path interpolation
      posX.value = withTiming(targetX, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
      posY.value = withTiming(targetY, { duration: 1400, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          // Celebration hop on arrival
          hopY.value = withSequence(
            withSpring(-24, { damping: 8, stiffness: 150 }),
            withSpring(0, { damping: 12 })
          );
          scale.value = withSequence(
            withTiming(1.25, { duration: 180 }),
            withTiming(1.0, { duration: 200 })
          );
          if (onMovementComplete) {
            runOnJS(onMovementComplete)();
          }
        }
      });
    } else {
      posX.value = targetX;
      posY.value = targetY;
    }
  }, [targetX, targetY, containerWidth]);

  // Idle breathing animation when stationary
  useEffect(() => {
    if (!isMoving) {
      hopY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }
  }, [isMoving]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value - 28 }, // center offset
      { translateY: posY.value - 48 + hopY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      {/* Shadow underneath avatar */}
      <View style={styles.shadow} />

      {/* Avatar Avatar Container */}
      <View style={styles.avatarBubble}>
        <Text style={styles.avatarEmoji}>{avatarDef.emoji}</Text>
      </View>

      {/* Player name / You indicator */}
      <View style={styles.nameTag}>
        <Text style={styles.nameText} numberOfLines={1}>
          {playerName}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 70,
    zIndex: 99,
  },
  shadow: {
    position: "absolute",
    bottom: 2,
    width: 32,
    height: 8,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F59E0B",
    borderColor: "#FEF08A",
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  nameTag: {
    marginTop: 2,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderColor: "#F59E0B",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  nameText: {
    color: "#FEF08A",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
});
