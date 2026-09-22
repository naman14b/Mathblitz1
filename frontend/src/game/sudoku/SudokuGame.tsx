import React, { useEffect, useMemo, useState, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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

    useEffect(() => {
        setSecondsLeft(timeLimit);
    }, [timeLimit]);

    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft]);

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
        if (isComplete) {
            const elapsed = Math.max(1, timeLimit - secondsLeft);
            onComplete(puzzle.id, mistakes, elapsed);
        }
    }, [isComplete, onComplete, puzzle.id, mistakes, timeLimit, secondsLeft]);

    const handleNumberPress = (number: number, event: any) => {
        if (!selected || secondsLeft === 0) return;

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
                    onPress={onBack}
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

            {secondsLeft === 0 && !isComplete ? (
                <View style={[styles.content, { justifyContent: 'center', flex: 1 }]}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: colors.error, marginBottom: 20 }}>Time's Up!</Text>
                    <Pressable
                        onPress={() => {
                            setGrid(puzzle.puzzle.map(row => [...row]));
                            setSelected(null);
                            setMistakes(0);
                            setHintsUsed(0);
                            setSecondsLeft(timeLimit);
                            setMistakeCell(null);
                            setPaceNotice("");
                            setCombo(0);
                            setBlitzEnergy(0);
                        }}
                        style={[styles.hintButton, { backgroundColor: colors.brandPrimary, paddingHorizontal: 40, marginBottom: 12, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={styles.hintText}>Try Again</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleWatchAdToContinue}
                        style={[styles.hintButton, { backgroundColor: colors.brandSecondary, paddingHorizontal: 40, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={[styles.hintText, { color: colors.brandPrimary }]}>Watch Ad to Continue (+60s)</Text>
                    </Pressable>
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
        backgroundColor: 'transparent',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        borderWidth: 2,
        borderColor: colors.borderStrong,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        overflow: 'hidden'
    },
    cell: {
        width: "11.111%",
        height: "11.111%",
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
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
        backgroundColor: colors.brandSecondary,
        shadowColor: colors.brandPrimary,
        shadowOpacity: 0.8,
        shadowRadius: 10
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
        backgroundColor: colors.surfaceTertiary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border
    },
    numberText: {
        color: colors.brandPrimary,
        fontSize: 24,
        fontWeight: "900",
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 2
    },
}));