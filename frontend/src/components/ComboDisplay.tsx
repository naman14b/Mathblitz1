import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

type ComboDisplayProps = {
  combo: number;
};

export function ComboDisplay({ combo }: ComboDisplayProps) {
  const { colors } = useTheme();
  
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const [displayCombo, setDisplayCombo] = useState(combo);

  useEffect(() => {
    if (combo > 1) {
      setDisplayCombo(combo);
      translateY.value = 20;
      opacity.value = 1;
      
      scale.value = withSequence(
        withSpring(1.5, { damping: 10 }),
        withSpring(1, { damping: 12 })
      );
      
      translateY.value = withSpring(0, { damping: 12 });
      
      // Auto hide after some time if combo doesn't increase
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [combo, scale, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
      opacity: opacity.value,
    };
  });

  if (combo <= 1 && opacity.value === 0) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Ionicons name="flame" size={28} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        COMBO x{displayCombo}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: '30%',
    alignSelf: "center",
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFB703',
  },
  text: {
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8,
    fontStyle: "italic",
    textShadowColor: "rgba(255, 183, 3, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
