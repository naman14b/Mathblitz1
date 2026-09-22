import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/theme";

const { width, height } = Dimensions.get("window");

// Pre-seeded particle configurations to avoid random regeneration on re-renders
const PARTICLES_CONFIG = [
  { id: 0, symbol: "+", size: 36, xPct: 0.08, duration: 18000, delay: 0, color: "#4FC3F7" },
  { id: 1, symbol: "×", size: 48, xPct: 0.22, duration: 22000, delay: 3000, color: "#81C784" },
  { id: 2, symbol: "÷", size: 42, xPct: 0.40, duration: 20000, delay: 6000, color: "#FFCA28" },
  { id: 3, symbol: "π", size: 52, xPct: 0.58, duration: 26000, delay: 1000, color: "#FF8A65" },
  { id: 4, symbol: "√", size: 44, xPct: 0.75, duration: 21000, delay: 4000, color: "#BA68C8" },
  { id: 5, symbol: "∑", size: 40, xPct: 0.88, duration: 24000, delay: 7000, color: "#F06292" },
  { id: 6, symbol: "∞", size: 46, xPct: 0.15, duration: 25000, delay: 8000, color: "#64B5F6" },
  { id: 7, symbol: "∆", size: 38, xPct: 0.33, duration: 19000, delay: 2000, color: "#81C784" },
  { id: 8, symbol: "-", size: 50, xPct: 0.50, duration: 23000, delay: 5000, color: "#FFCA28" },
  { id: 9, symbol: "7", size: 34, xPct: 0.68, duration: 27000, delay: 9000, color: "#BA68C8" },
  { id: 10, symbol: "9", size: 42, xPct: 0.82, duration: 20000, delay: 3500, color: "#4FC3F7" },
  { id: 11, symbol: "3", size: 36, xPct: 0.93, duration: 22000, delay: 6500, color: "#FF8A65" },
];

const SmoothParticle = React.memo(({ config }: { config: typeof PARTICLES_CONFIG[0] }) => {
  const startX = config.xPct * width;
  const startY = height + 60;

  const translateY = useSharedValue(startY);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(-120, { duration: config.duration, easing: Easing.linear }),
        -1,
        false
      )
    );

    rotation.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(360, { duration: config.duration * 1.4, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [config.delay, config.duration, rotation, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: startX },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.particleText,
          {
            fontSize: config.size,
            color: config.color,
          },
        ]}
      >
        {config.symbol}
      </Text>
    </Animated.View>
  );
});

export const SurrealBackground = React.memo(function SurrealBackground() {
  return (
    <LinearGradient
      colors={["#FFFDF8", "#FFF4EC", "#E1F5FE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
      pointerEvents="none"
    >
      {PARTICLES_CONFIG.map((config) => (
        <SmoothParticle key={config.id} config={config} />
      ))}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    opacity: 0.35,
  },
  particleText: {
    fontWeight: "900",
  },
});
