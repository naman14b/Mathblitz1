import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, PrimaryButton, ScreenTitle } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type Section = { icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap; title: string; bullets: string[] };

const SECTIONS: Section[] = [
  {
    icon: "timer-outline",
    title: "60-second challenge",
    bullets: [
      "60 seconds to answer as many maths questions as you can.",
      "First 10 questions stay easy so you can warm up your brain.",
      "Every 3 correct answers levels you up and cuts your remaining time — the ramp is bigger for older age groups.",
      "3 lives — miss 3 and the run ends early.",
      "Fast answers within the speed benchmark earn a bonus.",
    ],
  },
  {
    icon: "logo-bitcoin",
    title: "Tokens · your unlock currency",
    bullets: [
      "+2 tokens for every correct answer, −1 for every wrong one, during 60-second play.",
      "Rewards for a given age group can only be claimed once per day — replays after that give no tokens.",
      "Winning the 3-day streak challenge grants +20 tokens.",
      "Winning the 7-day streak challenge grants +30 tokens.",
      "Coming soon: spend tokens to unlock Sudoku packs and Maths Puzzles.",
    ],
  },
  {
    icon: "flame-outline",
    title: "Streaks & challenges",
    bullets: [
      "Play daily to grow your streak — miss a day and it resets to 1.",
      "Streak of 3 unlocks the Quickfire image challenges.",
      "Streak of 7 unlocks the Blitz Master challenges.",
      "The home dashboard shows how many days you still need — one more play a day and you're closer!",
    ],
  },
  {
    icon: "bulb-outline",
    title: "Scoring in more detail",
    bullets: [
      "Base points per correct answer scale with your combo (up to ×3).",
      "Answer inside the speed benchmark for a +5 speed bonus.",
      "Wrong answers reset your combo but not your score — keep playing to recover.",
      "Your personal best and total XP are saved on this device.",
    ],
  },
];

export function HowToPlay({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 15, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}><IconButton name="arrow-back" label="Back" onPress={onBack} /><Text style={styles.topTitle}>How to play</Text><View style={styles.spacer} /></View>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="book-outline" size={26} color={colors.onBrandPrimary} /></View>
        <ScreenTitle eyebrow="Quick guide" title="Play smart. Earn tokens." subtitle="A quick tour of scoring, tokens and how to unlock what's next." />
      </View>
      {SECTIONS.map((section) => <View key={section.title} testID={`howto-section-${section.title.split(" ")[0].toLowerCase()}`} style={styles.card}>
        <View style={styles.cardHead}><View style={styles.cardIcon}><Ionicons name={section.icon} size={20} color={colors.brandPrimary} /></View><Text style={styles.cardTitle}>{section.title}</Text></View>
        {section.bullets.map((line) => <View key={line} style={styles.bullet}><Ionicons name="ellipse" size={7} color={colors.brandPrimary} style={styles.bulletDot} /><Text style={styles.bulletText}>{line}</Text></View>)}
      </View>)}
      <View style={styles.footerNote}><Ionicons name="information-circle-outline" size={17} color={colors.info} /><Text style={styles.footerNoteText}>Progress and tokens are stored on this device only.</Text></View>
      <PrimaryButton onPress={onBack} icon="arrow-back" style={styles.done}>Got it</PrimaryButton>
    </ScrollView>
  </View>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" },
  spacer: { width: 44 },
  hero: { marginTop: 32, marginBottom: 24, gap: 16 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 22, padding: 18, marginBottom: 14 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900", flex: 1 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
  bulletDot: { marginTop: 8 },
  bulletText: { color: colors.muted, fontSize: 13, lineHeight: 19, flex: 1, fontWeight: "600" },
  footerNote: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 20 },
  footerNoteText: { color: colors.muted, fontSize: 12, fontWeight: "700", flex: 1 },
  done: { marginTop: 4 },
}));
