import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { useTheme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

type BlitzEnergyBarProps = {
  energy: number; // 0 to 100
  isBlitzMode: boolean;
};

export function BlitzEnergyBar({ energy, isBlitzMode }: BlitzEnergyBarProps) {
  const { colors } = useTheme();
  
  const widthVal = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    widthVal.value = withSpring(energy, { damping: 15 });
  }, [energy, widthVal]);

  useEffect(() => {
    if (isBlitzMode) {
      scale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 300 }), withTiming(1, { duration: 300 })),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    }
  }, [isBlitzMode, scale, opacity]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${widthVal.value}%`,
      backgroundColor: isBlitzMode ? colors.brandSecondary : colors.brandPrimary,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      borderColor: isBlitzMode ? colors.brandSecondary : colors.border,
      shadowColor: isBlitzMode ? colors.brandSecondary : "transparent",
      shadowOpacity: isBlitzMode ? 0.8 : 0,
      shadowRadius: isBlitzMode ? 10 : 0,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedContainerStyle, { backgroundColor: colors.surfaceTertiary }]}>
      <View style={styles.header}>
        <Ionicons name="flash" size={16} color={isBlitzMode ? colors.brandSecondary : colors.brandPrimary} />
        <Text style={[styles.title, { color: isBlitzMode ? colors.brandSecondary : colors.onSurface }]}>
          {isBlitzMode ? "BLITZ MODE!" : "Blitz Energy"}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
        <Animated.View style={[styles.fill, animatedProgressStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  track: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 6,
  },
});
