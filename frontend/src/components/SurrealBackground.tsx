import React, { useEffect } from "react";
import { StyleSheet, View, Text, Image, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { useTheme } from "@/src/theme";

const BG_DAY = require("@/assets/images/bg-day.jpg");
const BG_NIGHT = require("@/assets/images/bg-night.jpg");

// Pre-seeded particle configurations
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

const SmoothParticle = React.memo(({
  config,
  isNight,
  screenWidth,
  screenHeight,
}: {
  config: typeof PARTICLES_CONFIG[0];
  isNight: boolean;
  screenWidth: number;
  screenHeight: number;
}) => {
  const startX = config.xPct * screenWidth;
  const startY = screenHeight + 60;

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
        { left: startX, opacity: isNight ? 0.45 : 0.3 },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.particleText,
          {
            fontSize: config.size,
            color: isNight ? config.color : "#1E293B",
          },
        ]}
      >
        {config.symbol}
      </Text>
    </Animated.View>
  );
});

export const SurrealBackground = React.memo(function SurrealBackground() {
  const { isNight } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isWidescreen = windowWidth > 640;
  // Aspect ratio of the artwork is 1080 / 2400 = 0.45
  const ART_ASPECT_RATIO = 1080 / 2400;
  const artWidth = isWidescreen ? Math.min(windowWidth, windowHeight * ART_ASPECT_RATIO) : "100%";

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Layer 1: Ambient Full-Bleed Gradient filling the entire screen */}
      <LinearGradient
        colors={
          isNight
            ? ["#04060F", "#0A1028", "#070B1C", "#04060F"]
            : ["#4FA5F8", "#6CB7FC", "#5CAAFB", "#3B82F6"]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2: Complete Artwork Layer (Fully visible, zoomed out to fit top to bottom) */}
      <View
        style={[
          styles.artWrapper,
          {
            width: artWidth,
            height: "100%",
            alignSelf: "center",
          },
        ]}
      >
        <Image
          source={isNight ? BG_NIGHT : BG_DAY}
          style={styles.artImage}
          resizeMode={isWidescreen ? "contain" : "cover"}
        />

        {/* Subtle readability scrim over the artwork */}
        <View
          style={[
            styles.scrim,
            isNight ? styles.scrimNight : styles.scrimDay,
          ]}
        />
      </View>

      {/* Layer 3: Smooth floating math particles across full screen width */}
      {PARTICLES_CONFIG.map((config) => (
        <SmoothParticle
          key={config.id}
          config={config}
          isNight={isNight}
          screenWidth={windowWidth}
          screenHeight={windowHeight}
        />
      ))}
    </View>
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
  artWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrimDay: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  scrimNight: {
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  particle: {
    position: "absolute",
  },
  particleText: {
    fontWeight: "900",
  },
});
