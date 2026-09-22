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
    const { colors } = useTheme();
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
                        style={[styles.hintButton, { backgroundColor: colors.brandPrimary, paddingHorizontal: 40, marginBottom: 12, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={styles.hintText}>Try Again</Text>
                    </Pressable>
                    <Pressable 
                        onPress={() => setSecondsLeft(60)} 
                        style={[styles.hintButton, { backgroundColor: colors.brandSecondary, paddingHorizontal: 40, width: '100%', maxWidth: 300 }]}
                    >
                        <Text style={[styles.hintText, { color: colors.brandPrimary }]}>Watch Ad to Continue (+60s)</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <BlitzEnergyBar energy={blitzEnergy} isBlitzMode={isBlitzMode} />
                    
                    <View style={styles.statusRow}>
                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Hints</Text>
                            <Text style={styles.statusValue}>{4 - hintsUsed}/4</Text>
                        </View>
                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Mistakes</Text>
                            <Text style={styles.statusValue}>{mistakes}</Text>
                        </View>
                    </View>

                    <Animated.View style={[styles.board, boardAnimatedStyle, isBlitzMode && { borderColor: colors.brandSecondary, shadowColor: colors.brandSecondary, shadowOpacity: 0.5, shadowRadius: 10 }]}>
                        {grid.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.row}>
                                {row.map((cell, columnIndex) => {
                                    const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === columnIndex;
                                    const isMistake = mistakeCell?.[0] === rowIndex && mistakeCell?.[1] === columnIndex;

                                    if (cell.type === 'empty') {
                                        return <View key={`${rowIndex}-${columnIndex}`} style={styles.emptyCell} />;
                                    }

                                    if (cell.type === 'operator' || cell.type === 'equals') {
                                        return (
                                            <View key={`${rowIndex}-${columnIndex}`} style={styles.operatorCell}>
                                                <Text style={styles.operatorText}>{cell.value}</Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <Pressable
                                            key={`${rowIndex}-${columnIndex}`}
                                            onPress={() => cell.isBlank && setSelectedCell([rowIndex, columnIndex])}
                                            style={[
                                                styles.numberCell,
                                                cell.isBlank && styles.blankCell,
                                                isSelected && styles.selectedCell,
                                                isMistake && styles.mistakeCell,
                                                !cell.isBlank && !cell.isGiven && { backgroundColor: (colors as any).glowCorrect } // Hinting at placed cells
                                            ]}
                                        >
                                            {!cell.isBlank && <Text style={[styles.cellText, styles.givenText]}>{cell.value}</Text>}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </Animated.View>

                    <View style={styles.controls}>
                        <Pressable onPress={handleHint} style={[styles.hintButton, { backgroundColor: (hintsUsed >= 4 || secondsLeft === 0) ? colors.surfaceTertiary : colors.brandPrimary }]} disabled={hintsUsed >= 4 || secondsLeft === 0}>
                            <Text style={[styles.hintText, { color: (hintsUsed >= 4 || secondsLeft === 0) ? colors.muted : colors.onBrandPrimary }]}>Use Hint</Text>
                        </Pressable>
                    </View>

                    <View style={styles.bankContainer}>
                        {bank.map((val, idx) => (
                            <Pressable key={`${idx}-${val}`} onPress={(e) => handleBankPress(idx, val, e)} style={styles.bankItem}>
                                <Text style={styles.bankText}>{val}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.helper}>Select an empty green square, then choose a number below.</Text>
                </ScrollView>
            )}
        </View>
    );
}

const useStyles = makeStyles((colors: any) => ({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: 'rgba(0,0,0,0.4)' },
    backButton: { minWidth: 60, paddingVertical: 10 },
    backText: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
    headerCenter: { flex: 1, alignItems: "center" },
    title: { color: colors.onSurface, fontSize: 21, fontWeight: "900", textShadowColor: colors.brandPrimary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
    subtitle: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
    timer: { minWidth: 64, alignItems: "flex-end" },
    timerText: { color: colors.brandPrimary, fontSize: 17, fontWeight: "900" },
    paceNoticeContainer: { position: "absolute", top: 60, right: 16, backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, zIndex: 10 },
    paceNoticeText: { color: colors.onError, fontSize: 14, fontWeight: "900" },
    content: { padding: 16, paddingBottom: 36, alignItems: "center" },
    statusRow: { width: "100%", flexDirection: "row", gap: 10, marginBottom: 16 },
    statusCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    statusLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
    statusValue: { color: colors.onSurface, fontSize: 18, fontWeight: "900", marginTop: 3 },
    board: { width: "100%", maxWidth: 380, aspectRatio: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, gap: 4 },
    row: { flex: 1, flexDirection: "row", gap: 4 },
    emptyCell: { flex: 1 },
    operatorCell: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
    operatorText: { fontSize: 18, fontWeight: "900", color: colors.onSurface },
    numberCell: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
    blankCell: { backgroundColor: colors.glowCorrect, borderColor: colors.success, borderWidth: 2 },
    selectedCell: { backgroundColor: colors.brandSecondary, borderColor: colors.brandPrimary, shadowColor: colors.brandPrimary, shadowOpacity: 0.8, shadowRadius: 10 },
    mistakeCell: { backgroundColor: colors.error, shadowColor: colors.error, shadowOpacity: 1, shadowRadius: 15 },
    cellText: { fontSize: 18, fontWeight: "800" },
    givenText: { color: colors.onSurface },
    controls: { width: "100%", maxWidth: 380, marginTop: 16 },
    hintButton: { paddingVertical: 13, borderRadius: 14, alignItems: "center" },
    hintText: { fontSize: 15, fontWeight: "900" },
    bankContainer: { width: "100%", maxWidth: 380, flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24, justifyContent: "center" },
    bankItem: { minWidth: 48, minHeight: 48, borderRadius: 8, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
    bankText: { color: colors.brandPrimary, fontSize: 20, fontWeight: "900", textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
    helper: { color: colors.muted, textAlign: "center", fontSize: 12, marginTop: 24 },
}));
