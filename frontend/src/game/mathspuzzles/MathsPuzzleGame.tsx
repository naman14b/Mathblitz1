import React, { useEffect, useMemo, useState, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import type { LocalProfile } from "@/src/game/types";
import { MathsPuzzle, MathsGrid } from "./types";
import { playSound } from "@/src/game/sounds";
import { makeStyles, useTheme } from "@/src/theme";
import { TokenFlyAnimation, TokenFlyRef } from "@/src/components/TokenFlyAnimation";
import { ComboDisplay } from "@/src/components/ComboDisplay";
import { BlitzEnergyBar } from "@/src/components/BlitzEnergyBar";

type MathsPuzzleGameProps = {
    profile: LocalProfile;
    puzzle: MathsPuzzle;
    onBack: () => void;
    onComplete: (level: number) => void;
};

export function MathsPuzzleGame({
    profile,
    puzzle,
    onBack,
    onComplete,
}: MathsPuzzleGameProps) {
    const { colors, isNight } = useTheme();
    const styles = useStyles();

    const [grid, setGrid] = useState<MathsGrid>(() => {
        return puzzle.grid.map(row => row.map(cell => ({ ...cell })));
    });
    const [bank, setBank] = useState<string[]>([...puzzle.bank]);
    const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(puzzle.timeLimitSeconds);
    const [mistakeCell, setMistakeCell] = useState<[number, number] | null>(null);
    const [paceNotice, setPaceNotice] = useState("");

    // --- New Effects State ---
    const [combo, setCombo] = useState(0);
    const [blitzEnergy, setBlitzEnergy] = useState(0);
    const isBlitzMode = blitzEnergy >= 100;

    const tokenFlyRef = useRef<TokenFlyRef>(null);

    // Shake Animation for the board
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
        return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    };

    const isComplete = bank.length === 0 && grid.every((row, r) =>
        row.every((cell, c) => {
            if (cell.isBlank) {
                return cell.value === puzzle.grid[r][c].value;
            }
            return true;
        })
    );

    useEffect(() => {
        if (isComplete) {
            onComplete(puzzle.level);
        }
    }, [isComplete, onComplete, puzzle.level]);

    const handleBankPress = (bankIndex: number, value: string, event: any) => {
        if (!selectedCell || secondsLeft === 0) return;

        const [row, column] = selectedCell;
        const correctValue = puzzle.grid[row][column].value;

        if (value !== correctValue) {
            setMistakes((current) => current + 1);
            setSecondsLeft((current) => Math.max(0, current - 60));
            setPaceNotice("−60s");
            setTimeout(() => setPaceNotice(""), 1200);

            setMistakeCell([row, column]);
            setTimeout(() => setMistakeCell(null), 1000);

            // Reset combo and energy
            setCombo(0);
            if (!isBlitzMode) setBlitzEnergy(0);

            triggerShake();

            playSound("wrong", profile.settings.sound);
            if (profile.settings.vibration) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            }
            return;
        }

        // Correct!
        setGrid((current) => {
            const next = current.map((item) => [...item]);
            next[row][column].isBlank = false;
            return next;
        });

        setBank((current) => {
            const next = [...current];
            next.splice(bankIndex, 1);
            return next;
        });
        setSelectedCell(null);
        
        // Effects
        setCombo(c => c + 1);
        if (!isBlitzMode) {
            setBlitzEnergy(e => Math.min(100, e + 25)); // 4 correct answers = blitz
        }

        // Trigger tokens
        const tokensToAward = isBlitzMode ? 4 : 2;
        if (tokenFlyRef.current && event?.nativeEvent) {
            const { pageX, pageY } = event.nativeEvent;
            tokenFlyRef.current.trigger(pageX || 200, pageY || 400, tokensToAward);
        }

        playSound("correct", profile.settings.sound);
        if (profile.settings.vibration) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
    };

    const handleHint = () => {
        if (hintsUsed >= 4 || secondsLeft === 0) return;

        const emptyCells: [number, number][] = [];
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell.isBlank) emptyCells.push([r, c]);
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
                next[r][c].isBlank = false;
            });
            return next;
        });

        setBank((current) => {
            let next = [...current];
            toFill.forEach(([r, c]) => {
                const val = puzzle.grid[r][c].value;
                const idx = next.indexOf(val as string);
                if (idx > -1) next.splice(idx, 1);
            });
            return next;
        });

        setHintsUsed((current) => current + 1);
    };

    return (
        <View style={styles.container}>
            <TokenFlyAnimation ref={tokenFlyRef} />
            <ComboDisplay combo={combo} />

            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>‹ Back</Text>
                </Pressable>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Maths Puzzle</Text>
                    <Text style={styles.subtitle}>Level {puzzle.level}/100</Text>
                </View>
                <View style={styles.timer}>
                    <Text style={[styles.timerText, secondsLeft < 30 && { color: colors.error }]}>{formatTime(secondsLeft)}</Text>
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
                            setGrid(puzzle.grid.map(row => row.map(cell => ({ ...cell }))));
                            setBank([...puzzle.bank]);
                            setSelectedCell(null);
                            setMistakes(0);
                            setHintsUsed(0);
                            setSecondsLeft(puzzle.timeLimitSeconds);
                            setMistakeCell(null);
                            setPaceNotice("");
                            setCombo(0);
                            setBlitzEnergy(0);
                        }} 
                        style={[styles.hintButton, styles.hintButtonDay, { paddingHorizontal: 40, marginBottom: 12, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={[styles.hintText, styles.hintTextDay]}>Try Again</Text>
                    </Pressable>
                    <Pressable 
                        onPress={() => setSecondsLeft(60)} 
                        style={[styles.hintButton, styles.hintButtonNight, { paddingHorizontal: 40, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={[styles.hintText, styles.hintTextNight]}>Watch Ad to Continue (+60s)</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <BlitzEnergyBar energy={blitzEnergy} isBlitzMode={isBlitzMode} />
                    
                    {/* Status Row: Hints & Mistakes */}
                    <View style={styles.statusRow}>
                        {/* Hints Card */}
                        <View style={[styles.statusCard, isNight ? styles.statusCardNight : styles.statusCardDay]}>
                            <View style={[styles.badgeIconContainer, isNight ? styles.badgeHintsNight : styles.badgeHintsDay]}>
                                <Ionicons name="bulb" size={20} color="#FFFFFF" />
                            </View>
                            <View style={styles.statusTextContainer}>
                                <Text style={[styles.statusLabel, isNight ? styles.statusLabelNight : styles.statusLabelDay]}>Hints</Text>
                                <Text style={[styles.statusValue, isNight ? styles.statusValueNight : styles.statusValueDay]}>
                                    {4 - hintsUsed}/4
                                </Text>
                            </View>
                        </View>

                        {/* Mistakes Card */}
                        <View style={[styles.statusCard, isNight ? styles.statusCardNight : styles.statusCardDay]}>
                            <View style={[styles.badgeIconContainer, isNight ? styles.badgeMistakesNight : styles.badgeMistakesDay]}>
                                <Ionicons name="close" size={20} color="#FFFFFF" />
                            </View>
                            <View style={styles.statusTextContainer}>
                                <Text style={[styles.statusLabel, isNight ? styles.statusLabelNight : styles.statusLabelDay]}>Mistakes</Text>
                                <Text style={[styles.statusValue, isNight ? styles.statusValueNight : styles.statusValueDay]}>
                                    {mistakes}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Puzzle Board */}
                    <Animated.View style={[
                        styles.board,
                        isNight ? styles.boardNight : styles.boardDay,
                        boardAnimatedStyle,
                        isBlitzMode && { borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.8, shadowRadius: 15 }
                    ]}>
                        {/* Watermark Math Glyphs in empty center */}
                        <View style={styles.watermarkLayer} pointerEvents="none">
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "18%", left: "14%", fontSize: 24 }]}>×</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "24%", left: "44%", fontSize: 18 }]}>+</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "20%", right: "22%", fontSize: 22 }]}>5</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "34%", right: "14%", fontSize: 20 }]}>×</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "48%", left: "42%", fontSize: 26 }]}>△</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "58%", left: "18%", fontSize: 24 }]}>8</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "56%", right: "16%", fontSize: 22 }]}>÷</Text>
                            <Text style={[styles.watermarkText, isNight && styles.watermarkTextNight, { top: "66%", right: "40%", fontSize: 20 }]}>5</Text>
                        </View>

                        {grid.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.row}>
                                {row.map((cell, columnIndex) => {
                                    const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === columnIndex;
                                    const isMistake = mistakeCell?.[0] === rowIndex && mistakeCell?.[1] === columnIndex;
                                    const originalCell = puzzle.grid[rowIndex][columnIndex];
                                    const wasOriginallyBlank = originalCell.isBlank;

                                    if (cell.type === 'empty') {
                                        return <View key={`${rowIndex}-${columnIndex}`} style={styles.emptyCell} />;
                                    }

                                    if (cell.type === 'operator' || cell.type === 'equals') {
                                        return (
                                            <View key={`${rowIndex}-${columnIndex}`} style={[styles.cellBase, isNight ? styles.operatorCellNight : styles.operatorCellDay]}>
                                                <Text style={[styles.cellText, styles.operatorText]}>{cell.value}</Text>
                                            </View>
                                        );
                                    }

                                    // Given initial starting cell (e.g. 10 at top-left)
                                    if (cell.isGiven) {
                                        return (
                                            <View key={`${rowIndex}-${columnIndex}`} style={[styles.cellBase, isNight ? styles.givenCellNight : styles.givenCellDay]}>
                                                <Text style={[styles.cellText, isNight ? styles.givenTextNight : styles.givenTextDay]}>
                                                    {cell.value}
                                                </Text>
                                            </View>
                                        );
                                    }

                                    // Blank slot waiting for user input
                                    if (cell.isBlank) {
                                        return (
                                            <Pressable
                                                key={`${rowIndex}-${columnIndex}`}
                                                onPress={() => setSelectedCell([rowIndex, columnIndex])}
                                                style={[
                                                    styles.cellBase,
                                                    isNight ? styles.blankCellNight : styles.blankCellDay,
                                                    isSelected && (isNight ? styles.selectedCellNight : styles.selectedCellDay),
                                                    isMistake && styles.mistakeCell
                                                ]}
                                            >
                                                <View style={[styles.blankInnerBorder, isNight ? styles.blankInnerBorderNight : styles.blankInnerBorderDay]} />
                                            </Pressable>
                                        );
                                    }

                                    // Filled by user / revealed by hint (originally blank)
                                    if (wasOriginallyBlank) {
                                        return (
                                            <View key={`${rowIndex}-${columnIndex}`} style={[styles.cellBase, isNight ? styles.filledCellNight : styles.filledCellDay]}>
                                                <Text style={[styles.cellText, styles.filledCellText]}>
                                                    {cell.value}
                                                </Text>
                                            </View>
                                        );
                                    }

                                    // Fixed target / result number (e.g. 23, 32, 14, 3)
                                    return (
                                        <View key={`${rowIndex}-${columnIndex}`} style={[styles.cellBase, isNight ? styles.targetCellNight : styles.targetCellDay]}>
                                            <Text style={[styles.cellText, isNight ? styles.targetTextNight : styles.targetTextDay]}>
                                                {cell.value}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </Animated.View>

                    {/* Use Hint Button */}
                    <View style={styles.controls}>
                        <Pressable 
                            onPress={handleHint} 
                            style={[
                                styles.hintButton, 
                                isNight ? styles.hintButtonNight : styles.hintButtonDay,
                                (hintsUsed >= 4 || secondsLeft === 0) && styles.hintButtonDisabled
                            ]} 
                            disabled={hintsUsed >= 4 || secondsLeft === 0}
                        >
                            <View style={[styles.hintBulbCircle, isNight ? styles.hintBulbCircleNight : styles.hintBulbCircleDay]}>
                                <Ionicons name="bulb" size={22} color="#FFFFFF" />
                            </View>
                            <Text style={[
                                styles.hintText, 
                                isNight ? styles.hintTextNight : styles.hintTextDay,
                                (hintsUsed >= 4 || secondsLeft === 0) && styles.hintTextDisabled
                            ]}>
                                Use Hint
                            </Text>
                        </Pressable>
                    </View>

                    {/* Number Selection Bank */}
                    <View style={styles.bankContainer}>
                        {bank.map((val, idx) => (
                            <Pressable 
                                key={`${idx}-${val}`} 
                                onPress={(e) => handleBankPress(idx, val, e)} 
                                style={[styles.bankItem, isNight ? styles.bankItemNight : styles.bankItemDay]}
                            >
                                <Text style={[styles.bankText, isNight ? styles.bankTextNight : styles.bankTextDay]}>{val}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Instruction Helper Pill */}
                    <View style={[styles.helperPill, isNight ? styles.helperPillNight : styles.helperPillDay]}>
                        <Text style={[styles.helperText, isNight ? styles.helperTextNight : styles.helperTextDay]}>
                            🍃  Select an empty green square, then choose a number below.  🍃
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const useStyles = makeStyles((colors: any) => ({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { 
        paddingHorizontal: 16, 
        paddingTop: 12, 
        paddingBottom: 12, 
        flexDirection: "row", 
        alignItems: "center", 
        borderBottomWidth: 1, 
        borderBottomColor: colors.divider, 
        backgroundColor: 'rgba(0,0,0,0.4)' 
    },
    backButton: { minWidth: 60, paddingVertical: 10 },
    backText: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
    headerCenter: { flex: 1, alignItems: "center" },
    title: { color: colors.onSurface, fontSize: 21, fontWeight: "900", textShadowColor: colors.brandPrimary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
    subtitle: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
    timer: { minWidth: 64, alignItems: "flex-end" },
    timerText: { color: colors.brandPrimary, fontSize: 17, fontWeight: "900" },
    paceNoticeContainer: { position: "absolute", top: 60, right: 16, backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, zIndex: 10 },
    paceNoticeText: { color: colors.onError, fontSize: 14, fontWeight: "900" },
    content: { padding: 14, paddingBottom: 36, alignItems: "center" },

    // Status Row & Cards
    statusRow: { width: "100%", maxWidth: 390, flexDirection: "row", gap: 12, marginBottom: 14 },
    statusCard: { 
        flex: 1, 
        flexDirection: "row", 
        alignItems: "center", 
        borderRadius: 20, 
        paddingVertical: 10, 
        paddingHorizontal: 12, 
        borderWidth: 2.5 
    },
    statusCardDay: { 
        backgroundColor: "#FFF6E5", 
        borderColor: "#E2B67E",
        shadowColor: "#7C4A1E",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
        elevation: 4
    },
    statusCardNight: { 
        backgroundColor: "rgba(15, 23, 42, 0.88)", 
        borderColor: "rgba(56, 189, 248, 0.45)",
        shadowColor: "#38BDF8",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4
    },
    badgeIconContainer: { 
        width: 38, 
        height: 38, 
        borderRadius: 19, 
        alignItems: "center", 
        justifyContent: "center", 
        marginRight: 10,
        borderWidth: 1.5
    },
    badgeHintsDay: { backgroundColor: "#F59E0B", borderColor: "#D97706" },
    badgeHintsNight: { backgroundColor: "#D97706", borderColor: "#FBBF24" },
    badgeMistakesDay: { backgroundColor: "#EF4444", borderColor: "#DC2626" },
    badgeMistakesNight: { backgroundColor: "#DC2626", borderColor: "#F87171" },
    statusTextContainer: { flex: 1 },
    statusLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
    statusLabelDay: { color: "#7C4A1E" },
    statusLabelNight: { color: "#93C5FD" },
    statusValue: { fontSize: 20, fontWeight: "900", marginTop: 1 },
    statusValueDay: { color: "#2E1C0C" },
    statusValueNight: { color: "#FFFFFF" },

    // Board & Canvas
    board: { 
        width: "100%", 
        maxWidth: 390, 
        aspectRatio: 1, 
        padding: 6, 
        borderRadius: 22, 
        borderWidth: 6, 
        gap: 5,
        position: "relative",
        overflow: "hidden"
    },
    boardDay: { 
        backgroundColor: "#0F3D6C", 
        borderColor: "#8F5024",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8
    },
    boardNight: { 
        backgroundColor: "#07152A", 
        borderColor: "#312E81",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8
    },
    watermarkLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0
    },
    watermarkText: {
        position: "absolute",
        color: "rgba(255, 255, 255, 0.12)",
        fontWeight: "900"
    },
    watermarkTextNight: {
        color: "rgba(129, 140, 248, 0.15)"
    },
    row: { flex: 1, flexDirection: "row", gap: 5, zIndex: 1 },
    emptyCell: { flex: 1 },
    cellBase: { 
        flex: 1, 
        alignItems: "center", 
        justifyContent: "center", 
        borderRadius: 10, 
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2
    },

    // Operator Cells (+, -, =)
    operatorCellDay: { backgroundColor: "#1D4ED8", borderColor: "#1E40AF" },
    operatorCellNight: { backgroundColor: "#1E3A8A", borderColor: "#3B82F6" },
    operatorText: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },

    // Initial Given Number (e.g. 10 at top-left)
    givenCellDay: { backgroundColor: "#FFF4DB", borderColor: "#DFC299" },
    givenCellNight: { backgroundColor: "#F1F5F9", borderColor: "#94A3B8" },
    givenTextDay: { color: "#0F172A", fontWeight: "900", fontSize: 18 },
    givenTextNight: { color: "#0F172A", fontWeight: "900", fontSize: 18 },

    // Target Result Numbers (23, 32, 14, 3)
    targetCellDay: { backgroundColor: "#38BDF8", borderColor: "#0284C7" },
    targetCellNight: { backgroundColor: "#0EA5E9", borderColor: "#38BDF8" },
    targetTextDay: { color: "#082F49", fontWeight: "900", fontSize: 18 },
    targetTextNight: { color: "#03182E", fontWeight: "900", fontSize: 18 },

    // Blank Target Slots (to be filled)
    blankCellDay: { backgroundColor: "#059669", borderColor: "#34D399", borderStyle: "dashed" },
    blankCellNight: { backgroundColor: "#065F46", borderColor: "#10B981", borderStyle: "dashed" },
    blankInnerBorder: { 
        ...StyleSheet.absoluteFillObject, 
        margin: 2, 
        borderRadius: 6, 
        borderWidth: 1, 
        borderStyle: "dashed", 
        borderColor: "rgba(255, 255, 255, 0.4)" 
    },
    blankInnerBorderDay: {},
    blankInnerBorderNight: { borderColor: "rgba(255, 255, 255, 0.3)" },

    // Selected Blank Slot
    selectedCellDay: { 
        backgroundColor: "#047857", 
        borderColor: "#FBBF24", 
        borderWidth: 3, 
        borderStyle: "solid",
        shadowColor: "#FBBF24",
        shadowOpacity: 0.9,
        shadowRadius: 10,
        elevation: 6
    },
    selectedCellNight: { 
        backgroundColor: "#047857", 
        borderColor: "#FBBF24", 
        borderWidth: 3, 
        borderStyle: "solid",
        shadowColor: "#FBBF24",
        shadowOpacity: 0.9,
        shadowRadius: 10,
        elevation: 6
    },

    // Mistake Flash
    mistakeCell: { 
        backgroundColor: "#DC2626", 
        borderColor: "#EF4444", 
        borderWidth: 3, 
        borderStyle: "solid",
        shadowColor: "#EF4444", 
        shadowOpacity: 0.9, 
        shadowRadius: 12,
        elevation: 6
    },

    // Correctly Filled Slot
    filledCellDay: { backgroundColor: "#059669", borderColor: "#10B981" },
    filledCellNight: { backgroundColor: "#047857", borderColor: "#34D399" },
    filledCellText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
    cellText: { textAlign: "center" },

    // Use Hint Button
    controls: { width: "100%", maxWidth: 390, marginTop: 14 },
    hintButton: { 
        flexDirection: "row",
        alignItems: "center", 
        justifyContent: "center",
        height: 56, 
        borderRadius: 28, 
        borderWidth: 3,
        paddingHorizontal: 20
    },
    hintButtonDay: { 
        backgroundColor: "#FBBF24", 
        borderColor: "#D97706",
        shadowColor: "#B45309",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 6
    },
    hintButtonNight: { 
        backgroundColor: "#F59E0B", 
        borderColor: "#FCD34D",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6
    },
    hintButtonDisabled: { 
        backgroundColor: "#9CA3AF", 
        borderColor: "#6B7280", 
        shadowOpacity: 0, 
        elevation: 0 
    },
    hintBulbCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        borderWidth: 1.5
    },
    hintBulbCircleDay: { backgroundColor: "rgba(255, 255, 255, 0.4)", borderColor: "rgba(255, 255, 255, 0.7)" },
    hintBulbCircleNight: { backgroundColor: "rgba(0, 0, 0, 0.2)", borderColor: "rgba(255, 255, 255, 0.4)" },
    hintText: { fontSize: 20, fontWeight: "900" },
    hintTextDay: { color: "#6B3308" },
    hintTextNight: { color: "#451A03" },
    hintTextDisabled: { color: "#E5E7EB" },

    // Number Selection Bank (Rack)
    bankContainer: { 
        width: "100%", 
        maxWidth: 390, 
        flexDirection: "row", 
        flexWrap: "wrap", 
        gap: 10, 
        marginTop: 18, 
        justifyContent: "center" 
    },
    bankItem: { 
        minWidth: 52, 
        minHeight: 52, 
        borderRadius: 14, 
        alignItems: "center", 
        justifyContent: "center", 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderWidth: 2.5
    },
    bankItemDay: { 
        backgroundColor: "#FDE68A", 
        borderColor: "#C8945A",
        shadowColor: "#8A5024",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4
    },
    bankItemNight: { 
        backgroundColor: "#1E293B", 
        borderColor: "#6366F1",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 5,
        elevation: 4
    },
    bankText: { fontSize: 22, fontWeight: "900" },
    bankTextDay: { color: "#3E200B" },
    bankTextNight: { color: "#38BDF8" },

    // Helper Instruction Pill
    helperPill: {
        maxWidth: 390,
        marginTop: 18,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center"
    },
    helperPillDay: {
        backgroundColor: "rgba(10, 32, 64, 0.88)",
        borderColor: "rgba(56, 189, 248, 0.35)"
    },
    helperPillNight: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderColor: "rgba(129, 140, 248, 0.5)"
    },
    helperText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
    helperTextDay: { color: "#93C5FD" },
    helperTextNight: { color: "#A5F3FC" },
}));

