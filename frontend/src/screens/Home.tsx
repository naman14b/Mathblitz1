import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { AGE_GROUPS, LocalProfile } from "@/src/game/types";
import { BrandMark, IconButton, ScreenTitle, SoftButton, StatTile } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

export function Home({ profile, onPlay, onSettings, onAdmin, onAge }: { profile: LocalProfile; onPlay: () => void; onSettings: () => void; onAdmin: () => void; onAge: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const age = AGE_GROUPS.find((item) => item.id === profile.ageGroup);
  const days = Math.min(profile.streak, 7);
  const instagramUrl = "https://www.instagram.com/bansal_tutorials25?stkn=MWNxaWJlOXVpMzNhMQ==";
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}><BrandMark compact /><View style={styles.actions}><IconButton name="shield-checkmark-outline" label="Open admin" onPress={onAdmin} /><IconButton name="settings-outline" label="Open settings" onPress={onSettings} /></View></View>
      <View style={styles.greeting}><ScreenTitle eyebrow="Ready when you are" title="Make your brain spark." subtitle={`${age?.label ?? "Your pace"} · ${age?.topics ?? "Choose your level in settings"}`} /></View>
      <View style={styles.streakCard}><View style={styles.streakHeader}><View style={styles.streakIcon}><Ionicons name="flame" size={22} color={colors.onBrandSecondary} /></View><View style={styles.streakCopy}><Text style={styles.streakTitle}>{profile.streak > 0 ? `${profile.streak}-day streak` : "Start your streak"}</Text><Text style={styles.streakSub}>{profile.streak >= 7 ? "7-day challenge unlocked!" : profile.streak >= 3 ? "3-day challenge unlocked!" : "Play today to begin"}</Text></View><Text style={styles.streakCount}>{days}/7</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, (days / 7) * 100)}%` }]} /></View><View style={styles.streakFoot}><Text style={styles.streakFootText}>3 days: Quickfire warm-up</Text><Text style={styles.streakFootText}>7 days: Blitz master</Text></View></View>
      <Pressable testID="play-challenge" onPress={onPlay} style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.85 : 1 }]}><View style={styles.heroCopy}><Text style={styles.heroKicker}>60-SECOND CHALLENGE</Text><Text style={styles.heroTitle}>How fast can you think?</Text><Text style={styles.heroSub}>Answer as many as you can before time runs out.</Text><View style={styles.heroCta}><Text style={styles.heroCtaText}>Play now</Text><Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} /></View></View><View style={styles.heroOrb}><Text style={styles.heroOrbText}>60</Text><Text style={styles.heroOrbLabel}>SEC</Text></View></Pressable>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Your progress</Text><SoftButton onPress={onAge} icon="options-outline">Change level</SoftButton></View>
      <View style={styles.stats}><StatTile icon="trophy" value={String(profile.personalBest)} label="Personal best" color={colors.surfaceTertiary} /><StatTile icon="sparkles" value={String(profile.totalXp)} label="Total XP" color={colors.surfaceSecondary} /><StatTile icon="flash" value={String(profile.streak)} label="Best streak" color={colors.brandTertiary} /></View>
      <Text style={styles.tip}><Ionicons name="bulb-outline" size={15} color={colors.brandPrimary} /> Fast answers earn a speed bonus.</Text>
      <View style={styles.presenter}><Text style={styles.presenterText}>Presented by <Text style={styles.presenterStrong}>Bansal Tutorials</Text></Text><Pressable testID="instagram-link" accessibilityRole="link" accessibilityLabel="Open Bansal Tutorials on Instagram" onPress={() => Linking.openURL(instagramUrl)} style={({ pressed }) => [styles.instagram, { opacity: pressed ? 0.65 : 1 }]}><Ionicons name="logo-instagram" size={17} color={colors.info} /><Text style={styles.instagramText}>@bansal_tutorials25</Text></Pressable></View>
    </ScrollView>
  </View>;
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
  hero: { backgroundColor: colors.brandPrimary, minHeight: 184, borderRadius: 26, padding: 22, flexDirection: "row", overflow: "hidden", marginBottom: 27 },
  heroCopy: { flex: 1, zIndex: 1, gap: 7 },
  heroKicker: { color: colors.brandTertiary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 24, lineHeight: 29, fontWeight: "900", maxWidth: 215 },
  heroSub: { color: colors.brandTertiary, fontSize: 12, lineHeight: 17, maxWidth: 210 },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  heroCtaText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900" },
  heroOrb: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginTop: 11, marginRight: -24 },
  heroOrbText: { color: colors.onBrandSecondary, fontSize: 40, lineHeight: 42, fontWeight: "900" },
  heroOrbLabel: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 9 },
  tip: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 25 },
  presenter: { alignItems: "center", gap: 8, marginTop: 31, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider },
  presenterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  presenterStrong: { color: colors.onSurface, fontWeight: "900" },
  instagram: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  instagramText: { color: colors.info, fontSize: 12, fontWeight: "900" },
}));