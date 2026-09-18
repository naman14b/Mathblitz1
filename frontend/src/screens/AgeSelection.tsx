import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AGE_GROUPS, AgeGroupId } from "@/src/game/types";
import { BrandMark, ScreenTitle } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

export function AgeSelection({ onSelect }: { onSelect: (age: AgeGroupId) => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const accent = { teal: colors.success, orange: colors.brandPrimary, blue: colors.info, pink: colors.error, yellow: colors.warning, purple: colors.onBrandTertiary };
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <BrandMark />
      <View style={styles.header}><ScreenTitle eyebrow="Let’s set your pace" title="Who’s playing?" subtitle="Pick an age group and we’ll tune the questions to feel just right." /></View>
      <View style={styles.list}>
        {AGE_GROUPS.map((group) => <Pressable key={group.id} testID={`age-${group.id}`} accessibilityRole="button" onPress={() => onSelect(group.id)} style={({ pressed }) => [styles.card, { borderLeftColor: accent[group.accent], opacity: pressed ? 0.78 : 1 }]}>
          <View style={[styles.ageBadge, { backgroundColor: accent[group.accent] }]}><Text style={styles.ageBadgeText}>{group.id}</Text></View>
          <View style={styles.cardCopy}><Text style={styles.cardTitle}>{group.label}</Text><Text style={styles.cardSubtitle}>{group.topics}</Text></View>
          <View style={styles.difficulty}><Text style={styles.difficultyText}>{group.difficulty}</Text><Text style={styles.paceText}>{group.pace}</Text><Ionicons name="arrow-forward" size={17} color={colors.muted} /></View>
        </Pressable>)}
      </View>
      <Text style={styles.privacy}>No account needed · Your progress stays on this device</Text>
    </ScrollView>
  </View>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { marginTop: 38, marginBottom: 24 },
  list: { gap: 12 },
  card: { minHeight: 82, borderRadius: 20, borderLeftWidth: 6, backgroundColor: colors.surfaceSecondary, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  ageBadge: { width: 58, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ageBadgeText: { color: colors.onBrandPrimary, fontWeight: "900", fontSize: 14 },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  cardSubtitle: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  difficulty: { alignItems: "flex-end", gap: 5 },
  difficultyText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  paceText: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800" },
  privacy: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 28 },
}));