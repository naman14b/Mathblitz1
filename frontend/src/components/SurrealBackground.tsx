import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { useTheme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const NUM_PARTICLES = 15;
const ICONS = ["close", "add", "remove", "medical", "square", "ellipse", "triangle"];

const Particle = ({ index }: { index: number }) => {
  const { colors } = useTheme();
  
  // Random starting positions and properties
  const startX = Math.random() * width;
  const startY = height + Math.random() * 400;
  const size = 10 + Math.random() * 30;
  const opacity = 0.1 + Math.random() * 0.3;
  const duration = 10000 + Math.random() * 20000;
  const delay = Math.random() * 5000;
  
  const iconName = ICONS[Math.floor(Math.random() * ICONS.length)] as any;

  const translateY = useSharedValue(startY);
  const rotation = useSharedValue(0);

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
        withTiming(360, { duration: duration * 1.5, easing: Easing.linear }),
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
        { left: startX, opacity, width: size, height: size },
        animatedStyle,
      ]}
    >
      <Ionicons name={iconName} size={size} color={colors.brandPrimary} />
    </Animated.View>
  );
};

export function SurrealBackground() {
  const { colors } = useTheme();

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
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  particle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
