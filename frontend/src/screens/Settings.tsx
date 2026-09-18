import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { AGE_GROUPS, AppSettings, LocalProfile } from "@/src/game/types";
import { IconButton, ScreenTitle, SoftButton } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

export function Settings({ profile, onSave, onBack, onAge, onReset }: { profile: LocalProfile; onSave: (settings: AppSettings) => void; onBack: () => void; onAge: () => void; onReset: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const age = AGE_GROUPS.find((item) => item.id === profile.ageGroup);
  const toggle = (key: keyof AppSettings) => onSave({ ...profile.settings, [key]: !profile.settings[key] });
  return <View style={styles.root}><ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }}><View style={styles.topbar}><IconButton name="arrow-back" label="Back" onPress={onBack} /><Text style={styles.topTitle}>Settings</Text><View style={styles.spacer} /></View><View style={styles.header}><ScreenTitle eyebrow="Make it yours" title="Your preferences" subtitle="Small changes, a smoother blitz." /></View><Text style={styles.section}>GAMEPLAY</Text><View style={styles.card}><SettingRow icon="volume-high-outline" title="Sound effects" subtitle="Feedback for answers and combos" value={profile.settings.sound} onPress={() => toggle("sound")} /><View style={styles.divider} /><SettingRow icon="phone-portrait-outline" title="Vibration" subtitle="Haptic feedback on every answer" value={profile.settings.vibration} onPress={() => toggle("vibration")} /></View><Text style={styles.section}>PLAYER PROFILE</Text><Pressable onPress={onAge} style={({ pressed }) => [styles.optionCard, { opacity: pressed ? 0.75 : 1 }]}><View style={styles.optionIcon}><Ionicons name="speedometer-outline" size={20} color={colors.brandPrimary} /></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>Age & difficulty</Text><Text style={styles.optionSub}>{age?.label} · {age?.difficulty}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable><Text style={styles.section}>DATA & PRIVACY</Text><View style={styles.card}><Pressable style={styles.linkRow} onPress={() => Alert.alert("Privacy", "MathBlitz keeps gameplay progress on this device. No account or precise location is required.")}><Ionicons name="shield-checkmark-outline" size={20} color={colors.success} /><Text style={styles.linkText}>Privacy & data</Text><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable><View style={styles.divider} /><Pressable style={styles.linkRow} onPress={() => Alert.alert("About MathBlitz", "A friendly 60-second maths challenge for every age.")}><Ionicons name="information-circle-outline" size={20} color={colors.info} /><Text style={styles.linkText}>About the game</Text><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable></View><SoftButton onPress={() => Alert.alert("Reset progress?", "This removes your personal best, XP and streak from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: onReset }])} icon="trash-outline" style={styles.reset}>Reset local progress</SoftButton></ScrollView></View>;
}

function SettingRow({ icon, title, subtitle, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <Pressable testID={title === "Sound effects" ? "settings-sound" : "settings-vibration"} onPress={onPress} style={styles.settingRow}><Ionicons name={icon} size={21} color={colors.brandPrimary} /><View style={styles.settingCopy}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionSub}>{subtitle}</Text></View><View style={[styles.switch, { backgroundColor: value ? colors.brandPrimary : colors.border }]}><View style={[styles.knob, { alignSelf: value ? "flex-end" : "flex-start" }]} /></View></Pressable>;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" },
  spacer: { width: 44 },
  header: { marginTop: 34, marginBottom: 28 },
  section: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginBottom: 10, marginTop: 5 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, paddingHorizontal: 16 },
  settingRow: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 13 },
  settingCopy: { flex: 1, gap: 4 },
  optionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  optionSub: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.divider },
  switch: { width: 47, height: 28, borderRadius: 99, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.onBrandPrimary },
  optionCard: { minHeight: 73, borderRadius: 20, backgroundColor: colors.surfaceSecondary, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  optionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  optionCopy: { flex: 1, gap: 4 },
  linkRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12 },
  linkText: { color: colors.onSurface, flex: 1, fontSize: 15, fontWeight: "800" },
  reset: { marginTop: 26 },
}));