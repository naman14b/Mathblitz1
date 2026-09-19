import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { AGE_GROUPS, LocalProfile } from "@/src/game/types";
import { ChallengeTier } from "@/src/api/types";
import { BrandMark, IconButton, ScreenTitle, SoftButton, StatTile } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type HomeProps = {
  profile: LocalProfile;
  onPlay: () => void;
  onSudoku: () => void;
  onMathsPuzzles: () => void;
  onSettings: () => void;
  onAdmin: () => void;
  onAge: () => void;
  onChallenge: (tier: ChallengeTier) => void;
  onHowToPlay: () => void;
};

export function Home({
  profile,
  onPlay,
  onSettings,
  onAdmin,
  onAge,
  onChallenge,
  onHowToPlay,
  onSudoku,
  onMathsPuzzles,
}: HomeProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const age = AGE_GROUPS.find((item) => item.id === profile.ageGroup);
  const days = Math.min(profile.streak, 7);
  const daysTo3 = Math.max(0, 3 - profile.streak);
  const daysTo7 = Math.max(0, 7 - profile.streak);
  const unlocked3 = profile.streak >= 3;
  const unlocked7 = profile.streak >= 7;
  const instagramUrl = "https://www.instagram.com/bansal_tutorials25?stkn=MWNxaWJlOXVpMzNhMQ==";
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}><BrandMark compact /><View style={styles.actions}><IconButton name="shield-checkmark-outline" label="Open admin" onPress={onAdmin} /><IconButton name="settings-outline" label="Open settings" onPress={onSettings} /></View></View>
      <View style={styles.greeting}><ScreenTitle eyebrow="Ready when you are" title="Make your brain spark." subtitle={`${age?.label ?? "Your pace"} · ${age?.topics ?? "Choose your level in settings"}`} /></View>
      <View style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <View style={styles.streakIcon}><Ionicons name="flame" size={22} color={colors.onBrandSecondary} /></View>
          <View style={styles.streakCopy}>
            <Text style={styles.streakTitle}>{profile.streak > 0 ? `${profile.streak}-day streak` : "Start your streak"}</Text>
            <Text testID="home-streak-countdown" style={styles.streakSub}>{unlocked7 ? "Blitz master unlocked!" : unlocked3 ? `3-day unlocked · ${daysTo7} day${daysTo7 === 1 ? "" : "s"} to Blitz master` : `${daysTo3} day${daysTo3 === 1 ? "" : "s"} to Quickfire · ${daysTo7} to Blitz master`}</Text>
          </View>
          <Text style={styles.streakCount}>{days}/7</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, (days / 7) * 100)}%` }]} /></View>
        <View style={styles.streakFoot}><Text style={styles.streakFootText}>3 days: Quickfire · +20 tokens</Text><Text style={styles.streakFootText}>7 days: Blitz master · +30 tokens</Text></View>
        <View testID="home-token-badge" style={styles.tokenBar}>
          <View style={styles.tokenIcon}><Ionicons name="pricetag" size={15} color={colors.onBrandPrimary} /></View>
          <View style={styles.tokenCopy}>
            <Text style={styles.tokenValue}>{profile.tokens}</Text>
            <Text style={styles.tokenLabel}>tokens earned</Text>
          </View>
          <Pressable testID="home-how-to-play" onPress={onHowToPlay} style={({ pressed }) => [styles.howToChip, { opacity: pressed ? 0.7 : 1 }]}><Ionicons name="help-circle-outline" size={16} color={colors.brandPrimary} /><Text style={styles.howToChipText}>How to play</Text></Pressable>
        </View>
      </View>
      <Pressable testID="play-challenge" onPress={onPlay} style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>60-SECOND CHALLENGE</Text>
          <Text style={styles.heroTitle}>How fast can you think?</Text>
          <Text style={styles.heroSub}>Answer as many as you can before time runs out.</Text>
          <View style={styles.heroCta}><Text style={styles.heroCtaText}>Play now</Text><Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} /></View>
        </View>
        <View style={styles.heroOrb}><Text style={styles.heroOrbText}>60</Text><Text style={styles.heroOrbLabel}>SEC</Text></View>
      </Pressable>

      <UnlockCard
        testID="sudoku"
        title="Sudoku"
        description="250 puzzles across 5 difficulty levels."
        unlocked={true}
        onPress={onSudoku}
        icon="grid-outline"
        tone={colors.brandSecondary}
        accent={colors.onBrandSecondary}
      />

      <UnlockCard
        testID="maths-puzzles"
        title="Maths Puzzles"
        description="100 progressively challenging puzzles."
        unlocked={true}
        onPress={onMathsPuzzles}
        icon="calculator-outline"
        tone={colors.brandTertiary}
        accent={colors.onBrandTertiary}
      />

      <UnlockCard testID="challenge-3day" title="3-day Quickfire" description={unlocked3 ? "Timed image challenges. Tap to play." : `Play ${daysTo3} more day${daysTo3 === 1 ? "" : "s"} to unlock.`} unlocked={unlocked3} icon="ribbon" onPress={() => onChallenge("3-day")} tone={colors.brandSecondary} accent={colors.onBrandSecondary} />
      <UnlockCard testID="challenge-7day" title="7-day Blitz master" description={unlocked7 ? "Master-level image challenges. Tap to play." : `Play ${daysTo7} more day${daysTo7 === 1 ? "" : "s"} to unlock.`} unlocked={unlocked7} icon="trophy" onPress={() => onChallenge("7-day")} tone={colors.brandTertiary} accent={colors.onBrandTertiary} />
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Your progress</Text><SoftButton onPress={onAge} icon="options-outline">Change level</SoftButton></View>
      <View style={styles.stats}><StatTile icon="trophy" value={String(profile.personalBest)} label="Personal best" color={colors.surfaceTertiary} /><StatTile icon="sparkles" value={String(profile.totalXp)} label="Total XP" color={colors.surfaceSecondary} /><StatTile icon="flash" value={String(profile.streak)} label="Best streak" color={colors.brandTertiary} /></View>
      <Text style={styles.tip}><Ionicons name="bulb-outline" size={15} color={colors.brandPrimary} /> Fast answers earn a speed bonus.</Text>
      <View style={styles.presenter}><Text style={styles.presenterText}>Presented by <Text style={styles.presenterStrong}>Bansal Tutorials</Text></Text><Pressable testID="instagram-link" accessibilityRole="link" accessibilityLabel="Open Bansal Tutorials on Instagram" onPress={() => Linking.openURL(instagramUrl)} style={({ pressed }) => [styles.instagram, { opacity: pressed ? 0.65 : 1 }]}><Ionicons name="logo-instagram" size={17} color={colors.info} /><Text style={styles.instagramText}>@bansal_tutorials25</Text></Pressable></View>
    </ScrollView>
  </View>;
}

function UnlockCard({ testID, title, description, unlocked, onPress, icon, tone, accent }: { testID: string; title: string; description: string; unlocked: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; tone: string; accent: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <Pressable testID={testID} disabled={!unlocked} onPress={onPress} style={({ pressed }) => [styles.unlockCard, { backgroundColor: unlocked ? tone : colors.surfaceSecondary, opacity: pressed && unlocked ? 0.85 : 1 }]}>
    <View style={[styles.unlockIcon, { backgroundColor: unlocked ? accent + "22" : colors.surfaceTertiary }]}>
      <Ionicons name={unlocked ? icon : "lock-closed"} size={22} color={unlocked ? accent : colors.muted} />
    </View>
    <View style={styles.unlockCopy}>
      <Text style={[styles.unlockTitle, { color: unlocked ? accent : colors.onSurface }]}>{title}</Text>
      <Text style={[styles.unlockSub, { color: unlocked ? accent : colors.muted }]}>{description}</Text>
    </View>
    {unlocked ? <View style={[styles.unlockCta, { backgroundColor: accent }]}><Text style={[styles.unlockCtaText, { color: tone }]}>Play</Text><Ionicons name="arrow-forward" size={16} color={tone} /></View> : <Ionicons name="lock-closed" size={20} color={colors.muted} />}
  </Pressable>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 8 },
  greeting: { marginTop: 34, marginBottom: 23 },
  streakCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 24, padding: 17, marginBottom: 16 },
  streakHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  streakIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  streakCopy: { flex: 1, gap: 3 },
  streakTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  streakSub: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  streakCount: { color: colors.brandPrimary, fontSize: 17, fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 99, backgroundColor: colors.surfaceTertiary, marginTop: 17, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary, borderRadius: 99 },
  streakFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  streakFootText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  tokenBar: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  tokenIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  tokenCopy: { flex: 1 },
  tokenValue: { color: colors.onSurface, fontSize: 16, fontWeight: "900" },
  tokenLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  howToChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, minHeight: 32, borderRadius: 99, backgroundColor: colors.surfaceTertiary },
  howToChipText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "900" },
  hero: { backgroundColor: colors.brandPrimary, minHeight: 184, borderRadius: 26, padding: 22, flexDirection: "row", overflow: "hidden", marginBottom: 16 },
  heroCopy: { flex: 1, zIndex: 1, gap: 7 },
  heroKicker: { color: colors.brandTertiary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 24, lineHeight: 29, fontWeight: "900", maxWidth: 215 },
  heroSub: { color: colors.brandTertiary, fontSize: 12, lineHeight: 17, maxWidth: 210 },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  heroCtaText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900" },
  heroOrb: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginTop: 11, marginRight: -24 },
  heroOrbText: { color: colors.onBrandSecondary, fontSize: 40, lineHeight: 42, fontWeight: "900" },
  heroOrbLabel: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  unlockCard: { minHeight: 92, borderRadius: 22, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  unlockIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  unlockCopy: { flex: 1, gap: 3 },
  unlockTitle: { fontSize: 15, fontWeight: "900" },
  unlockSub: { fontSize: 12, fontWeight: "700" },
  unlockCta: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 34, borderRadius: 99 },
  unlockCtaText: { fontSize: 12, fontWeight: "900" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 9 },
  tip: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 25 },
  presenter: { alignItems: "center", gap: 8, marginTop: 31, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider },
  presenterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  presenterStrong: { color: colors.onSurface, fontWeight: "900" },
  instagram: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  instagramText: { color: colors.info, fontSize: 12, fontWeight: "900" },
}));
