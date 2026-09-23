import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MATHS_CATALOGUE } from "./catalogue";
import type { LocalProfile } from "@/src/game/types";
import { isMathsPuzzleUnlocked, isMathsPuzzleCompleted } from "@/src/game/storage";
import { makeStyles, useTheme } from "@/src/theme";
import { ASTRONAUT_HEADER, formatSecondsToTime, getLevelImage } from "@/src/game/levelAssets";

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
                            <Text style={styles.crownEmoji}>🧩</Text>
                            <Text style={styles.title}>Maths Puzzles</Text>
                        </View>
                        <Text style={styles.subtitle}>{gameCount} puzzles • Speed arithmetic</Text>
                    </View>

                    {/* Mascot illustration */}
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
                        {completedCount}/{gameCount} completed
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
                                        (completedCount / gameCount) * 100,
                                    )}%`,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.trophyIcon}>🏆</Text>
                </View>
            </View>

            {/* 4-Column Levels Grid */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.levelsGrid}>
                    {MATHS_CATALOGUE.map((puzzle) => {
                        const level = puzzle.level;
                        const unlockCost = 20 + (level - 1) * 5;
                        const unlocked = level === 1 || isMathsPuzzleUnlocked(profile, level) || Boolean((profile.unlockedMathsPuzzles as any)?.[String(level)]);
                        const earnedStars = Number(profile.mathsPuzzleStars?.[level] ?? (profile.mathsPuzzleStars as any)?.[String(level)] ?? 0);
                        const rawTime = profile.mathsPuzzleBestTime?.[level] ?? (profile.mathsPuzzleBestTime as any)?.[String(level)];
                        const bestTime = typeof rawTime === "number" ? rawTime : (rawTime ? Number(rawTime) : 0);
                        const completed = isMathsPuzzleCompleted(profile, level) || Boolean((profile.completedMathsPuzzles as any)?.[String(level)]) || Boolean(profile.completedMathsPuzzles?.[level]) || earnedStars > 0 || (typeof bestTime === "number" && bestTime > 0);
                        const canUnlock = profile.tokens >= unlockCost;
                        const canPlay = unlocked || canUnlock;

                        const isActiveLevel = unlocked && !completed;

                        return (
                            <Pressable
                                key={level}
                                disabled={!canPlay}
                                onPress={() => onPlay(level, unlockCost)}
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
                                                name="star"
                                                size={10}
                                                color={sIdx < earnedStars ? "#FBBF24" : "rgba(255,255,255,0.18)"}
                                            />
                                        ))}
                                    </View>

                                    {/* Best time (if completed / recorded) */}
                                    {typeof bestTime === "number" && bestTime > 0 ? (
                                        <View style={styles.bestTimePill}>
                                            <Text style={styles.bestTimeText}>
                                                ⏱ {formatSecondsToTime(bestTime)}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Action row */}
                                    {unlocked ? (
                                        <View style={[styles.playPill, completed && styles.playPillCompleted]}>
                                            <Ionicons
                                                name="play"
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
                                                    {unlockCost}
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
        fontSize: 30,
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
    bestTimePill: {
        backgroundColor: "rgba(56, 189, 248, 0.16)",
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderWidth: 0.5,
        borderColor: "rgba(56, 189, 248, 0.4)",
        marginTop: 1,
    },
    bestTimeText: {
        color: "#38BDF8",
        fontSize: 8.5,
        fontWeight: "900",
        textAlign: "center",
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
