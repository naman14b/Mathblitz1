import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocalProfile, THEMES, ThemeDef, ThemeId } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

type ThemeStoreProps = {
  profile: LocalProfile;
  onBack: () => void;
  onActivateTheme: (id: ThemeId) => void;
  onPurchaseTheme?: (id: ThemeId, utr?: string) => void;
};

export function ThemeStore({ profile, onBack, onActivateTheme }: ThemeStoreProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const [selectedTheme, setSelectedTheme] = useState<ThemeDef | null>(null);

  const purchased = profile.purchasedThemes ?? [];
  const active = profile.activeTheme ?? "classic";

  const festivals = THEMES.filter((t) => t.tag === "Festival");
  const standard = THEMES.filter((t) => t.tag !== "Festival");

  const renderThemeCard = (theme: ThemeDef) => {
    const isOwned = theme.price === 0 || purchased.includes(theme.id);
    const isActive = active === theme.id;

    return (
      <Pressable
        key={theme.id}
        onPress={() => {
          if (isOwned) {
            onActivateTheme(theme.id);
          } else {
            setSelectedTheme(theme);
          }
        }}
        style={[styles.card, isActive && styles.cardActive, { borderColor: theme.accentColor + "55" }]}
      >
        {/* Color preview swatch */}
        <View style={[styles.swatch, { backgroundColor: theme.accentColor }]}>
          <Text style={styles.swatchEmoji}>{theme.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{theme.name}</Text>
          {isActive && <Text style={styles.activeTag}>● Active</Text>}
        </View>
        <View>
          {isOwned ? (
            <View style={[styles.pill, { backgroundColor: isActive ? theme.accentColor : colors.surfaceTertiary }]}>
              <Text style={[styles.pillText, { color: isActive ? "#FFFFFF" : colors.muted }]}>
                {isActive ? "On" : "Apply"}
              </Text>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: colors.surfaceTertiary }]}>
              <Text style={[styles.pillText, { color: colors.muted }]}>Locked</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Theme Store</Text>
          <Text style={styles.subtitle}>Personalise your FunGanit experience</Text>
        </View>
        <View style={[styles.iconBadge, { backgroundColor: colors.brandPrimary }]}>
          <Text style={styles.iconBadgeText}>🎨</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Standard Themes</Text>
        {standard.map(renderThemeCard)}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🎉 Festival Themes</Text>
        <Text style={styles.sectionNote}>Limited-edition seasonal colour palettes</Text>
        {festivals.map(renderThemeCard)}
      </ScrollView>

      {/* Theme Detail Modal */}
      <Modal visible={!!selectedTheme} transparent animationType="fade" onRequestClose={() => setSelectedTheme(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedTheme(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {selectedTheme && (() => {
              const isOwned = selectedTheme.price === 0 || purchased.includes(selectedTheme.id);
              const isActive = active === selectedTheme.id;
              return (
                <>
                  <View style={[styles.previewSwatch, { backgroundColor: selectedTheme.accentColor }]}>
                    <Text style={styles.previewEmoji}>{selectedTheme.emoji}</Text>
                  </View>
                  <Text style={styles.modalTitle}>{selectedTheme.name}</Text>
                  {selectedTheme.tag && (
                    <View style={[styles.festivalTag, { backgroundColor: selectedTheme.accentColor }]}>
                      <Text style={styles.festivalTagText}>{selectedTheme.tag}</Text>
                    </View>
                  )}
                  {isOwned ? (
                    <Pressable
                      style={[styles.modalBtn, { backgroundColor: isActive ? colors.success : selectedTheme.accentColor }]}
                      onPress={() => {
                        onActivateTheme(selectedTheme.id);
                        setSelectedTheme(null);
                      }}
                    >
                      <Text style={styles.modalBtnText}>{isActive ? "✓ Currently Active" : "Apply Theme"}</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.lockedPill, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.lockedPillText, { color: colors.muted }]}>🔒 Available in future update</Text>
                    </View>
                  )}
                  <Pressable style={styles.modalClose} onPress={() => setSelectedTheme(null)}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  iconBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconBadgeText: { fontSize: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900", marginTop: 4 },
  sectionNote: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: -6 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, borderRadius: 20, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
  },
  cardActive: { borderWidth: 2 },
  swatch: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  swatchEmoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardName: { color: colors.onSurface, fontSize: 15, fontWeight: "900" },
  activeTag: { color: colors.success, fontSize: 11, fontWeight: "800", marginTop: 2 },
  pill: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "900" },
  overlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { width: "100%", backgroundColor: colors.surface, borderRadius: 28, padding: 28, alignItems: "center", gap: 12 },
  previewSwatch: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  previewEmoji: { fontSize: 36 },
  modalTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  festivalTag: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  festivalTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  modalBtn: { width: "100%", paddingVertical: 15, borderRadius: 16, alignItems: "center", marginTop: 8 },
  modalBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  lockedPill: { width: "100%", paddingVertical: 14, borderRadius: 16, alignItems: "center", marginTop: 8 },
  lockedPillText: { fontSize: 14, fontWeight: "800" },
  modalClose: { paddingVertical: 10 },
  modalCloseText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
}));
