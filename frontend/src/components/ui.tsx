import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><Ionicons name="flash" size={compact ? 18 : 22} color={colors.onBrandPrimary} /></View>
      {!compact ? <Text style={styles.brandText}>MathBlitz</Text> : null}
    </View>
  );
}

export function IconButton({ name, onPress, label, color, style }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; color?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 }, styles.iconButton, style]}>
      <Ionicons name={name} size={21} color={color ?? colors.onSurfaceSecondary} />
    </Pressable>
  );
}

export function PrimaryButton({ children, label, onPress, icon, style, disabled = false, testID }: PropsWithChildren<{ label?: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>; disabled?: boolean; testID?: string }>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const content = children ?? label;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.brandPrimary, opacity: disabled ? 0.5 : pressed ? 0.82 : 1 }, style]}>
      <Text style={[styles.primaryText, { color: colors.onBrandPrimary }]}>{content}</Text>
      {icon ? <Ionicons name={icon} size={20} color={colors.onBrandPrimary} /> : null}
    </Pressable>
  );
}

export function SoftButton({ children, onPress, icon, style, testID }: PropsWithChildren<{ onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>; testID?: string }>) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.softButton, { backgroundColor: colors.brandTertiary, opacity: pressed ? 0.72 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.onBrandTertiary} /> : null}
      <Text style={[styles.softText, { color: colors.onBrandTertiary }]}>{children}</Text>
    </Pressable>
  );
}

export function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const styles = useStyles();
  return <View style={styles.titleBlock}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function StatTile({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <View style={[styles.statTile, { backgroundColor: color ?? colors.surfaceSecondary }]}><Ionicons name={icon} size={21} color={colors.brandPrimary} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const useStyles = makeStyles((colors) => ({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  brandText: { color: colors.onSurface, fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  iconButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  primaryButton: { minHeight: 54, borderRadius: 18, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryText: { fontSize: 16, fontWeight: "800" },
  softButton: { minHeight: 46, borderRadius: 15, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  softText: { fontSize: 14, fontWeight: "800" },
  titleBlock: { gap: 5 },
  eyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: colors.onSurface, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  statTile: { flex: 1, minHeight: 106, borderRadius: 20, padding: 15, gap: 5 },
  statValue: { color: colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 3 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
}));

export const textStyle: StyleProp<TextStyle> = { fontWeight: "700" };