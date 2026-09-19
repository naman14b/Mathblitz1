import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { LocalProfile } from "@/src/game/types";
import { getSudokuPuzzleId } from "@/src/game/sudoku/types";
import type {
    SudokuDifficulty,
    SudokuGrid,
    SudokuPuzzle,
} from "@/src/game/sudoku/types";
import { generateSudokuSet } from "@/src/game/sudoku/engine";
import { makeStyles, useTheme } from "@/src/theme";

type SudokuGameProps = {
    profile: LocalProfile;
    difficulty: SudokuDifficulty;
    gameNumber: number;
    onBack: () => void;
    onComplete: (puzzleId: string) => void;
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
            onComplete(puzzle.id);
        }
    }, [isComplete, onComplete, puzzle.id]);

    const handleNumberPress = (number: number) => {
        if (!selected || secondsLeft === 0) return;

        const [row, column] = selected;

        if (puzzle.puzzle[row][column] !== 0) return;

        if (puzzle.solution[row][column] !== number) {
            setMistakes((current) => current + 1);
            return;
        }

        setGrid((current) => {
            const next = current.map((item) => [...item]);
            next[row][column] = number;
            return next;
        });
    };

    const handleHint = () => {
        if (!selected || hintsUsed >= 4 || secondsLeft === 0) return;

        const [row, column] = selected;

        if (puzzle.puzzle[row][column] !== 0) return;
        if (grid[row][column] !== 0) return;

        setGrid((current) => {
            const next = current.map((item) => [...item]);
            next[row][column] = puzzle.solution[row][column];
            return next;
        });

        setHintsUsed((current) => current + 1);
    };

    return (
        <View style={styles.container}>
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
                    <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
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

                <View style={styles.board}>
                    {grid.map((row, rowIndex) =>
                        row.map((value, columnIndex) => {
                            const original = puzzle.puzzle[rowIndex][columnIndex];
                            const isSelected =
                                selected?.[0] === rowIndex &&
                                selected?.[1] === columnIndex;

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
                </View>

                <View style={styles.controls}>
                    <Pressable
                        onPress={handleHint}
                        style={styles.hintButton}
                        disabled={!selected || hintsUsed >= 4}
                    >
                        <Text style={styles.hintText}>Use Hint</Text>
                    </Pressable>
                </View>

                <View style={styles.numberPad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                        <Pressable
                            key={number}
                            onPress={() => handleNumberPress(number)}
                            style={styles.numberButton}
                        >
                            <Text style={styles.numberText}>{number}</Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.helper}>
                    Select an empty square, then choose a number.
                </Text>

                <Text style={styles.tokenText}>
                    Current tokens: {profile.tokens}
                </Text>
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((colors) => ({
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
        borderColor: colors.onSurface,
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
        borderRightWidth: 2,
        borderRightColor: colors.onSurface,
    },
    bottomBorder: {
        borderBottomWidth: 2,
        borderBottomColor: colors.onSurface,
    },
    selectedCell: {
        backgroundColor: colors.brandSecondary,
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
    },
    numberText: {
        color: colors.onSurface,
        fontSize: 20,
        fontWeight: "900",
    },
    helper: {
        color: colors.muted,
        textAlign: "center",
        fontSize: 12,
        marginTop: 14,
    },
    tokenText: {
        color: colors.onSurfaceSecondary,
        fontSize: 13,
        fontWeight: "800",
        marginTop: 8,
    },
}));