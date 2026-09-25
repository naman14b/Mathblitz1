import React, { useEffect, useMemo, useState, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { playSound } from "@/src/game/sounds";

import type { LocalProfile } from "@/src/game/types";
import { getSudokuPuzzleId } from "@/src/game/sudoku/types";
import type {
    SudokuDifficulty,
    SudokuGrid,
    SudokuPuzzle,
} from "@/src/game/sudoku/types";
import { generateSudokuSet } from "@/src/game/sudoku/engine";
import { makeStyles, useTheme } from "@/src/theme";
import { TokenFlyAnimation, TokenFlyRef } from "@/src/components/TokenFlyAnimation";
import { ComboDisplay } from "@/src/components/ComboDisplay";
import { BlitzEnergyBar } from "@/src/components/BlitzEnergyBar";
import { showRewardedAd, showRewardedInterstitialAd } from "@/src/services/ads";

type SudokuGameProps = {
    profile: LocalProfile;
    difficulty: SudokuDifficulty;
    gameNumber: number;
    onBack: () => void;
    onComplete: (puzzleId: string, mistakes: number, elapsedSeconds: number) => void;
};

export function SudokuGame({
    profile,
    difficulty,
    gameNumber,
    onBack,
    onComplete,
}: SudokuGameProps) {
    const { colors } = useTheme();
    const styles = useStyles();

    const puzzle = useMemo<SudokuPuzzle>(() => {
        const puzzles = generateSudokuSet(difficulty, 1);
        return {
            ...puzzles[0],
            id: getSudokuPuzzleId(difficulty, gameNumber),
            number: gameNumber,
        };
    }, [difficulty, gameNumber]);

    const [grid, setGrid] = useState<SudokuGrid>(() =>
        puzzle.puzzle.map((row) => [...row]),
    );
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [mistakeCell, setMistakeCell] = useState<[number, number] | null>(null);
    const [paceNotice, setPaceNotice] = useState("");

    // Effects State
    const [combo, setCombo] = useState(0);
    const [blitzEnergy, setBlitzEnergy] = useState(0);
    const isBlitzMode = blitzEnergy >= 100;
    const tokenFlyRef = useRef<TokenFlyRef>(null);

    const shakeTranslateX = useSharedValue(0);

    const triggerShake = () => {
        shakeTranslateX.value = withSequence(
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    const boardAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shakeTranslateX.value }]
        };
    });

    const timeLimit = useMemo(() => {
        switch (difficulty) {
            case "easy":
                return 600;
            case "medium":
                return 720;
            case "hard":
                return 900;
            case "expert":
                return 1080;
            case "evil":
                return 1200;
        }
    }, [difficulty]);

    const [hasWon, setHasWon] = useState(false);
    const [finalElapsed, setFinalElapsed] = useState(0);
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    useEffect(() => {
        setSecondsLeft(timeLimit);
    }, [timeLimit]);

    useEffect(() => {
        if (secondsLeft <= 0 || hasWon) return;

        const timer = setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft, hasWon]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(
            remaining,
        ).padStart(2, "0")}`;
    };

    const isComplete = grid.every((row, rowIndex) =>
        row.every(
            (value, columnIndex) =>
                value !== 0 && value === puzzle.solution[rowIndex][columnIndex],
        ),
    );

    useEffect(() => {
        if (isComplete && !hasWon) {
            const elapsed = Math.max(1, timeLimit - secondsLeft);
            setFinalElapsed(elapsed);
            setHasWon(true);
            playSound("levelup", profile.settings.sound);
            if (profile.settings.vibration) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
        }
    }, [isComplete, hasWon, timeLimit, secondsLeft, profile.settings.sound, profile.settings.vibration]);

    const handleClaimVictory = () => {
        const currentElapsed = finalElapsed > 0 ? finalElapsed : Math.max(1, timeLimit - secondsLeft);
        onComplete(puzzle.id, mistakes, currentElapsed);
    };

    const handlePlayAgain = () => {
        setGrid(puzzle.puzzle.map(row => [...row]));
        setSelected(null);
        setMistakes(0);
        setHintsUsed(0);
        setSecondsLeft(timeLimit);
        setMistakeCell(null);
        setPaceNotice("");
        setCombo(0);
        setBlitzEnergy(0);
        setHasWon(false);
        setFinalElapsed(0);
    };

    const starsEarned = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

    const handleNumberPress = (number: number, event: any) => {
        if (!selected || secondsLeft === 0 || hasWon) return;

        const [row, column] = selected;

        if (puzzle.puzzle[row][column] !== 0) return;

        if (puzzle.solution[row][column] !== number) {
            setMistakes((current) => current + 1);
            setSecondsLeft((current) => Math.max(0, current - 60));
            setPaceNotice("−60s");
            setTimeout(() => setPaceNotice(""), 1200);

            setMistakeCell([row, column]);
            setTimeout(() => setMistakeCell(null), 1000);

            setCombo(0);
            if (!isBlitzMode) setBlitzEnergy(0);
            triggerShake();

            playSound("wrong", profile.settings.sound);
            if (profile.settings.vibration) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
            }
            return;
        }

        setGrid((current) => {
            const next = current.map((item) => [...item]);
            next[row][column] = number;
            return next;
        });

        // Effects
        setCombo(c => c + 1);
        if (!isBlitzMode) {
            setBlitzEnergy(e => Math.min(100, e + 25)); // 4 correct answers = blitz
        }

        const tokensToAward = isBlitzMode ? 4 : 2;
        if (tokenFlyRef.current && event?.nativeEvent) {
            const { pageX, pageY } = event.nativeEvent;
            tokenFlyRef.current.trigger(pageX || 200, pageY || 400, tokensToAward);
        }

        playSound("correct", profile.settings.sound);
        if (profile.settings.vibration) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }
    };

    const handleHint = () => {
        if (secondsLeft === 0) return;

        const emptyCells: [number, number][] = [];
        grid.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value === 0) emptyCells.push([r, c]);
            });
        });

        if (emptyCells.length === 0) return;

        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }

        const toFill = emptyCells.slice(0, 2);

        setGrid((current) => {
            const next = current.map((item) => [...item]);
            toFill.forEach(([r, c]) => {
                next[r][c] = puzzle.solution[r][c];
            });
            return next;
        });

        setHintsUsed((current) => current + 1);
    };

    const handleWatchAdToContinue = async () => {
        await showRewardedInterstitialAd(() => {
            setSecondsLeft(60);
        });
    };

    const handleWatchAdForHint = async () => {
        await showRewardedAd(() => {
            handleHint();
        });
    };

    return (
        <View style={styles.container}>
            <TokenFlyAnimation ref={tokenFlyRef} />
            <ComboDisplay combo={combo} />

            <View style={styles.header}>
                <Pressable
                    onPress={hasWon ? handleClaimVictory : onBack}
                    style={styles.backButton}
                    accessibilityRole="button"
                >
                    <Text style={styles.backText}>‹ Back</Text>
                </Pressable>

                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Sudoku</Text>
                    <Text style={styles.subtitle}>
                        {difficulty.toUpperCase()} · Game {gameNumber}/50
                    </Text>
                </View>

                <View style={styles.timer}>
                    <Text style={[styles.timerText, secondsLeft < 60 && { color: colors.error }]}>{formatTime(secondsLeft)}</Text>
                </View>
            </View>

            {paceNotice ? (
                <View style={styles.paceNoticeContainer}>
                    <Text style={styles.paceNoticeText}>Penalty {paceNotice}</Text>
                </View>
            ) : null}

            {/* Victory Screen */}
            {hasWon ? (
                <View style={styles.modalOverlay}>
                    <View style={styles.endCard}>
                        {/* Trophy Icon */}
                        <View style={styles.victoryIconBadge}>
                            <Ionicons name="trophy" size={38} color="#FBBF24" />
                        </View>

                        <Text style={styles.endTitle}>Sudoku Cleared!</Text>

                        {/* Stars */}
                        <View style={styles.victoryStarsRow}>
                            {[1, 2, 3].map((starIdx) => (
                                <View key={starIdx} style={styles.victoryStarWrapper}>
                                    <Ionicons
                                        name={starIdx <= starsEarned ? "star" : "star-outline"}
                                        size={36}
                                        color={starIdx <= starsEarned ? "#FBBF24" : "rgba(255, 255, 255, 0.2)"}
                                    />
                                </View>
                            ))}
                        </View>

                        <Text style={styles.victoryBadgeSub}>
                            {starsEarned === 3
                                ? "🌟 Flawless Solve! 3 Stars!"
                                : starsEarned === 2
                                ? "⚡ Great Job! 2 Stars!"
                                : "👏 Game Complete! 1 Star!"}
                        </Text>

                        {/* Stats Grid */}
                        <View style={styles.victoryStatsGrid}>
                            <View style={styles.victoryStatCard}>
                                <Text style={styles.victoryStatLabel}>⏱ Time</Text>
                                <Text style={styles.victoryStatVal}>{formatTime(finalElapsed)}</Text>
                            </View>
                            <View style={styles.victoryStatCard}>
                                <Text style={styles.victoryStatLabel}>❌ Mistakes</Text>
                                <Text style={styles.victoryStatVal}>{mistakes}</Text>
                            </View>
                            <View style={styles.victoryStatCard}>
                                <Text style={styles.victoryStatLabel}>🪙 Reward</Text>
                                <Text style={styles.victoryStatVal}>+5 Tokens</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.endActions}>
                            <Pressable
                                onPress={handleClaimVictory}
                                style={[styles.endPrimaryBtn, { backgroundColor: "#FBBF24" }]}
                            >
                                <Ionicons name="arrow-forward-circle" size={22} color="#0F172A" />
                                <Text style={[styles.endPrimaryBtnText, { color: "#0F172A" }]}>Claim & Continue</Text>
                            </Pressable>

                            <Pressable
                                onPress={handlePlayAgain}
                                style={styles.endSecondaryBtn}
                            >
                                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                                <Text style={styles.endSecondaryBtnText}>Play Again</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            ) : secondsLeft === 0 ? (
                /* Defeat / Time's Up Screen */
                <View style={styles.modalOverlay}>
                    <View style={[styles.endCard, styles.defeatCard]}>
                        <View style={styles.defeatIconBadge}>
                            <Ionicons name="hourglass" size={38} color="#EF4444" />
                        </View>

                        <Text style={[styles.endTitle, { color: "#EF4444" }]}>Time's Up!</Text>
                        <Text style={styles.defeatSub}>
                            You ran out of time on this Sudoku puzzle. Watch a short ad for extra time or try again!
                        </Text>

                        <View style={styles.endActions}>
                            <Pressable
                                onPress={handleWatchAdToContinue}
                                disabled={isWatchingAd}
                                style={[styles.endPrimaryBtn, { backgroundColor: "#F59E0B" }]}
                            >
                                <Ionicons name="gift" size={20} color="#0F172A" />
                                <Text style={[styles.endPrimaryBtnText, { color: "#0F172A" }]}>
                                    {isWatchingAd ? "Loading Ad..." : "Watch Ad for +60s 🎁"}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handlePlayAgain}
                                style={[styles.endSecondaryBtn, { backgroundColor: "rgba(255, 255, 255, 0.12)" }]}
                            >
                                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                                <Text style={styles.endSecondaryBtnText}>Try Again</Text>
                            </Pressable>

                            <Pressable
                                onPress={onBack}
                                style={{ paddingVertical: 10, alignItems: "center" }}
                            >
                                <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 14, fontWeight: "700" }}>‹ Back to Levels</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <BlitzEnergyBar energy={blitzEnergy} isBlitzMode={isBlitzMode} />

                    <View style={styles.statusRow}>
                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Free Hints</Text>
                            <Text style={styles.statusValue}>{1 - Math.min(1, hintsUsed)}/1</Text>
                        </View>

                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Mistakes</Text>
                            <Text style={styles.statusValue}>{mistakes}</Text>
                        </View>
                    </View>

                    <Animated.View style={[styles.board, boardAnimatedStyle, isBlitzMode && { borderColor: colors.brandSecondary, shadowColor: colors.brandSecondary, shadowOpacity: 0.5, shadowRadius: 10 }]}>
                        {grid.map((row, rowIndex) =>
                            row.map((value, columnIndex) => {
                                const original = puzzle.puzzle[rowIndex][columnIndex];
                                const isSelected =
                                    selected?.[0] === rowIndex &&
                                    selected?.[1] === columnIndex;
                                const isMistake = mistakeCell?.[0] === rowIndex && mistakeCell?.[1] === columnIndex;

                                return (
                                    <Pressable
                                        key={`${rowIndex}-${columnIndex}`}
                                        onPress={() => setSelected([rowIndex, columnIndex])}
                                        style={[
                                            styles.cell,
                                            columnIndex === 2 && styles.rightBorder,
                                            columnIndex === 5 && styles.rightBorder,
                                            rowIndex === 2 && styles.bottomBorder,
                                            rowIndex === 5 && styles.bottomBorder,
                                            isSelected && styles.selectedCell,
                                            isMistake && styles.mistakeCell,
                                            original === 0 && value !== 0 && { backgroundColor: (colors as any).glowCorrect }
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.cellText,
                                                original !== 0 && styles.givenText,
                                                original === 0 && styles.playerText,
                                            ]}
                                        >
                                            {value === 0 ? "" : value}
                                        </Text>
                                    </Pressable>
                                );
                            }),
                        )}
                    </Animated.View>

                    <View style={styles.controls}>
                        <Pressable
                            onPress={hintsUsed >= 1 ? handleWatchAdForHint : handleHint}
                            style={[styles.hintButton, { backgroundColor: (secondsLeft === 0) ? colors.surfaceTertiary : colors.brandPrimary }]}
                            disabled={secondsLeft === 0}
                        >
                            <Text style={[styles.hintText, { color: (secondsLeft === 0) ? colors.muted : colors.onBrandPrimary }]}>
                                {hintsUsed >= 1 ? "💡 Watch Ad for Free Hint" : "💡 Use Free Hint"}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.numberPad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                            <Pressable
                                key={number}
                                onPress={(e) => handleNumberPress(number, e)}
                                style={styles.numberButton}
                            >
                                <Text style={styles.numberText}>{number}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const useStyles = makeStyles((colors: any) => ({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.surfaceSecondary,
    },
    backButton: {
        minWidth: 60,
        paddingVertical: 10,
    },
    backText: {
        color: colors.brandPrimary,
        fontSize: 16,
        fontWeight: "800",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
    },
    title: {
        color: colors.onSurface,
        fontSize: 21,
        fontWeight: "900",
        textShadowColor: colors.brandPrimary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8
    },
    subtitle: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: "700",
        marginTop: 2,
    },
    timer: {
        minWidth: 64,
        alignItems: "flex-end",
    },
    timerText: {
        color: colors.brandPrimary,
        fontSize: 17,
        fontWeight: "900",
    },
    paceNoticeContainer: {
        position: "absolute",
        top: 60,
        right: 16,
        backgroundColor: colors.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        zIndex: 10,
    },
    paceNoticeText: {
        color: colors.onError,
        fontSize: 14,
        fontWeight: "900",
    },
    content: {
        padding: 16,
        paddingBottom: 36,
        alignItems: "center",
    },
    statusRow: {
        width: "100%",
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    statusCard: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border
    },
    statusLabel: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: "700",
    },
    statusValue: {
        color: colors.onSurface,
        fontSize: 18,
        fontWeight: "900",
        marginTop: 3,
    },
    board: {
        width: "100%",
        maxWidth: 380,
        aspectRatio: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        borderWidth: 2.5,
        borderColor: colors.onSurface,
        backgroundColor: colors.surface,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    cell: {
        width: "11.111%",
        height: "11.111%",
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.surface,
    },
    rightBorder: {
        borderRightWidth: 3,
        borderRightColor: colors.onSurface,
    },
    bottomBorder: {
        borderBottomWidth: 3,
        borderBottomColor: colors.onSurface,
    },
    selectedCell: {
        backgroundColor: colors.brandSecondary + "33",
        borderWidth: 1.5,
        borderColor: colors.brandPrimary,
    },
    mistakeCell: {
        backgroundColor: colors.error,
        shadowColor: colors.error,
        shadowOpacity: 1,
        shadowRadius: 15
    },
    cellText: {
        fontSize: 20,
        fontWeight: "800",
    },
    givenText: {
        color: colors.onSurface,
    },
    playerText: {
        color: colors.brandPrimary,
    },
    controls: {
        width: "100%",
        maxWidth: 380,
        marginTop: 16,
    },
    hintButton: {
        backgroundColor: colors.brandTertiary,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: "center",
    },
    hintText: {
        color: colors.onBrandTertiary,
        fontSize: 15,
        fontWeight: "900",
    },
    numberPad: {
        width: "100%",
        maxWidth: 380,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 14,
        justifyContent: "center",
    },
    numberButton: {
        width: "30%",
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: colors.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    numberText: {
        color: colors.brandPrimary,
        fontSize: 24,
        fontWeight: "900",
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 2
    },

    // Modal & End Game (Victory & Time's Up)
    modalOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(5, 10, 25, 0.95)",
        zIndex: 999,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    endCard: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "rgba(15, 23, 42, 0.98)",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FBBF24",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    defeatCard: {
        borderColor: "#EF4444",
        shadowColor: "#EF4444",
    },
    victoryIconBadge: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        borderWidth: 2,
        borderColor: "#FBBF24",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    defeatIconBadge: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderWidth: 2,
        borderColor: "#EF4444",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    endTitle: {
        fontSize: 26,
        fontWeight: "900",
        color: "#FFFFFF",
        textAlign: "center",
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    victoryStarsRow: {
        flexDirection: "row",
        gap: 12,
        marginVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    victoryStarWrapper: {
        shadowColor: "#FBBF24",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
    },
    victoryBadgeSub: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FCD34D",
        textAlign: "center",
        marginBottom: 16,
    },
    defeatSub: {
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.75)",
        textAlign: "center",
        marginBottom: 20,
    },
    victoryStatsGrid: {
        flexDirection: "row",
        gap: 8,
        width: "100%",
        marginBottom: 20,
    },
    victoryStatCard: {
        flex: 1,
        backgroundColor: "rgba(30, 41, 59, 0.8)",
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    victoryStatLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.6)",
        marginBottom: 4,
    },
    victoryStatVal: {
        fontSize: 15,
        fontWeight: "900",
        color: "#FFFFFF",
    },
    endActions: {
        width: "100%",
        gap: 10,
    },
    endPrimaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        width: "100%",
    },
    endPrimaryBtnText: {
        fontSize: 16,
        fontWeight: "900",
    },
    endSecondaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        width: "100%",
    },
    endSecondaryBtnText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
    },
}));