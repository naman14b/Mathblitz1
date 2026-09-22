import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AvatarId, AVATARS } from "@/src/game/types";
import { BrandMark, PrimaryButton, ScreenTitle } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type Step = "name" | "avatar";

export function NameEntry({ onSave }: { onSave: (name: string, avatar: AvatarId) => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("name");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);

  const handleNameContinue = () => {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      setStep("avatar");
    }
  };

  const handleAvatarConfirm = () => {
    if (selectedAvatar) {
      onSave(name.trim(), selectedAvatar);
    }
  };

  if (step === "name") {
    return (
      <View style={styles.root}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <BrandMark />
          <View style={styles.header}>
            <ScreenTitle
              eyebrow="Welcome to MathBlitz"
              title="What's your name?"
              subtitle="Enter your name to start tracking your progress and high scores."
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={20}
              autoFocus
              onSubmitEditing={handleNameContinue}
              returnKeyType="done"
            />
          </View>
          <PrimaryButton
            onPress={handleNameContinue}
            disabled={name.trim().length === 0}
            icon="arrow-forward"
          >
            Continue
          </PrimaryButton>
        </ScrollView>
      </View>
    );
  }

  // Avatar selection step
  const maleAvatars = AVATARS.filter((a) => a.gender === "male");
  const femaleAvatars = AVATARS.filter((a) => a.gender === "female");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BrandMark />
        <View style={styles.header}>
          <ScreenTitle
            eyebrow={`Hey ${name.trim()}! 👋`}
            title="Choose your avatar"
            subtitle="Pick an avatar that represents you. You can change it anytime in Settings."
          />
        </View>

        {/* Male Avatars */}
        <Text style={styles.genderLabel}>🙋‍♂️ MALE</Text>
        <View style={styles.avatarGrid}>
          {maleAvatars.map((avatar) => (
            <AvatarOption
              key={avatar.id}
              avatar={avatar}
              selected={selectedAvatar === avatar.id}
              onPress={() => setSelectedAvatar(avatar.id)}
            />
          ))}
        </View>

        {/* Female Avatars */}
        <Text style={[styles.genderLabel, { marginTop: 18 }]}>🙋‍♀️ FEMALE</Text>
        <View style={styles.avatarGrid}>
          {femaleAvatars.map((avatar) => (
            <AvatarOption
              key={avatar.id}
              avatar={avatar}
              selected={selectedAvatar === avatar.id}
              onPress={() => setSelectedAvatar(avatar.id)}
            />
          ))}
        </View>

        <View style={styles.confirmContainer}>
          <Pressable
            onPress={() => setStep("name")}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              onPress={handleAvatarConfirm}
              disabled={!selectedAvatar}
              icon="checkmark-circle"
            >
              Let's Go!
            </PrimaryButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Individual animated avatar option
function AvatarOption({
  avatar,
  selected,
  onPress,
}: {
  avatar: (typeof AVATARS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const scale = useSharedValue(1);

  // Gentle idle float animation
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.25, { damping: 4, stiffness: 300 }),
      withSpring(1.0, { damping: 10, stiffness: 200 })
    );
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
  }));

  return (
    <Pressable onPress={handlePress} style={styles.avatarOption}>
      <Animated.View
        style={[
          styles.avatarCircle,
          selected && {
            borderColor: colors.brandPrimary,
            borderWidth: 3.5,
            backgroundColor: colors.brandPrimary + "18",
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
      </Animated.View>
      <Text
        style={[
          styles.avatarLabel,
          selected && { color: colors.brandPrimary, fontWeight: "900" },
        ]}
      >
        {avatar.label}
      </Text>
      {selected && (
        <View style={styles.selectedDot}>
          <Text style={styles.selectedDotText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { marginTop: 38, marginBottom: 24 },
  inputContainer: { marginBottom: 24 },
  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
  },
  genderLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  avatarOption: {
    alignItems: "center",
    width: 80,
    gap: 6,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarLabel: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedDot: {
    position: "absolute",
    top: -2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDotText: {
    color: colors.onBrandPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  confirmContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
  },
  backBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
}));
