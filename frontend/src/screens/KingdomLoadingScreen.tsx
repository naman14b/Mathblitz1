/**
 * FunGanit Kingdom - Cinematic Portal Loading Screen
 * Displays stunning castle & stargate artwork, animated energy progress,
 * and rotating motivating & challenging math warrior tips.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { playSound } from "@/src/game/sounds";

const KINGDOM_LOADING_IMAGE = require("@/assets/images/kingdom-loading.jpg");

const MOTIVATIONAL_CHALLENGES = [
  {
    kicker: "⚔️ WARRIOR'S CREED",
    quote: "Only the sharpest minds conquer the 5 Realms. Trust your instincts and calculate swift!",
    realm: "Number Forest",
  },
  {
    kicker: "⚡ SPEED & PRECISION",
    quote: "Speed is your sword. Accuracy is your shield. Step boldly into the Kingdom portal!",
    realm: "Fraction Valley",
  },
  {
    kicker: "👑 BOSS CHALLENGE",
    quote: "Every guardian has a pattern. Every puzzle has a key. Discover yours and take the crown!",
    realm: "Percentage City",
  },
  {
    kicker: "🔥 MENTAL MASTERY",
    quote: "Calculations become second nature when courage meets daily practice. You are unstoppable!",
    realm: "Algebra Mountain",
  },
  {
    kicker: "🏰 LEGENDARY TRIAL",
    quote: "100 Levels. 5 Mythic Realms. Will your name be etched in the Kingdom Hall of Champions?",
    realm: "Geometry Castle",
  },
  {
    kicker: "💡 TACTICAL SECRET",
    quote: "Mistakes are merely stepping stones to mastery. Shake off any miss and strike again!",
    realm: "Kingdom Quests",
  },
  {
    kicker: "🎯 FOCUS & GLORY",
    quote: "Mental math is your superpower. Step through the gate and unleash your true potential!",
    realm: "FunGanit Kingdom",
  },
];

interface KingdomLoadingScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export function KingdomLoadingScreen({
  onComplete,
  minDurationMs = 2200,
}: KingdomLoadingScreenProps) {
  const insets = useSafeAreaInsets();

  // Select a random motivating quote
  const [activeTip] = useState(() => {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_CHALLENGES.length);
    return MOTIVATIONAL_CHALLENGES[idx];
  });

  const [displayPercent, setDisplayPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Opening Ancient Gateway...");

  // Animations
  const screenOpacity = useSharedValue(1);
  const bgScale = useSharedValue(1);
  const portalGlow = useSharedValue(0.4);
  const progressWidth = useSharedValue(0);

  const hasCompletedRef = useRef(false);

  const handleFinish = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    playSound("levelup");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Smooth fade out
    screenOpacity.value = withTiming(0, { duration: 350 }, (isFinished) => {
      if (isFinished) {
        runOnJS(onComplete)();
      }
    });
  };

  useEffect(() => {
    // Gentle breathing scale for background to feel alive
    bgScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 3000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Pulsing portal aura
    portalGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Progress bar animation
    progressWidth.value = withTiming(1, {
      duration: minDurationMs,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Numerical counter & status message updates
    const intervalMs = 40;
    const totalSteps = minDurationMs / intervalMs;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentPct = Math.min(100, Math.round((step / totalSteps) * 100));
      setDisplayPercent(currentPct);

      if (currentPct < 30) {
        setStatusMessage("Opening Ancient Gateway...");
      } else if (currentPct < 65) {
        setStatusMessage("Channeling Realm Mathematics...");
      } else if (currentPct < 90) {
        setStatusMessage("Summoning World Bosses & Quests...");
      } else {
        setStatusMessage("Portal Ready! Entering Kingdom...");
      }

      if (step >= totalSteps) {
        clearInterval(timer);
        setTimeout(handleFinish, 180);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, []);

  const animatedScreen = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const animatedBg = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
  }));

  const animatedPortalGlow = useAnimatedStyle(() => ({
    opacity: portalGlow.value,
  }));

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <Animated.View style={[styles.container, animatedScreen]}>
      {/* Background Castle & Portal Image */}
      <View style={styles.imageWrapper}>
        <Animated.Image
          source={KINGDOM_LOADING_IMAGE}
          style={[styles.backgroundImage, animatedBg]}
          resizeMode="cover"
        />
      </View>

      {/* Atmospheric Dark Gradient Overlays for contrast */}
      <View style={styles.topVignette} />
      <View style={styles.bottomVignette} />

      {/* Central Portal Pulsing Aura */}
      <Animated.View style={[styles.portalAuraCircle, animatedPortalGlow]} pointerEvents="none" />

      {/* Content Container */}
      <View
        style={[
          styles.contentOverlay,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.realmPill}>
            <Ionicons name="sparkles" size={13} color="#FBBF24" />
            <Text style={styles.realmPillText}>THE REALMS OF FUNGANIT</Text>
            <Ionicons name="sparkles" size={13} color="#FBBF24" />
          </View>
          <Text style={styles.mainTitle}>FUNGANIT KINGDOM</Text>
          <Text style={styles.subTitle}>100 Levels • 5 Math Worlds • Boss Battles</Text>
        </View>

        {/* Center Portal Space */}
        <View style={styles.centerSpace} />

        {/* Bottom Motivation & Progress Card */}
        <View style={styles.bottomCard}>
          {/* Motivation Quote Box */}
          <View style={styles.challengeBox}>
            <View style={styles.challengeHeaderRow}>
              <Text style={styles.challengeKicker}>{activeTip.kicker}</Text>
              <View style={styles.challengeRealmBadge}>
                <Ionicons name="map-outline" size={12} color="#38BDF8" />
                <Text style={styles.challengeRealmText}>{activeTip.realm}</Text>
              </View>
            </View>
            <Text style={styles.challengeQuote}>"{activeTip.quote}"</Text>
          </View>

          {/* Progress Bar & Status */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfoRow}>
              <View style={styles.statusRow}>
                <View style={styles.statusPulseDot} />
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
              <Text style={styles.percentText}>{displayPercent}%</Text>
            </View>

            {/* Glowing Progress Track */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, animatedProgressBar]} />
            </View>
          </View>

          {/* Optional Quick Skip Button */}
          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.skipBtnText}>Tap to enter immediately</Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#022C22",
    zIndex: 9999,
  },
  imageWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: "rgba(2, 44, 34, 0.75)",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(10, 15, 29, 0.88)",
  },
  portalAuraCircle: {
    position: "absolute",
    top: "37%",
    left: "50%",
    marginLeft: -110,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(56, 189, 248, 0.22)",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 35,
    elevation: 20,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  topHeader: {
    alignItems: "center",
  },
  realmPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.22)",
    borderColor: "#F59E0B",
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  realmPillText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subTitle: {
    color: "#A7F3D0",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 3,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  centerSpace: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  challengeBox: {
    backgroundColor: "rgba(30, 41, 59, 0.75)",
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  challengeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  challengeKicker: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  challengeRealmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  challengeRealmText: {
    color: "#7DD3FC",
    fontSize: 10,
    fontWeight: "700",
  },
  challengeQuote: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    fontStyle: "italic",
  },
  progressSection: {
    marginBottom: 10,
  },
  progressInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statusPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  statusText: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "600",
  },
  percentText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 8,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 6,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
  },
  skipBtnText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
});
