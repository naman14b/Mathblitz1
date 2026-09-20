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
import { useTheme } from "@/src/theme";

const { width, height } = Dimensions.get("window");

const NUM_PARTICLES = 30; // More particles for math symbols
const SYMBOLS = ["+", "-", "×", "÷", "π", "√", "1", "2", "3", "4", "5", "7", "8", "9"];
const COLORS = ["#4FC3F7", "#81C784", "#FFCA28", "#FF8A65", "#BA68C8", "#F06292", "#64B5F6"];

const Particle = ({ index }: { index: number }) => {
  const startX = Math.random() * width;
  const startY = height + Math.random() * 400;
  const size = 30 + Math.random() * 60; // Font size variation
  const opacity = 0.5 + Math.random() * 0.4;
  const duration = 15000 + Math.random() * 25000;
  const delay = Math.random() * 8000;

  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  const translateY = useSharedValue(startY);
  const rotation = useSharedValue(Math.random() * 360);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-200, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(rotation.value + 360, { duration: duration * 1.5, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [delay, duration, rotation, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: startX, opacity },
        animatedStyle,
      ]}
    >
      <Text style={{ fontSize: size, color, fontWeight: '900', textShadowColor: 'rgba(255,255,255,0.7)', textShadowRadius: 10 }}>{symbol}</Text>
    </Animated.View>
  );
};

import { LinearGradient } from "expo-linear-gradient";

export function SurrealBackground() {
  const { scheme, colors } = useTheme();

  if (scheme === 'light') {
    return (
      <LinearGradient
        colors={['#E1F5FE', '#FFFFFF', '#B3E5FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.darkBackground }]}>
      {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
  },
  particle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
