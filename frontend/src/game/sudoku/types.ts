export type SudokuDifficulty =
    | "easy"
    | "medium"
    | "hard"
    | "expert"
    | "evil";

export type SudokuGrid = number[][];

export type SudokuPuzzle = {
    id: string;
    number: number;
    difficulty: SudokuDifficulty;
    puzzle: SudokuGrid;
    solution: SudokuGrid;
};

export type SudokuTier = {
    difficulty: SudokuDifficulty;
    title: string;
    description: string;
    gameCount: number;
    unlockCost: number;
    timeLimitSeconds: number;
};

export const SUDOKU_TIERS: SudokuTier[] = [
    {
        difficulty: "easy",
        title: "Easy",
        description: "Basic scanning, naked singles and hidden singles.",
        gameCount: 50,
        unlockCost: 20,
        timeLimitSeconds: 600,
    },
    {
        difficulty: "medium",
        title: "Medium",
        description: "Box-line eliminations, early pairs and candidate tracking.",
        gameCount: 50,
        unlockCost: 35,
        timeLimitSeconds: 720,
    },
    {
        difficulty: "hard",
        title: "Hard",
        description: "Strict candidate tracking, naked/hidden pairs and pointing pairs.",
        gameCount: 50,
        unlockCost: 60,
        timeLimitSeconds: 900,
    },
    {
        difficulty: "expert",
        title: "Expert / Extreme",
        description: "X-Wings, Swordfish and coloring chains.",
        gameCount: 50,
        unlockCost: 90,
        timeLimitSeconds: 1080,
    },
    {
        difficulty: "evil",
        title: "Evil / Master",
        description: "Forcing chains, advanced fish patterns and minimal clues.",
        gameCount: 50,
        unlockCost: 130,
        timeLimitSeconds: 1200,
    },
];

export const SUDOKU_HINT_RULES = {
    freeHints: 1,
    rewardedAdHints: 99,
};
export function getSudokuPuzzleId(
    difficulty: SudokuDifficulty,
    gameNumber: number,
): string {
    return `sudoku-${difficulty}-${gameNumber}`;
}