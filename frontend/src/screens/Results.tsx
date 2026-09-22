import { useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, Text, View, Pressable } from "react-native";
import { GameResult } from "@/src/game/types";
import { BrandMark, PrimaryButton, ScreenTitle, SoftButton, StatTile } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";
import { AdBanner } from "@/src/components/AdBanner";
import { showRewardedAd } from "@/src/services/ads";

const SARCASM_BEST = [
  "Look at you breaking records! The calculator is shaking.",
  "New personal best! Are you secretly a math genius?",
  "Wow, you actually did it. I'm slightly impressed!",
  "A new high score! Don't let it go to your head now.",
  "Incredible! I'd clap, but I don't have hands.",
];

const SARCASM_NORMAL = [
  "Not bad! For a human, at least.",
  "Great blitz! Practice makes perfect... eventually.",
  "Solid effort! Let's see if you can go even faster.",
  "You survived! But I know you can do better.",
  "Math is easy, right? Prove it by playing again!",
];

export function Results({
  result,
  isNewBest,
  tokenBalance,
  onAgain,
  onHome,
  onGrantBonusTokens,
}: {
  result: GameResult;
  isNewBest: boolean;
  tokenBalance: number;
  onAgain: () => void;
  onHome: () => void;
  onGrantBonusTokens?: (amount: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [adRewardClaimed, setAdRewardClaimed] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const tokensLabel = result.tokensClaimed
    ? result.tokens >= 0
      ? `+${result.tokens} tokens`
      : `${result.tokens} tokens`
    : "No tokens · daily limit reached";

  const titleText = useMemo(() => {
    const array = isNewBest ? SARCASM_BEST : SARCASM_NORMAL;
    return array[Math.floor(Math.random() * array.length)];
  }, [isNewBest]);

  const handleWatchAd = async () => {
    if (adRewardClaimed || isAdLoading) return;
    setIsAdLoading(true);
    const success = await showRewardedAd(() => {
      setAdRewardClaimed(true);
      if (onGrantBonusTokens) {
        onGrantBonusTokens(10);
      }
    });
    setIsAdLoading(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 25,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BrandMark />
        <View style={styles.header}>
          <View style={styles.celebrate}>
            <Ionicons name={isNewBest ? "trophy" : "sparkles"} size={25} color={colors.onBrandSecondary} />
          </View>
          <ScreenTitle
            eyebrow={isNewBest ? "New personal best" : "Time well spent"}
            title={titleText}
            subtitle="Every question makes your thinking faster."
          />
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>FINAL SCORE</Text>
          <Text style={styles.score}>{result.score}</Text>
          <View style={styles.pillRow}>
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={15} color={colors.onBrandSecondary} />
              <Text style={styles.xpText}>+{result.xp} XP</Text>
            </View>
            <View testID="results-tokens" style={[styles.tokenPill, !result.tokensClaimed && styles.tokenPillMuted]}>
              <Ionicons name="pricetag" size={14} color={result.tokensClaimed ? colors.onBrandTertiary : colors.muted} />
              <Text style={[styles.tokenText, !result.tokensClaimed && styles.tokenTextMuted]}>{tokensLabel}</Text>
            </View>
          </View>
          <Text style={styles.balance}>
            Balance: <Text style={styles.balanceStrong}>{tokenBalance + (adRewardClaimed ? 10 : 0)} tokens</Text>
          </Text>
        </View>

        {/* Rewarded Ad Bonus Tokens Card */}
        <Pressable
          onPress={handleWatchAd}
          disabled={adRewardClaimed || isAdLoading}
          style={[styles.adRewardCard, adRewardClaimed && styles.adRewardClaimed]}
        >
          <Ionicons
            name={adRewardClaimed ? "checkmark-circle" : "gift"}
            size={22}
            color={adRewardClaimed ? colors.success : colors.brandPrimary}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.adRewardTitle}>
              {adRewardClaimed ? "Bonus Claimed! +10 Tokens" : isAdLoading ? "Loading Ad..." : "Watch Ad for +10 Bonus Tokens 🪙"}
            </Text>
            <Text style={styles.adRewardSub}>
              {adRewardClaimed ? "Tokens added to your wallet" : "Support MathBlitz & double your reward!"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.stats}>
          <StatTile icon="checkmark-circle" value={`${result.accuracy}%`} label="Accuracy" color={colors.surfaceTertiary} />
          <StatTile icon="flash" value={String(result.bestCombo)} label="Best combo" color={colors.brandTertiary} />
          <StatTile icon="calculator" value={String(result.correct)} label="Correct" color={colors.surfaceSecondary} />
        </View>

        <View style={styles.benchmark}>
          <Text style={styles.benchmarkTitle}>Your next edge</Text>
          <Text style={styles.benchmarkCopy}>Keep your combo alive for bigger multipliers and more speed bonuses.</Text>
          <View style={styles.miniRow}>
            <Ionicons name="medal-outline" size={20} color={colors.brandPrimary} />
            <Text style={styles.miniText}>
              Personal best: <Text style={styles.miniBold}>{result.personalBest}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton onPress={onAgain} icon="refresh">
            Play again
          </PrimaryButton>
          <SoftButton onPress={onHome} icon="home-outline">
            Back to home
          </SoftButton>
        </View>

        <AdBanner style={{ marginTop: 18 }} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 40, marginBottom: 22 },
  celebrate: { width: 55, height: 55, borderRadius: 19, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  scoreCard: { backgroundColor: colors.brandPrimary, borderRadius: 26, minHeight: 210, alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 20 },
  scoreLabel: { color: colors.brandTertiary, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  score: { color: colors.onBrandPrimary, fontSize: 56, lineHeight: 64, fontWeight: "900" },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 },
  xpPill: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.brandSecondary, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  xpText: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "900" },
  tokenPill: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  tokenPillMuted: { backgroundColor: colors.surfaceSecondary },
  tokenText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "900" },
  tokenTextMuted: { color: colors.muted },
  balance: { color: colors.brandTertiary, fontSize: 12, fontWeight: "700", marginTop: 4 },
  balanceStrong: { color: colors.onBrandPrimary, fontWeight: "900" },
  adRewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary + "44",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  adRewardClaimed: {
    borderColor: colors.success + "66",
    backgroundColor: colors.surfaceTertiary,
  },
  adRewardTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "900" },
  adRewardSub: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  stats: { flexDirection: "row", gap: 9, marginTop: 16 },
  benchmark: { backgroundColor: colors.surfaceSecondary, borderRadius: 22, padding: 18, marginTop: 21, gap: 8 },
  benchmarkTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900" },
  benchmarkCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  miniRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  miniText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  miniBold: { color: colors.onSurface, fontWeight: "900" },
  actions: { gap: 11, marginTop: 22 },
}));
