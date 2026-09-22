import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { AGE_GROUPS, AVATARS, LocalProfile, ACHIEVEMENTS, PREMIUM_BADGES, STREAK_MILESTONES } from "@/src/game/types";
import { BrandMark, IconButton, ScreenTitle, SoftButton, StatTile } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";
import { AdBanner } from "@/src/components/AdBanner";

type HomeProps = {
  profile: LocalProfile;
  onPlay: () => void;
  onSudoku: () => void;
  onMathsPuzzles: () => void;
  onSettings: () => void;
  onAge: () => void;
  onChallenge: (tier: any, rapid?: boolean) => void;
  onDailyChallenge: () => void;
  onLeaderboards: () => void;
  onAchievements: () => void;
  onThemeStore: () => void;
  onHowToPlay: () => void;
};

// Interactive card component that rises 3px on press
function AnimatedPressableCard({
  children,
  onPress,
  style,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  testID?: string;
}) {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    translateY.value = withTiming(-3, { duration: 120 });
  };

  const handlePressOut = () => {
    translateY.value = withSpring(0, { damping: 15 });
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// Subtle background particles behind the Hero Card
function HeroParticles() {
  const p1Y = useSharedValue(0);
  const p2Y = useSharedValue(0);

  useEffect(() => {
    p1Y.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    p2Y.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-10, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const p1Style = useAnimatedStyle(() => ({ transform: [{ translateY: p1Y.value }] }));
  const p2Style = useAnimatedStyle(() => ({ transform: [{ translateY: p2Y.value }] }));

  return (
    <View style={stylesLocal.heroParticleContainer} pointerEvents="none">
      <Animated.Text style={[stylesLocal.heroParticleText, { top: 12, left: 140 }, p1Style]}>
        +
      </Animated.Text>
      <Animated.Text style={[stylesLocal.heroParticleText, { bottom: 16, left: 90 }, p2Style]}>
        ÷
      </Animated.Text>
      <Animated.Text style={[stylesLocal.heroParticleText, { top: 40, right: 100 }, p1Style]}>
        ×
      </Animated.Text>
    </View>
  );
}

export function Home({
  profile,
  onPlay,
  onSettings,
  onAge,
  onChallenge,
  onDailyChallenge,
  onHowToPlay,
}: HomeProps) {
  const insets = useSafeAreaInsets();
  const { colors, isNight, toggleThemeMode } = useTheme();
  const styles = useStyles();

  const today = new Date().toISOString().slice(0, 10);
  const age = AGE_GROUPS.find((item) => item.id === profile.ageGroup);
  const days = Math.min(profile.streak, 7);
  const daysTo3 = Math.max(0, 3 - profile.streak);
  const daysTo7 = Math.max(0, 7 - profile.streak);
  const unlocked3 = profile.streak >= 3;
  const unlocked7 = profile.streak >= 7;
  const is3ClaimedToday = profile.challengeClaims?.["3-day"] === today;
  const is7ClaimedToday = profile.challengeClaims?.["7-day"] === today;
  const dailyDone = profile.dailyChallengeDate === today && profile.dailyChallengeCompleted;
  const instagramUrl = "https://www.instagram.com/bansal_tutorials25?stkn=MWNxaWJlOXVpMzNhMQ==";

  // --- Streak Milestone Progression ---
  const currentMilestone = profile.streakMilestone ?? 3;
  const daysToMilestone = Math.max(0, currentMilestone - profile.streak);
  const milestoneProgress = Math.min(1, profile.streak / currentMilestone);
  const milestoneReached = profile.streak >= currentMilestone;
  const isMaxMilestone = currentMilestone >= STREAK_MILESTONES[STREAK_MILESTONES.length - 1];

  // Milestone label  
  const milestoneLabel = milestoneReached && isMaxMilestone
    ? "🏆 Max streak champion!"
    : milestoneReached
    ? `🎉 ${currentMilestone}-day milestone reached!`
    : `${daysToMilestone} day${daysToMilestone === 1 ? "" : "s"} to ${currentMilestone}-day goal`;

  // Up to 2 equipped badges visible next to name
  const equippedBadgeIds = (profile.equippedBadges && profile.equippedBadges.length > 0)
    ? profile.equippedBadges.slice(0, 2)
    : ([profile.equippedAchievementBadge, profile.equippedPremiumBadge].filter(Boolean) as string[]);

  const activePremiumFrame = equippedBadgeIds
    .map((id) => PREMIUM_BADGES.find((p) => p.id === id))
    .find(Boolean);

  // Streak flame pulse animation
  const flameScale = useSharedValue(1);
  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  // Hero 60 SEC timer pulse animation
  const timerScale = useSharedValue(1);
  useEffect(() => {
    timerScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1100, easing: Easing.sin })
      ),
      -1,
      true
    );
  }, []);

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  // Token icon tiny bounce when tokens change
  const tokenScale = useSharedValue(1);
  useEffect(() => {
    tokenScale.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 200 }),
      withSpring(1.0, { damping: 8, stiffness: 150 })
    );
  }, [profile.tokens]);

  const tokenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tokenScale.value }],
  }));

  // Animated number counters on screen mount
  const [displayBest, setDisplayBest] = useState(0);
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    let bestFrame: any;
    let xpFrame: any;

    const targetBest = profile.personalBest || 0;
    const targetXp = profile.totalXp || 0;

    let currentBest = 0;
    let currentXp = 0;

    const stepBest = () => {
      if (currentBest < targetBest) {
        currentBest += Math.max(1, Math.ceil((targetBest - currentBest) / 6));
        setDisplayBest(currentBest);
        bestFrame = requestAnimationFrame(stepBest);
      } else {
        setDisplayBest(targetBest);
      }
    };

    const stepXp = () => {
      if (currentXp < targetXp) {
        currentXp += Math.max(1, Math.ceil((targetXp - currentXp) / 6));
        setDisplayXp(currentXp);
        xpFrame = requestAnimationFrame(stepXp);
      } else {
        setDisplayXp(targetXp);
      }
    };

    stepBest();
    stepXp();

    return () => {
      cancelAnimationFrame(bestFrame);
      cancelAnimationFrame(xpFrame);
    };
  }, [profile.personalBest, profile.totalXp]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topbar}>
          <BrandMark compact />
          <View style={styles.actions}>
            <IconButton
              name={isNight ? "moon" : "sunny"}
              label={isNight ? "Switch to Day Mode" : "Switch to Night Mode"}
              color={isNight ? "#FBBF24" : "#F59E0B"}
              onPress={() => toggleThemeMode?.()}
            />
            <IconButton name="settings-outline" label="Open settings" onPress={onSettings} />
          </View>
        </View>

        {/* Space revealing character artwork (Astronaut / Boy) */}
        <View style={{ height: 80 }} pointerEvents="none" />

        {/* Greetings Header with Equipped Badges (Up to 2) */}
        <View style={[styles.greetingCard, isNight ? styles.greetingCardNight : styles.greetingCardDay]}>
          <View style={styles.playerCardRow}>
            <View
              style={[
                styles.playerAvatarContainer,
                activePremiumFrame && {
                  borderColor: activePremiumFrame.borderColor,
                  borderWidth: 3.5,
                  backgroundColor: activePremiumFrame.gradient[0],
                },
              ]}
            >
              <Text style={styles.playerAvatarEmoji}>
                {(profile.avatar && AVATARS.find((a) => a.id === profile.avatar)?.emoji) ||
                  equippedBadgeIds.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.emoji).find(Boolean) || "👤"}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.greetingTitle}>
                  Hello, {profile.playerName || "Player"}!
                </Text>
                {equippedBadgeIds.map((id) => {
                  const ach = ACHIEVEMENTS.find((a) => a.id === id);
                  if (ach) {
                    return (
                      <View key={id} style={styles.equippedBadgePill}>
                        <Text style={styles.equippedBadgeText}>
                          {ach.emoji} {ach.title}
                        </Text>
                      </View>
                    );
                  }
                  const prem = PREMIUM_BADGES.find((p) => p.id === id);
                  if (prem) {
                    return (
                      <View key={id} style={[styles.equippedFramePill, { backgroundColor: prem.borderColor }]}>
                        <Text style={styles.equippedFrameText}>
                          ✨ {prem.name}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
              <Text style={styles.greetingSubtitle}>
                {age?.label ?? "Your pace"} · {age?.topics ?? "Choose your level in settings"}
              </Text>
            </View>
          </View>
        </View>

        {/* Streak System Card with 3-Day & 7-Day Interactive Challenges */}
        <View style={[styles.streakCard, isNight ? styles.streakCardNight : styles.streakCardDay]}>
          <View style={styles.streakHeader}>
            <Animated.View style={[styles.streakIcon, flameAnimatedStyle]}>
              <Ionicons name="flame" size={24} color={colors.warning} />
            </Animated.View>
            <View style={styles.streakCopy}>
              <Text style={styles.streakTitle}>
                {profile.streak > 0 ? `${profile.streak}-day streak` : "Start your streak"}
              </Text>
              <Text testID="home-streak-countdown" style={styles.streakSub}>
                {milestoneReached && isMaxMilestone
                  ? "Ultimate streak champion!"
                  : milestoneReached
                  ? `${currentMilestone}-day milestone reached! Keep going!`
                  : currentMilestone <= 7
                  ? (unlocked7
                    ? "Blitz master unlocked!"
                    : unlocked3
                    ? `3-day unlocked · ${daysTo7} day${daysTo7 === 1 ? "" : "s"} to Blitz master`
                    : `${daysTo3} day${daysTo3 === 1 ? "" : "s"} to Quickfire · ${daysTo7} to Blitz master`)
                  : `Next goal: ${currentMilestone}-day streak (${daysToMilestone}d remaining)`}
              </Text>
            </View>
            <Text style={styles.streakCount}>{profile.streak}/{currentMilestone}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(8, milestoneProgress * 100)}%` }]}>
              <Text style={styles.rocketOnTrack}>🚀</Text>
            </View>
          </View>

          {/* Milestone label */}
          <View style={styles.streakFoot}>
            <Text style={styles.streakFootText}>
              {milestoneLabel}
            </Text>
            <Text style={styles.streakFootText}>
              {profile.streak}/{currentMilestone}
            </Text>
          </View>

          {/* Streak Challenges Section */}
          <View style={styles.streakChallengesBox}>
            <Text style={styles.streakChallengesTitle}>STREAK CHALLENGES</Text>

            {/* 3-Day Streak Challenge Card */}
            <View style={[styles.streakChallengeCard, isNight ? styles.streakChallengeCardNight : styles.streakChallengeCardDay]}>
              <View style={styles.streakChallengeBadge}>
                <Text style={styles.streakChallengeBadgeText}>⚡</Text>
              </View>
              <View style={styles.streakChallengeInfo}>
                <Text style={styles.streakChallengeName}>3-Day Quickfire</Text>
                <Text style={styles.streakChallengeDesc}>
                  {unlocked3 ? "Test your speed · +20 tokens" : `Need 3-day streak (${daysTo3}d remaining)`}
                </Text>
              </View>
              {is3ClaimedToday ? (
                <View style={styles.challengeClaimedPill}>
                  <Text style={styles.challengeClaimedText}>✓ Done</Text>
                </View>
              ) : unlocked3 ? (
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <Pressable
                    testID="play-streak-3"
                    onPress={() => onChallenge("3-day")}
                    style={({ pressed }) => [styles.challengePlayBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={styles.challengePlayBtnText}>Play →</Text>
                  </Pressable>
                  <Pressable
                    testID="play-streak-3-rapid"
                    onPress={() => onChallenge("3-day", true)}
                    style={({ pressed }) => [styles.rapidPlayBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={styles.rapidPlayBtnText}>🔥 Rapid</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.challengeLockedPill}>
                  <Text style={styles.challengeLockedText}>🔒 {daysTo3}d</Text>
                </View>
              )}
            </View>

            {/* 7-Day Blitz Master Challenge Card */}
            <View style={[styles.streakChallengeCard, isNight ? styles.streakChallengeCardNight : styles.streakChallengeCardDay]}>
              <View style={styles.streakChallengeBadge}>
                <Text style={styles.streakChallengeBadgeText}>👑</Text>
              </View>
              <View style={styles.streakChallengeInfo}>
                <Text style={styles.streakChallengeName}>7-Day Blitz Master</Text>
                <Text style={styles.streakChallengeDesc}>
                  {unlocked7 ? "Ultimate test · +30 tokens" : `Need 7-day streak (${daysTo7}d remaining)`}
                </Text>
              </View>
              {is7ClaimedToday ? (
                <View style={styles.challengeClaimedPill}>
                  <Text style={styles.challengeClaimedText}>✓ Done</Text>
                </View>
              ) : unlocked7 ? (
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <Pressable
                    testID="play-streak-7"
                    onPress={() => onChallenge("7-day")}
                    style={({ pressed }) => [styles.challengePlayBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={styles.challengePlayBtnText}>Play →</Text>
                  </Pressable>
                  <Pressable
                    testID="play-streak-7-rapid"
                    onPress={() => onChallenge("7-day", true)}
                    style={({ pressed }) => [styles.rapidPlayBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={styles.rapidPlayBtnText}>🔥 Rapid</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.challengeLockedPill}>
                  <Text style={styles.challengeLockedText}>🔒 {daysTo7}d</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tokens & How to Play Chip */}
          <View testID="home-token-badge" style={styles.tokenBar}>
            <Animated.View style={[styles.tokenIcon, tokenAnimatedStyle]}>
              <Ionicons name="pricetag" size={15} color={colors.onBrandPrimary} />
            </Animated.View>
            <View style={styles.tokenCopy}>
              <Text style={styles.tokenValue}>{profile.tokens}</Text>
              <Text style={styles.tokenLabel}>tokens earned</Text>
            </View>
            <Pressable
              testID="home-how-to-play"
              onPress={onHowToPlay}
              style={({ pressed }) => [styles.howToChip, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.brandPrimary} />
              <Text style={styles.howToChipText}>How to play</Text>
            </Pressable>
          </View>
        </View>

        {/* Daily Challenge Card */}
        <AnimatedPressableCard
          testID="home-daily-challenge"
          onPress={onDailyChallenge}
          style={[styles.dailyCard, isNight ? styles.dailyCardNight : styles.dailyCardDay]}
        >
          <View style={styles.dailyHeaderRow}>
            <View style={styles.dailyTag}>
              <Ionicons name="calendar" size={14} color={colors.brandPrimary} />
              <Text style={styles.dailyTagText}>DAILY CHALLENGE</Text>
            </View>
            <View style={[styles.dailyRewardPill, dailyDone && styles.dailyRewardPillDone]}>
              <Ionicons
                name={dailyDone ? "checkmark-circle" : "star"}
                size={13}
                color={dailyDone ? colors.success : "#D97706"}
              />
              <Text style={[styles.dailyRewardText, dailyDone && { color: colors.success }]}>
                {dailyDone ? `Done (${profile.dailyChallengeScore} pts)` : "+5 Tokens"}
              </Text>
            </View>
          </View>

          <View style={styles.dailyBody}>
            <View style={styles.dailyIconBadge}>
              <Text style={styles.dailyIconText}>📅</Text>
            </View>
            <View style={styles.dailyCopy}>
              <Text style={styles.dailyTitle}>Daily Math Sprint</Text>
              <Text style={styles.dailySub}>
                {dailyDone
                  ? `Completed today! Your score was ${profile.dailyChallengeScore} pts. Tap to play again.`
                  : "Solve rapid arithmetic problems in 2 mins. Keep your brain razor sharp!"}
              </Text>
            </View>
          </View>

          <View style={styles.dailyFooter}>
            <View style={[styles.dailyBtn, dailyDone && styles.dailyBtnDone]}>
              <Text style={[styles.dailyBtnText, dailyDone && styles.dailyBtnTextDone]}>
                {dailyDone ? "Play Sprint Again" : "Play Daily Challenge"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={dailyDone ? colors.onSurface : colors.onBrandPrimary}
              />
            </View>
          </View>
        </AnimatedPressableCard>

        {/* Hero 60 SEC Challenge Card with Rising Hover Effect */}
        <AnimatedPressableCard testID="play-challenge" onPress={onPlay} style={styles.hero}>
          <HeroParticles />
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>60-SECOND CHALLENGE</Text>
            <Text style={styles.heroTitle}>How fast can you think?</Text>
            <Text style={styles.heroSub}>Answer as many as you can before time runs out.</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Play now</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
            </View>
          </View>

          <Animated.View style={[styles.heroOrb, timerAnimatedStyle]}>
            <Text style={styles.heroOrbText}>60</Text>
            <Text style={styles.heroOrbLabel}>SEC</Text>
          </Animated.View>
        </AnimatedPressableCard>

        {/* Progress & Stats Section directly adjacent to 60-sec challenge */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Your progress</Text>
          <SoftButton onPress={onAge} icon="options-outline">
            Change level
          </SoftButton>
        </View>
        <View style={styles.stats}>
          <StatTile
            icon="trophy"
            value={String(displayBest)}
            label="Personal best"
            color={colors.surfaceTertiary}
          />
          <StatTile
            icon="sparkles"
            value={String(displayXp)}
            label="Total XP"
            color={colors.surfaceSecondary}
          />
          <StatTile
            icon="flash"
            value={String(profile.streak)}
            label="Best streak"
            color={colors.brandTertiary}
          />
        </View>

        <Text style={styles.tip}>
          <Ionicons name="bulb-outline" size={15} color={colors.brandPrimary} /> Fast answers earn a speed bonus.
        </Text>

        {/* Footer Presenter */}
        <View style={styles.presenter}>
          <Text style={styles.presenterText}>
            Presented by <Text style={styles.presenterStrong}>Bansal Tutorials</Text>
          </Text>
          <Pressable
            testID="instagram-link"
            accessibilityRole="link"
            accessibilityLabel="Open Bansal Tutorials on Instagram"
            onPress={() => Linking.openURL(instagramUrl)}
            style={({ pressed }) => [styles.instagram, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="logo-instagram" size={17} color={colors.info} />
            <Text style={styles.instagramText}>@bansal_tutorials25</Text>
          </Pressable>
        </View>
        <AdBanner />
      </ScrollView>
    </View>
  );
}

const stylesLocal = {
  heroParticleContainer: {
    ...stylesLocalAbsolute,
  },
  heroParticleText: {
    position: "absolute" as const,
    color: "rgba(255, 255, 255, 0.25)",
    fontSize: 22,
    fontWeight: "900" as const,
  },
};

function stylesLocalAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}

const useStyles = makeStyles((colors: any) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 8 },
  greetingCard: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  greetingCardNight: {
    backgroundColor: "rgba(12, 18, 42, 0.78)",
    borderColor: "rgba(59, 130, 246, 0.32)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  greetingCardDay: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  playerCardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  playerAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarEmoji: { fontSize: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  greetingTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  greetingSubtitle: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: 2 },
  equippedBadgePill: {
    backgroundColor: colors.brandSecondary + "33",
    borderWidth: 1,
    borderColor: colors.brandSecondary,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  equippedBadgeText: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  equippedFramePill: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  equippedFrameText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  streakCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  streakCardNight: {
    backgroundColor: "rgba(12, 17, 38, 0.82)",
    borderColor: "rgba(59, 130, 246, 0.28)",
  },
  streakCardDay: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  streakHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  streakIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255, 183, 3, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  streakCopy: { flex: 1, gap: 3 },
  streakTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  streakSub: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  streakCount: { color: colors.brandPrimary, fontSize: 17, fontWeight: "900" },
  progressTrack: {
    height: 9,
    borderRadius: 99,
    backgroundColor: colors.surfaceTertiary,
    marginTop: 17,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.warning,
    borderRadius: 99,
    position: "relative",
  },
  rocketOnTrack: {
    position: "absolute",
    right: -10,
    top: -7,
    fontSize: 16,
  },
  streakFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  streakFootText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  // Streak challenges inside streak card
  streakChallengesBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 8,
  },
  streakChallengesTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  streakChallengeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 10,
    gap: 10,
    borderWidth: 1,
  },
  streakChallengeCardNight: {
    backgroundColor: "rgba(18, 24, 52, 0.78)",
    borderColor: "rgba(59, 130, 246, 0.22)",
  },
  streakChallengeCardDay: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  streakChallengeBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  streakChallengeBadgeText: {
    fontSize: 18,
  },
  streakChallengeInfo: {
    flex: 1,
    gap: 2,
  },
  streakChallengeName: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "900",
  },
  streakChallengeDesc: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  challengePlayBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  challengePlayBtnText: {
    color: colors.onBrandPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  rapidPlayBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  rapidPlayBtnText: {
    color: "#1A1A1A",
    fontSize: 11,
    fontWeight: "900",
  },
  challengeClaimedPill: {
    backgroundColor: colors.success + "22",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.success,
  },
  challengeClaimedText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
  },
  challengeLockedPill: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
  },
  challengeLockedText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  // Daily Challenge Card styling
  dailyCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  dailyCardNight: {
    backgroundColor: "rgba(12, 17, 38, 0.82)",
    borderColor: "rgba(59, 130, 246, 0.28)",
  },
  dailyCardDay: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  dailyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dailyTagText: {
    color: colors.brandPrimary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dailyRewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  dailyRewardPillDone: {
    backgroundColor: colors.success + "22",
  },
  dailyRewardText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "900",
  },
  dailyBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dailyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyIconText: {
    fontSize: 24,
  },
  dailyCopy: {
    flex: 1,
    gap: 3,
  },
  dailyTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "900",
  },
  dailySub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  dailyFooter: {
    marginTop: 2,
  },
  dailyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 11,
    borderRadius: 14,
  },
  dailyBtnDone: {
    backgroundColor: colors.surfaceTertiary,
  },
  dailyBtnText: {
    color: colors.onBrandPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  dailyBtnTextDone: {
    color: colors.onSurface,
  },
  tokenBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenCopy: { flex: 1 },
  tokenValue: { color: colors.onSurface, fontSize: 16, fontWeight: "900" },
  tokenLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  howToChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    minHeight: 32,
    borderRadius: 99,
    backgroundColor: colors.surfaceTertiary,
  },
  howToChipText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "900" },
  hero: {
    backgroundColor: colors.brandPrimary,
    minHeight: 184,
    borderRadius: 26,
    padding: 22,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCopy: { flex: 1, zIndex: 1, gap: 7 },
  heroKicker: { color: colors.brandTertiary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 24, lineHeight: 29, fontWeight: "900", maxWidth: 215 },
  heroSub: { color: colors.brandTertiary, fontSize: 12, lineHeight: 17, maxWidth: 210 },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  heroCtaText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900" },
  heroOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
    marginRight: -24,
    shadowColor: colors.brandSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  heroOrbText: { color: colors.onBrandSecondary, fontSize: 40, lineHeight: 42, fontWeight: "900" },
  heroOrbLabel: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 9 },
  tip: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 22 },
  presenter: {
    alignItems: "center",
    gap: 8,
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  presenterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  presenterStrong: { color: colors.onSurface, fontWeight: "900" },
  instagram: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  instagramText: { color: colors.info, fontSize: 12, fontWeight: "900" },
}));
