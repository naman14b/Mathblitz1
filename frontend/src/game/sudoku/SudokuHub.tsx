import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LocalProfile } from "@/src/game/types";
import { isSudokuUnlocked, isSudokuCompleted } from "@/src/game/storage";
import {
    SUDOKU_TIERS,
    type SudokuDifficulty,
    type SudokuTier,
} from "@/src/game/sudoku/types";
import { makeStyles, useTheme } from "@/src/theme";
import { ASTRONAUT_HEADER, formatSecondsToTime, getLevelImage } from "@/src/game/levelAssets";

type SudokuHubProps = {
    profile: LocalProfile;
    onBack: () => void;
    onPlay: (difficulty: SudokuDifficulty, level: number) => void;
};

const DIFFICULTY_TABS: Array<{
    id: SudokuDifficulty;
    label: string;
    icon: string;
    activeColor: string;
    badgeIconColor: string;
}> = [
    { id: "easy", label: "Easy", icon: "star", activeColor: "#FBBF24", badgeIconColor: "#FBBF24" },
    { id: "medium", label: "Medium", icon: "sparkles", activeColor: "#34D399", badgeIconColor: "#34D399" },
    { id: "hard", label: "Hard", icon: "flame", activeColor: "#FB923C", badgeIconColor: "#FB923C" },
    { id: "expert", label: "Expert", icon: "flash", activeColor: "#C084FC", badgeIconColor: "#C084FC" },
    { id: "evil", label: "Master", icon: "ribbon", activeColor: "#818CF8", badgeIconColor: "#818CF8" },
];

export function SudokuHub({
    profile,
    onBack,
    onPlay,
}: SudokuHubProps) {
    const insets = useSafeAreaInsets();
    const { colors, isNight } = useTheme();
    const styles = useStyles();

    const [selectedDifficulty, setSelectedDifficulty] = useState<SudokuDifficulty>("easy");

    const currentTier = useMemo(() => {
        return SUDOKU_TIERS.find((t) => t.difficulty === selectedDifficulty) || SUDOKU_TIERS[0];
    }, [selectedDifficulty]);

    const completedInCurrentTier = useMemo(() => {
        return getCompletedCount(profile, selectedDifficulty);
    }, [profile, selectedDifficulty]);

    return (
        <View
            style={[
                styles.root,
                {
                    paddingTop: Math.max(insets.top, 12),
                    paddingBottom: Math.max(insets.bottom, 12),
                },
            ]}
        >
            {/* Top Bar with Back, Title & Astronaut Illustration */}
            <View style={styles.headerContainer}>
                <View style={styles.topRow}>
                    <Pressable
                        onPress={onBack}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#FFFFFF"
                        />
                    </Pressable>

                    {/* Token balance pill badge */}
                    <View style={styles.tokenPill}>
                        <View style={styles.tokenGem}>
                            <Ionicons name="diamond" size={14} color="#FBBF24" />
                        </View>
                        <Text style={styles.tokenPillText}>{profile.tokens}</Text>
                    </View>
                </View>

                <View style={styles.heroRow}>
                    <View style={styles.heroCopy}>
                        <View style={styles.titleRow}>
                            <Text style={styles.crownEmoji}>👑</Text>
                            <Text style={styles.title}>Sudoku</Text>
                        </View>
                        <Text style={styles.subtitle}>250 puzzles • 5 difficulty levels</Text>
                    </View>

                    {/* Astronaut boy mascot */}
                    <View style={styles.mascotWrapper}>
                        <Image
                            source={ASTRONAUT_HEADER}
                            style={styles.mascotImage}
                            resizeMode="cover"
                        />
                    </View>
                </View>
            </View>

            {/* Progress Section */}
            <View style={styles.progressContainer}>
                <View style={styles.progressInfoRow}>
                    <Ionicons name="star" size={15} color="#FBBF24" />
                    <Text style={styles.progressInfoText}>
                        {completedInCurrentTier}/{currentTier.gameCount} completed
                    </Text>
                </View>
                <View style={styles.progressTrackWrapper}>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.max(
                                        4,
                                        (completedInCurrentTier / currentTier.gameCount) * 100,
                                    )}%`,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.trophyIcon}>🏆</Text>
                </View>
            </View>

            {/* Difficulty Tabs Navigation Bar */}
            <View style={styles.navBarWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.navBarScroll}
                >
                    {DIFFICULTY_TABS.map((tab) => {
                        const isActive = tab.id === selectedDifficulty;
                        return (
                            <Pressable
                                key={tab.id}
                                onPress={() => setSelectedDifficulty(tab.id)}
                                style={[
                                    styles.navTab,
                                    isActive && styles.navTabActive,
                                ]}
                            >
                                <Ionicons
                                    name={tab.icon as any}
                                    size={14}
                                    color={isActive ? "#0F172A" : tab.badgeIconColor}
                                />
                                <Text
                                    style={[
                                        styles.navTabLabel,
                                        isActive && styles.navTabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* 4-Column Levels Grid */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.levelsGrid}>
                    {Array.from({ length: currentTier.gameCount }).map((_, i) => {
                        const level = i + 1;
                        const id = `sudoku-${selectedDifficulty}-${level}`;
                        const unlocked = level === 1 || isSudokuUnlocked(profile, id);
                        const completed = isSudokuCompleted(profile, id);
                        const canUnlock = profile.tokens >= currentTier.unlockCost;
                        const canPlay = unlocked || canUnlock;
                        const earnedStars = profile.sudokuStars?.[id] || 0;
                        const bestTime = profile.sudokuBestTime?.[id];

                        // Determine if current level is the latest playable active level
                        const isActiveLevel = unlocked && !completed;

                        return (
                            <Pressable
                                key={level}
                                disabled={!canPlay}
                                onPress={() => onPlay(selectedDifficulty, level)}
                                style={[
                                    styles.levelCard,
                                    isActiveLevel && styles.levelCardActiveGlow,
                                    completed && styles.levelCardCompleted,
                                    !unlocked && styles.levelCardLocked,
                                    !canPlay && { opacity: 0.45 },
                                ]}
                            >
                                {/* Top: Image & Badge */}
                                <View style={styles.cardImageContainer}>
                                    <Image
                                        source={getLevelImage(level)}
                                        style={styles.cardImage}
                                        resizeMode="cover"
                                    />
                                    {/* Level Number Pill */}
                                    <View style={styles.levelBadge}>
                                        <Text style={styles.levelBadgeText}>{level}</Text>
                                    </View>
                                </View>

                                {/* Bottom Info Base */}
                                <View style={styles.cardBottom}>
                                    {/* 3 Stars */}
                                    <View style={styles.starsRow}>
                                        {Array.from({ length: 3 }).map((_, sIdx) => (
                                            <Ionicons
                                                key={sIdx}
                                                name={sIdx < earnedStars ? "star" : "star"}
                                                size={10}
                                                color={sIdx < earnedStars ? "#FBBF24" : "rgba(255,255,255,0.18)"}
                                            />
                                        ))}
                                    </View>

                                    {/* Best time (if completed) */}
                                    {completed && typeof bestTime === "number" && bestTime > 0 ? (
                                        <Text style={styles.bestTimeText}>
                                            ⏱ {formatSecondsToTime(bestTime)}
                                        </Text>
                                    ) : null}

                                    {/* Action row */}
                                    {unlocked ? (
                                        <View style={[styles.playPill, completed && styles.playPillCompleted]}>
                                            <Ionicons
                                                name={completed ? "play" : "play"}
                                                size={9}
                                                color={completed ? "#94A3B8" : "#0F172A"}
                                            />
                                            <Text
                                                style={[
                                                    styles.playPillText,
                                                    completed && styles.playPillTextCompleted,
                                                ]}
                                            >
                                                Play
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.lockedRow}>
                                            <Ionicons name="lock-closed" size={10} color="#94A3B8" />
                                            <View style={styles.lockedToken}>
                                                <Ionicons name="diamond" size={9} color="#FBBF24" />
                                                <Text style={styles.lockedCostText}>
                                                    {currentTier.unlockCost}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

function getCompletedCount(
    profile: LocalProfile,
    difficulty: SudokuDifficulty,
): number {
    const prefix = `sudoku-${difficulty}-`;
    return Object.entries(profile.completedSudoku || {}).filter(
        ([key, completed]) => key.startsWith(prefix) && completed === true,
    ).length;
}

const useStyles = makeStyles((colors) => ({
    root: {
        flex: 1,
        backgroundColor: "transparent",
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 8,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(30, 41, 59, 0.8)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    tokenPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: "rgba(251, 191, 36, 0.35)",
    },
    tokenGem: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    tokenPillText: {
        color: "#FBBF24",
        fontSize: 14,
        fontWeight: "900",
    },
    heroRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 2,
    },
    heroCopy: {
        flex: 1,
        gap: 4,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    crownEmoji: {
        fontSize: 22,
    },
    title: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    subtitle: {
        color: "rgba(255, 255, 255, 0.65)",
        fontSize: 12,
        fontWeight: "600",
    },
    mascotWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "rgba(99, 102, 241, 0.4)",
        backgroundColor: "#0B1120",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    mascotImage: {
        width: "100%",
        height: "100%",
    },

    // Progress
    progressContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 6,
    },
    progressInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    progressInfoText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },
    progressTrackWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    progressTrack: {
        flex: 1,
        height: 10,
        borderRadius: 99,
        backgroundColor: "rgba(30, 41, 59, 0.8)",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    progressFill: {
        height: "100%",
        borderRadius: 99,
        backgroundColor: "#38BDF8",
    },
    trophyIcon: {
        fontSize: 18,
    },

    // Nav Bar
    navBarWrapper: {
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    navBarScroll: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 4,
    },
    navTab: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    navTabActive: {
        backgroundColor: "#FBBF24",
        borderColor: "#F59E0B",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    navTabLabel: {
        color: "#94A3B8",
        fontSize: 13,
        fontWeight: "800",
    },
    navTabLabelActive: {
        color: "#0F172A",
        fontWeight: "900",
    },

    // Grid
    scrollContent: {
        paddingHorizontal: 12,
        paddingBottom: 95,
    },
    levelsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 8,
    },
    levelCard: {
        width: "23%",
        borderRadius: 14,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
        marginBottom: 8,
    },
    levelCardActiveGlow: {
        borderColor: "#FBBF24",
        borderWidth: 2,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
    },
    levelCardCompleted: {
        borderColor: "rgba(52, 211, 153, 0.4)",
    },
    levelCardLocked: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        backgroundColor: "rgba(10, 15, 29, 0.85)",
    },
    cardImageContainer: {
        width: "100%",
        aspectRatio: 1.15,
        position: "relative",
        backgroundColor: "#0B1120",
    },
    cardImage: {
        width: "100%",
        height: "100%",
    },
    levelBadge: {
        position: "absolute",
        top: 4,
        left: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    levelBadgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "900",
    },
    cardBottom: {
        paddingVertical: 5,
        paddingHorizontal: 2,
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(11, 17, 32, 0.95)",
    },
    starsRow: {
        flexDirection: "row",
        gap: 2,
    },
    bestTimeText: {
        color: "#38BDF8",
        fontSize: 8.5,
        fontWeight: "800",
    },
    playPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        backgroundColor: "#FBBF24",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 99,
        marginTop: 1,
    },
    playPillCompleted: {
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    playPillText: {
        color: "#0F172A",
        fontSize: 9.5,
        fontWeight: "900",
    },
    playPillTextCompleted: {
        color: "#94A3B8",
        fontSize: 9.5,
        fontWeight: "800",
    },
    lockedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 1,
    },
    lockedToken: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    lockedCostText: {
        color: "#FBBF24",
        fontSize: 9.5,
        fontWeight: "900",
    },
}));