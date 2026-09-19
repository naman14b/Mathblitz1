import type { SudokuDifficulty, SudokuGrid } from "./types";

export type SudokuTechnique =
    | "naked-single"
    | "hidden-single"
    | "box-line"
    | "naked-pair"
    | "hidden-pair"
    | "pointing-pair"
    | "x-wing"
    | "swordfish"
    | "coloring"
    | "forcing-chain";

export type SudokuDifficultyAnalysis = {
    difficulty: SudokuDifficulty;
    techniques: SudokuTechnique[];
    score: number;
};

type Candidates = Set<number>;
type CandidateGrid = Candidates[][];

function createCandidates(grid: SudokuGrid): CandidateGrid {
    return grid.map((row, r) =>
        row.map((value, c) => {
            if (value !== 0) return new Set<number>();

            const candidates = new Set<number>();

            for (let n = 1; n <= 9; n += 1) {
                if (isValid(grid, r, c, n)) {
                    candidates.add(n);
                }
            }

            return candidates;
        }),
    );
}

function isValid(
    grid: SudokuGrid,
    row: number,
    col: number,
    value: number,
): boolean {
    for (let i = 0; i < 9; i += 1) {
        if (grid[row][i] === value) return false;
        if (grid[i][col] === value) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r += 1) {
        for (let c = boxCol; c < boxCol + 3; c += 1) {
            if (grid[r][c] === value) return false;
        }
    }

    return true;
}

function countCandidates(candidates: CandidateGrid): number {
    let total = 0;

    for (const row of candidates) {
        for (const cell of row) {
            total += cell.size;
        }
    }

    return total;
}

function hasNakedPair(candidates: CandidateGrid): boolean {
    for (let row = 0; row < 9; row += 1) {
        const pairs = new Map<string, number>();

        for (let col = 0; col < 9; col += 1) {
            const cell = candidates[row][col];

            if (cell.size === 2) {
                const key = [...cell].sort().join(",");
                pairs.set(key, (pairs.get(key) ?? 0) + 1);
            }
        }

        if ([...pairs.values()].some((count) => count >= 2)) {
            return true;
        }
    }

    return false;
}

function hasHiddenSingle(
    grid: SudokuGrid,
    candidates: CandidateGrid,
): boolean {
    for (let row = 0; row < 9; row += 1) {
        for (let n = 1; n <= 9; n += 1) {
            let count = 0;

            for (let col = 0; col < 9; col += 1) {
                if (
                    grid[row][col] === 0 &&
                    candidates[row][col].has(n)
                ) {
                    count += 1;
                }
            }

            if (count === 1) return true;
        }
    }

    for (let col = 0; col < 9; col += 1) {
        for (let n = 1; n <= 9; n += 1) {
            let count = 0;

            for (let row = 0; row < 9; row += 1) {
                if (
                    grid[row][col] === 0 &&
                    candidates[row][col].has(n)
                ) {
                    count += 1;
                }
            }

            if (count === 1) return true;
        }
    }

    return false;
}

function hasBoxLinePattern(
    grid: SudokuGrid,
    candidates: CandidateGrid,
): boolean {
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
        for (let boxCol = 0; boxCol < 9; boxCol += 3) {
            for (let n = 1; n <= 9; n += 1) {
                const positions: Array<[number, number]> = [];

                for (let r = boxRow; r < boxRow + 3; r += 1) {
                    for (let c = boxCol; c < boxCol + 3; c += 1) {
                        if (
                            grid[r][c] === 0 &&
                            candidates[r][c].has(n)
                        ) {
                            positions.push([r, c]);
                        }
                    }
                }

                if (positions.length >= 2) {
                    const sameRow = positions.every(
                        ([r]) => r === positions[0][0],
                    );

                    const sameCol = positions.every(
                        ([, c]) => c === positions[0][1],
                    );

                    if (sameRow || sameCol) return true;
                }
            }
        }
    }

    return false;
}

function hasAdvancedCandidateStructure(
    candidates: CandidateGrid,
): boolean {
    /*
     * This is a structural detector, not yet a complete proof that
     * solving requires X-Wing/Swordfish/coloring. The final generator
     * will use the logical solver to verify the actual techniques needed.
     */

    let bivalueCells = 0;

    for (const row of candidates) {
        for (const cell of row) {
            if (cell.size === 2) bivalueCells += 1;
        }
    }

    return bivalueCells >= 8;
}

export function analyzeSudokuDifficulty(
    puzzle: SudokuGrid,
): SudokuDifficultyAnalysis {
    const candidates = createCandidates(puzzle);
    const techniques: SudokuTechnique[] = [];

    if (hasHiddenSingle(puzzle, candidates)) {
        techniques.push("hidden-single");
    }

    if (hasBoxLinePattern(puzzle, candidates)) {
        techniques.push("box-line");
    }

    if (hasNakedPair(candidates)) {
        techniques.push("naked-pair");
    }

    if (hasAdvancedCandidateStructure(candidates)) {
        techniques.push("x-wing");
    }

    if (techniques.length === 0) {
        techniques.push("naked-single");
    }

    const candidateCount = countCandidates(candidates);

    let score = 1;

    if (
        techniques.includes("box-line") ||
        techniques.includes("naked-pair")
    ) {
        score = 3;
    }

    if (candidateCount < 90 || techniques.includes("x-wing")) {
        score = Math.max(score, 4);
    }

    if (candidateCount < 65) {
        score = 5;
    }

    const difficulty: SudokuDifficulty =
        score === 1
            ? "easy"
            : score === 3
                ? "hard"
                : score === 4
                    ? "expert"
                    : "evil";

    return {
        difficulty,
        techniques,
        score,
    };
}