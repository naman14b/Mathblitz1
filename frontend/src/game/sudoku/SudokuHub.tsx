import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LocalProfile } from "@/src/game/types";
import { isSudokuUnlocked, isSudokuCompleted } from "@/src/game/storage";
import {
    SUDOKU_TIERS,
    type SudokuDifficulty,
} from "@/src/game/sudoku/types";
import { makeStyles, useTheme } from "@/src/theme";

type SudokuHubProps = {
    profile: LocalProfile;
    onBack: () => void;
    onPlay: (difficulty: SudokuDifficulty, level: number) => void;
};

export function SudokuHub({
    profile,
    onBack,
    onPlay,
}: SudokuHubProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useStyles();

    return (
        <View
            style={[
                styles.root,
                {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            <View style={styles.header}>
                <Pressable
                    onPress={onBack}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.onSurface}
                    />
                </Pressable>

                <View style={styles.headerCopy}>
                    <Text style={styles.title}>Sudoku</Text>
                    <Text style={styles.subtitle}>
                        250 puzzles · 5 difficulty levels
                    </Text>
                </View>

                <View style={styles.tokenBadge}>
                    <Ionicons
                        name="pricetag"
                        size={16}
                        color={colors.onBrandPrimary}
                    />
                    <Text style={styles.tokenValue}>
                        {profile.tokens}
                    </Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <View style={styles.infoCard}>
                    <View style={styles.infoIcon}>
                        <Ionicons
                            name="bulb-outline"
                            size={22}
                            color={colors.brandPrimary}
                        />
                    </View>

                    <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>
                            2 free hints every game
                        </Text>

                        <Text style={styles.infoText}>
                            Use your free hints first. Watch a rewarded video for 2
                            additional hints.
                        </Text>
                    </View>
                </View>

                {SUDOKU_TIERS.map((tier) => {
                    const completedCount = getCompletedCount(
                        profile,
                        tier.difficulty,
                    );

                    return (
                        <SudokuTierCard
                            key={tier.difficulty}
                            title={tier.title}
                            description={tier.description}
                            difficulty={tier.difficulty}
                            gameCount={tier.gameCount}
                            completedCount={completedCount}
                            unlockCost={tier.unlockCost}
                            profile={profile}
                            onPress={(level) => onPlay(tier.difficulty, level)}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
}

function getCompletedCount(
    profile: LocalProfile,
    difficulty: SudokuDifficulty,
): number {
    const prefix = `sudoku-${difficulty}-`;

    return Object.entries(profile.completedSudoku).filter(
        ([key, completed]) =>
            key.startsWith(prefix) && completed === true,
    ).length;
}

type SudokuTierCardProps = {
    title: string;
    description: string;
    difficulty: SudokuDifficulty;
    gameCount: number;
    completedCount: number;
    unlockCost: number;
    profile: LocalProfile;
    onPress: (level: number) => void;
};

function SudokuTierCard({
    title,
    description,
    difficulty,
    gameCount,
    completedCount,
    unlockCost,
    profile,
    onPress,
}: SudokuTierCardProps) {
    const { colors } = useTheme();
    const styles = useStyles();
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.tierCard}>
            <View style={styles.tierHeader}>
                <View style={styles.tierIcon}>
                    <Ionicons
                        name="grid-outline"
                        size={23}
                        color={colors.brandPrimary}
                    />
                </View>

                <View style={styles.tierCopy}>
                    <Text style={styles.tierTitle}>
                        {title}
                    </Text>

                    <Text style={styles.tierDescription}>
                        {description}
                    </Text>
                </View>
            </View>

            <View style={styles.progressRow}>
                <View style={styles.progressCopy}>
                    <Text style={styles.progressText}>
                        {completedCount}/{gameCount} completed
                    </Text>

                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(
                                        100,
                                        (completedCount / gameCount) * 100,
                                    )}%`,
                                },
                            ]}
                        />
                    </View>
                </View>
            </View>

            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={({ pressed }) => [
                    styles.playButton,
                    { opacity: pressed ? 0.82 : 1 },
                ]}
            >
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.onBrandPrimary}
                />
                <Text style={styles.playButtonText}>
                    {expanded ? "Hide Levels" : "View Levels"}
                </Text>
            </Pressable>

            {expanded && (
                <View style={styles.levelsGrid}>
                    {Array.from({ length: gameCount }).map((_, i) => {
                        const level = i + 1;
                        const id = `sudoku-${difficulty}-${level}`;
                        const unlocked = level === 1 || isSudokuUnlocked(profile, id);
                        const completed = isSudokuCompleted(profile, id);
                        const canUnlock = profile.tokens >= unlockCost;
                        const canPlay = unlocked || canUnlock;

                        return (
                            <Pressable
                                key={level}
                                disabled={!canPlay}
                                onPress={() => onPress(level)}
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
                                        <Ionicons name="lock-closed" size={12} color={colors.muted} />
                                        <Text style={styles.lockedLevelCost}>{unlockCost}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((colors) => ({
    root: {
        flex: 1,
        backgroundColor: colors.surface,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingHorizontal: 20,
        paddingVertical: 14,
    },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
    },

    headerCopy: {
        flex: 1,
        gap: 2,
    },

    title: {
        color: colors.onSurface,
        fontSize: 25,
        fontWeight: "900",
    },

    subtitle: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: "600",
    },

    tokenBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        minHeight: 36,
        paddingHorizontal: 11,
        borderRadius: 99,
        backgroundColor: colors.brandPrimary,
    },

    tokenValue: {
        color: colors.onBrandPrimary,
        fontSize: 13,
        fontWeight: "900",
    },

    content: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        gap: 13,
    },

    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 15,
        borderRadius: 20,
        backgroundColor: colors.surfaceSecondary,
    },

    infoIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceTertiary,
    },

    infoCopy: {
        flex: 1,
        gap: 3,
    },

    infoTitle: {
        color: colors.onSurface,
        fontSize: 14,
        fontWeight: "900",
    },

    infoText: {
        color: colors.muted,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: "600",
    },

    tierCard: {
        padding: 16,
        borderRadius: 22,
        backgroundColor: colors.surfaceSecondary,
        gap: 14,
    },

    tierHeader: {
        flexDirection: "row",
        gap: 12,
    },

    tierIcon: {
        width: 46,
        height: 46,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceTertiary,
    },

    tierCopy: {
        flex: 1,
        gap: 4,
    },

    tierTitle: {
        color: colors.onSurface,
        fontSize: 17,
        fontWeight: "900",
    },

    tierDescription: {
        color: colors.muted,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: "600",
    },

    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    progressCopy: {
        flex: 1,
    },

    progressText: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: "800",
        marginBottom: 6,
    },

    progressTrack: {
        height: 7,
        borderRadius: 99,
        overflow: "hidden",
        backgroundColor: colors.surfaceTertiary,
    },

    progressFill: {
        height: "100%",
        borderRadius: 99,
        backgroundColor: colors.brandPrimary,
    },

    costBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minHeight: 30,
        paddingHorizontal: 9,
        borderRadius: 99,
        backgroundColor: colors.surfaceTertiary,
    },

    costText: {
        color: colors.onSurface,
        fontSize: 12,
        fontWeight: "900",
    },

    playButton: {
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: colors.brandPrimary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    playButtonDisabled: {
        opacity: 0.45,
    },

    playButtonText: {
        color: colors.onBrandPrimary,
        fontSize: 13,
        fontWeight: "900",
    },
    levelsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    levelButton: {
        width: "18%",
        aspectRatio: 1,
        borderRadius: 12,
        backgroundColor: colors.surfaceTertiary,
        alignItems: "center",
        justifyContent: "center",
    },
    levelButtonCompleted: {
        backgroundColor: colors.success + "20",
        borderWidth: 1,
        borderColor: colors.success,
    },
    levelButtonLocked: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    levelButtonText: {
        color: colors.onSurface,
        fontSize: 16,
        fontWeight: "800",
    },
    lockedLevel: {
        alignItems: "center",
        gap: 2,
    },
    lockedLevelCost: {
        color: colors.muted,
        fontSize: 10,
        fontWeight: "800",
    },
}));