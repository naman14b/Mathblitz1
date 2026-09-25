import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
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
import { showPrivacyOptionsForm } from "@/src/services/adMobService";

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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
          <Pressable
            testID="settings-privacy-data"
            style={styles.linkRow}
            onPress={() => setShowPrivacyModal(true)}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <Text style={styles.linkText}>Privacy & data</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.linkRow}
            onPress={async () => {
              const shown = await showPrivacyOptionsForm();
              if (!shown) {
                Alert.alert(
                  "Ad Privacy Choices",
                  "MathBlitz only serves family-friendly, non-personalized ads. All advertising complies with the Google Play Families Policy."
                );
              }
            }}
          >
            <Ionicons name="options-outline" size={20} color={colors.brandPrimary} />
            <Text style={styles.linkText}>Ad privacy choices</Text>
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

      {/* In-App Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.privacyModalOverlay}>
          <View style={styles.privacyModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(16, 185, 129, 0.16)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Privacy Policy</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "600" }}>MathBlitz Mobile Application</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowPrivacyModal(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: colors.divider }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Updated: Sep 25, 2026</Text>
              <Pressable
                onPress={async () => {
                  const url = "https://mathblitz1-eta.vercel.app/privacy-policy.html";
                  try {
                    if (Platform.OS === "web" && typeof window !== "undefined") {
                      window.open("/privacy-policy.html", "_blank");
                      return;
                    }
                    const can = await Linking.canOpenURL(url);
                    if (can) await Linking.openURL(url);
                  } catch {}
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.brandPrimary }}>Open Web Page ↗</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1, paddingRight: 4 }}>
              <Text style={styles.policyHeading}>Overview</Text>
              <Text style={styles.policyParagraph}>
                This Privacy Policy explains how MathBlitz handles information when you use the MathBlitz mobile application. MathBlitz is a math-learning and puzzle game that includes mental-math challenges, daily challenges, journey progression, Sudoku, math puzzles, leaderboards, optional AI coaching, and advertising features.
              </Text>

              <Text style={styles.policyHeading}>1. Information We Collect</Text>
              <Text style={styles.policySubheading}>Information you provide in the app:</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Player name:</Text> Stored locally and sent to our server for leaderboards, AI coaching, and Math Boss results.</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Age group:</Text> Selected during onboarding. Used to tailor math difficulty and advertising treatment (child-directed treatment for younger players).</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Game progress:</Text> Scores, streaks, tokens, achievements, puzzles, and journey progression stored locally on your device.</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Gameplay performance:</Text> Questions attempted, answers, correctness, response time, and learning progress for AI coaching.</Text>

              <Text style={styles.policySubheading}>Leaderboard & AI Coach information:</Text>
              <Text style={styles.policyParagraph}>
                Leaderboards display your player name, score, age group, and game mode. AI Coach features process math questions, answers, and response times to generate learning insights and personalized math explanations.
              </Text>

              <Text style={styles.policySubheading}>Technical and advertising information:</Text>
              <Text style={styles.policyParagraph}>
                MathBlitz uses Google Mobile Ads (AdMob). AdMob may process device identifiers, IP address, and ad interactions according to Google's Families Policy and consent choices.
              </Text>

              <Text style={styles.policyHeading}>2. How We Use Information</Text>
              <Text style={styles.policyBullet}>• Provide and operate MathBlitz gameplay and progression.</Text>
              <Text style={styles.policyBullet}>• Save and restore player progress, settings, and leaderboards.</Text>
              <Text style={styles.policyBullet}>• Analyze math performance and provide AI Coach learning insights.</Text>
              <Text style={styles.policyBullet}>• Deliver family-friendly, non-personalized advertisements.</Text>

              <Text style={styles.policyHeading}>3. Local Storage</Text>
              <Text style={styles.policyParagraph}>
                MathBlitz stores game and profile information directly on your device using secure local storage. You can delete locally stored data at any time using the "Reset local progress" button in Settings or by uninstalling the application.
              </Text>

              <Text style={styles.policyHeading}>4. Third-Party Services</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Google AdMob:</Text> Serves family-safe ads compliant with Google Play Families Policy.</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>OpenRouter / AI Models:</Text> Used to generate educational AI coaching responses.</Text>
              <Text style={styles.policyBullet}>• <Text style={styles.policyBold}>Google Play:</Text> Prepared for secure Google Play purchases when enabled.</Text>

              <Text style={styles.policyHeading}>5. Children's Privacy</Text>
              <Text style={styles.policyParagraph}>
                MathBlitz includes age groups for children. We configure advertising requests with child-directed treatment (COPPA compliant) and under-age-of-consent protections. We do not require an account with an email address, telephone number, or password to play.
              </Text>

              <Text style={styles.policyHeading}>6. Data Deletion & Privacy Requests</Text>
              <Text style={styles.policyParagraph}>
                You may request deletion of server-side leaderboard or coaching records associated with your player name by contacting us at naman14b@gmail.com.
              </Text>

              <Text style={styles.policyHeading}>7. Contact Us</Text>
              <Text style={styles.policyParagraph}>
                For privacy questions, data deletion requests, or feedback, please contact:
              </Text>
              <Text style={[styles.policyParagraph, { fontWeight: "700", color: colors.brandPrimary }]}>
                MathBlitz · naman14b@gmail.com
              </Text>
            </ScrollView>

            <Pressable
              onPress={() => setShowPrivacyModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: colors.brandPrimary,
                paddingVertical: 13,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.onBrandPrimary, fontWeight: "900", fontSize: 15 }}>
                Close
              </Text>
            </Pressable>
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
  privacyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
    padding: Platform.OS === "web" ? 20 : 0,
  },
  privacyModalCard: {
    backgroundColor: colors.surface,
    width: "100%",
    maxWidth: 640,
    height: Platform.OS === "web" ? "88%" : "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderRadius: Platform.OS === "web" ? 28 : undefined,
    padding: 22,
    paddingBottom: 24,
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
  policyHeading: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 6,
  },
  policySubheading: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  policyParagraph: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  policyBullet: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  policyBold: {
    color: colors.onSurface,
    fontWeight: "800",
  },
}));