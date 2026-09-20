import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, TextInput, View } from "react-native";
import { BrandMark, PrimaryButton, ScreenTitle } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

export function NameEntry({ onSave }: { onSave: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState("");

  const handleContinue = () => {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      onSave(trimmed);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }} 
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
            style={[styles.input, { color: colors.onSurface, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoFocus
            onSubmitEditing={handleContinue}
            returnKeyType="done"
          />
        </View>
        <PrimaryButton onPress={handleContinue} disabled={name.trim().length === 0} icon="arrow-forward">
          Continue
        </PrimaryButton>
      </ScrollView>
    </View>
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
}));
