import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme";

const { width, height } = Dimensions.get("window");

export interface TokenFlyRef {
  trigger: (x: number, y: number, amount: number) => void;
}

export const TokenFlyAnimation = forwardRef<TokenFlyRef>((props, ref) => {
  const { colors } = useTheme();
  
  const [tokens, setTokens] = useState<{ id: number, x: number, y: number, amount: number }[]>([]);
  const nextId = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    trigger: (x: number, y: number, amount: number) => {
      const id = nextId.value++;
      setTokens(prev => [...prev, { id, x, y, amount }]);
    }
  }));

  const removeToken = (id: number) => {
    setTokens(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      {tokens.map(token => (
        <TokenParticle
          key={token.id}
          token={token}
          onComplete={() => removeToken(token.id)}
          colors={colors}
        />
      ))}
    </>
  );
});

const TokenParticle = ({ token, onComplete, colors }: { token: any, onComplete: () => void, colors: any }) => {
  const translateX = useSharedValue(token.x);
  const translateY = useSharedValue(token.y);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Pop out
    scale.value = withSequence(
      withSpring(1.5, { damping: 12 }),
      withTiming(1, { duration: 100 })
    );

    // Fly to top right (assuming token balance is top right)
    const targetX = width - 40;
    const targetY = 50;

    setTimeout(() => {
      translateX.value = withTiming(targetX, { duration: 600, easing: Easing.inOut(Easing.cubic) });
      translateY.value = withTiming(targetY, { duration: 600, easing: Easing.inOut(Easing.cubic) });
      scale.value = withTiming(0.2, { duration: 600 });
      opacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    }, 400); // stay on screen for a moment before flying
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Ionicons name="cash" size={40} color={colors.brandSecondary} />
      <Animated.Text style={[styles.text, { color: colors.brandSecondary }]}>+{token.amount}</Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  text: {
    fontSize: 24,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  }
});
