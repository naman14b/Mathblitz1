import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MATHS_CATALOGUE } from "./catalogue";
import type { LocalProfile } from "@/src/game/types";
import { isMathsPuzzleUnlocked, isMathsPuzzleCompleted } from "@/src/game/storage";
import { makeStyles, useTheme } from "@/src/theme";

type MathsPuzzlesHubProps = {
    profile: LocalProfile;
    onBack: () => void;
    onPlay: (level: number, cost: number) => void;
};

export function MathsPuzzlesHub({
    profile,
    onBack,
    onPlay,
}: MathsPuzzlesHubProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useStyles();

    const gameCount = MATHS_CATALOGUE.length;
    const completedCount = MATHS_CATALOGUE.filter((p) => isMathsPuzzleCompleted(profile, p.level)).length;

    return (
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
                </Pressable>
                <View style={styles.headerCopy}>
                    <Text style={styles.title}>Maths Puzzles</Text>
                    <Text style={styles.subtitle}>100 levels · Increasing difficulty</Text>
                </View>
                <View style={styles.tokenBadge}>
                    <Ionicons name="pricetag" size={16} color={colors.onBrandPrimary} />
                    <Text style={styles.tokenValue}>{profile.tokens}</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{completedCount}/{gameCount} completed</Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${(completedCount / gameCount) * 100}%` }]} />
                    </View>
                </View>

                <View style={styles.levelsGrid}>
                    {MATHS_CATALOGUE.map((puzzle) => {
                        const level = puzzle.level;
                        const unlockCost = 10 + (level - 1) * 5;
                        const unlocked = level === 1 || isMathsPuzzleUnlocked(profile, level);
                        const completed = isMathsPuzzleCompleted(profile, level);
                        const canUnlock = profile.tokens >= unlockCost;
                        const canPlay = unlocked || canUnlock;

                        return (
                            <Pressable
                                key={level}
                                disabled={!canPlay}
                                onPress={() => onPlay(level, unlockCost)}
                                style={[
                                    styles.levelButton,
                                    completed && styles.levelButtonCompleted,
                                    !unlocked && styles.levelButtonLocked,
                                    !canPlay && { opacity: 0.5 }
                                ]}
                            >
                                {unlocked ? (
                                    <Text style={[styles.levelButtonText, completed && { color: colors.onSuccess }]}>
                                        {level}
                                    </Text>
                                ) : (
                                    <View style={styles.lockedLevel}>
                                        <Ionicons name="lock-closed" size={14} color={colors.muted} />
                                        <Text style={styles.lockedLevelCost}>{unlockCost}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((colors) => ({
    root: { flex: 1, backgroundColor: "transparent" },
    header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 20, paddingVertical: 14 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
    headerCopy: { flex: 1, gap: 2 },
    title: { color: colors.onSurface, fontSize: 25, fontWeight: "900" },
    subtitle: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    tokenBadge: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, paddingHorizontal: 11, borderRadius: 99, backgroundColor: colors.brandPrimary },
    tokenValue: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "900" },
    content: { paddingHorizontal: 20, paddingBottom: 95, gap: 13 },
    progressRow: { marginBottom: 10 },
    progressText: { color: colors.muted, fontSize: 13, fontWeight: "800", marginBottom: 6 },
    progressTrack: { height: 7, borderRadius: 99, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
    progressFill: { height: "100%", borderRadius: 99, backgroundColor: colors.brandPrimary },
    levelsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    levelButton: { width: "23%", aspectRatio: 1, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
    levelButtonCompleted: { backgroundColor: colors.success + "20", borderWidth: 1, borderColor: colors.success },
    levelButtonLocked: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
    levelButtonText: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
    lockedLevel: { alignItems: "center", gap: 2 },
    lockedLevelCost: { color: colors.muted, fontSize: 12, fontWeight: "800" },
}));
