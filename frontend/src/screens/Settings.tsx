import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AGE_GROUPS, AppSettings, AvatarId, AVATARS, LocalProfile } from "@/src/game/types";
import { IconButton, PrimaryButton, ScreenTitle, SoftButton } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type SettingsProps = {
  profile: LocalProfile;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
  onAge: () => void;
  onReset: () => void;
  onChangeAvatar: (avatar: AvatarId) => Promise<void>;
};

export function Settings({ profile, onSave, onBack, onAge, onReset, onChangeAvatar }: SettingsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const age = AGE_GROUPS.find((item) => item.id === profile.ageGroup);
  const toggle = (key: keyof AppSettings) => onSave({ ...profile.settings, [key]: !profile.settings[key] });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const currentAvatar = AVATARS.find((a) => a.id === profile.avatar);

  const handleAvatarSelect = async (id: AvatarId) => {
    await onChangeAvatar(id);
    setShowAvatarPicker(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }}>
        <View style={styles.topbar}>
          <IconButton name="arrow-back" label="Back" onPress={onBack} />
          <Text style={styles.topTitle}>Settings</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.header}>
          <ScreenTitle eyebrow="Make it yours" title="Your preferences" subtitle="Small changes, a smoother blitz." />
        </View>

        <Text style={styles.section}>GAMEPLAY</Text>
        <View style={styles.card}>
          <SettingRow icon="volume-high-outline" title="Sound effects" subtitle="Feedback for answers and combos" value={profile.settings.sound} onPress={() => toggle("sound")} />
          <View style={styles.divider} />
          <SettingRow icon="phone-portrait-outline" title="Vibration" subtitle="Haptic feedback on every answer" value={profile.settings.vibration} onPress={() => toggle("vibration")} />
        </View>

        <Text style={styles.section}>APPEARANCE & WALLPAPER</Text>
        <View style={styles.card}>
          <Pressable
            testID="theme-mode-auto"
            onPress={() => onSave({ ...profile.settings, themeMode: "auto" })}
            style={styles.settingRow}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: colors.brandTertiary }]}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={colors.brandPrimary}
              />
            </View>
            <View style={styles.settingCopy}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.optionTitle}>Automatic (Phone & Time)</Text>
                {(profile.settings.themeMode ?? "auto") === "auto" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionSub}>
                Follows phone dark mode and day/night time (6 AM - 6 PM)
              </Text>
            </View>
            <Ionicons
              name={(profile.settings.themeMode ?? "auto") === "auto" ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={(profile.settings.themeMode ?? "auto") === "auto" ? colors.brandPrimary : colors.muted}
            />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            testID="theme-mode-day"
            onPress={() => onSave({ ...profile.settings, themeMode: "day" })}
            style={styles.settingRow}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.16)" }]}>
              <Ionicons
                name="sunny"
                size={20}
                color="#F59E0B"
              />
            </View>
            <View style={styles.settingCopy}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.optionTitle}>Day Mode</Text>
                {profile.settings.themeMode === "day" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionSub}>
                Mountain math adventure wallpaper & bright day style
              </Text>
            </View>
            <Ionicons
              name={profile.settings.themeMode === "day" ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={profile.settings.themeMode === "day" ? colors.brandPrimary : colors.muted}
            />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            testID="theme-mode-night"
            onPress={() => onSave({ ...profile.settings, themeMode: "night" })}
            style={styles.settingRow}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.16)" }]}>
              <Ionicons
                name="moon"
                size={20}
                color="#A78BFA"
              />
            </View>
            <View style={styles.settingCopy}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.optionTitle}>Night Mode</Text>
                {profile.settings.themeMode === "night" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionSub}>
                Cosmic astronaut space wallpaper & dark mode style
              </Text>
            </View>
            <Ionicons
              name={profile.settings.themeMode === "night" ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={profile.settings.themeMode === "night" ? colors.brandPrimary : colors.muted}
            />
          </Pressable>
        </View>

        <Text style={styles.section}>PLAYER PROFILE</Text>

        {/* Avatar Change Option */}
        <Pressable
          onPress={() => setShowAvatarPicker(true)}
          style={({ pressed }) => [styles.optionCard, { opacity: pressed ? 0.75 : 1, marginBottom: 10 }]}
        >
          <View style={styles.avatarPreview}>
            <Text style={styles.avatarPreviewEmoji}>{currentAvatar?.emoji ?? "👤"}</Text>
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Change Avatar</Text>
            <Text style={styles.optionSub}>{currentAvatar?.label ?? "No avatar selected"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <Pressable onPress={onAge} style={({ pressed }) => [styles.optionCard, { opacity: pressed ? 0.75 : 1 }]}>
          <View style={styles.optionIcon}>
            <Ionicons name="speedometer-outline" size={20} color={colors.brandPrimary} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Age & difficulty</Text>
            <Text style={styles.optionSub}>{age?.label} · {age?.difficulty}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <Text style={styles.section}>DATA & PRIVACY</Text>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={() => Alert.alert("Privacy", "MathBlitz keeps gameplay progress on this device. No account or precise location is required.")}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <Text style={styles.linkText}>Privacy & data</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={() => Alert.alert("About MathBlitz", "A friendly 60-second maths challenge for every age.")}>
            <Ionicons name="information-circle-outline" size={20} color={colors.info} />
            <Text style={styles.linkText}>About the game</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <SoftButton
          onPress={() => Alert.alert("Reset progress?", "This removes your personal best, XP and streak from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: onReset }])}
          icon="trash-outline"
          style={styles.reset}
        >
          Reset local progress
        </SoftButton>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Avatar</Text>
              <Pressable onPress={() => setShowAvatarPicker(false)}>
                <Ionicons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.genderLabel}>🙋‍♂️ MALE</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.filter((a) => a.gender === "male").map((avatar) => (
                <AvatarPickerItem
                  key={avatar.id}
                  avatar={avatar}
                  selected={profile.avatar === avatar.id}
                  onPress={() => handleAvatarSelect(avatar.id)}
                />
              ))}
            </View>

            <Text style={[styles.genderLabel, { marginTop: 14 }]}>🙋‍♀️ FEMALE</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.filter((a) => a.gender === "female").map((avatar) => (
                <AvatarPickerItem
                  key={avatar.id}
                  avatar={avatar}
                  selected={profile.avatar === avatar.id}
                  onPress={() => handleAvatarSelect(avatar.id)}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AvatarPickerItem({ avatar, selected, onPress }: { avatar: (typeof AVATARS)[number]; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const scale = useSharedValue(1);

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 4, stiffness: 300 }),
      withSpring(1.0, { damping: 10, stiffness: 200 })
    );
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
  }));

  return (
    <Pressable onPress={handlePress} style={styles.pickerItem}>
      <Animated.View
        style={[
          styles.pickerCircle,
          selected && { borderColor: colors.brandPrimary, borderWidth: 3, backgroundColor: colors.brandPrimary + "18" },
          animatedStyle,
        ]}
      >
        <Text style={styles.pickerEmoji}>{avatar.emoji}</Text>
      </Animated.View>
      <Text style={[styles.pickerLabel, selected && { color: colors.brandPrimary, fontWeight: "900" }]}>
        {avatar.label}
      </Text>
    </Pressable>
  );
}

function SettingRow({ icon, title, subtitle, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable testID={title === "Sound effects" ? "settings-sound" : "settings-vibration"} onPress={onPress} style={styles.settingRow}>
      <Ionicons name={icon} size={21} color={colors.brandPrimary} />
      <View style={styles.settingCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <View style={[styles.switch, { backgroundColor: value ? colors.brandPrimary : colors.border }]}>
        <View style={[styles.knob, { alignSelf: value ? "flex-end" : "flex-start" }]} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "transparent" },
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

  // Mode option styles
  modeIconCircle: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modeTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.brandPrimary },
  activePillText: { color: colors.onBrandPrimary, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },

  // Avatar preview in settings
  avatarPreview: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPreviewEmoji: { fontSize: 22 },

  // Avatar picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "900",
  },
  genderLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  pickerItem: {
    alignItems: "center",
    width: 72,
    gap: 5,
  },
  pickerCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerEmoji: { fontSize: 28 },
  pickerLabel: {
    color: colors.onSurface,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
}));