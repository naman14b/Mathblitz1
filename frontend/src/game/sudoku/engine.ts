import type { SudokuDifficulty, SudokuGrid, SudokuPuzzle } from "./types";

export function cloneGrid(grid: SudokuGrid): SudokuGrid {
    return grid.map((row) => [...row]);
}

function shuffled(values: number[]): number[] {
    const result = [...values];

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

export function isValidPlacement(
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

export function findEmptyCell(
    grid: SudokuGrid,
): [number, number] | null {
    for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 9; col += 1) {
            if (grid[row][col] === 0) {
                return [row, col];
            }
        }
    }

    return null;
}

export function getCandidates(
    grid: SudokuGrid,
    row: number,
    col: number,
): number[] {
    if (grid[row][col] !== 0) {
        return [];
    }

    const candidates: number[] = [];

    for (let value = 1; value <= 9; value += 1) {
        if (isValidPlacement(grid, row, col, value)) {
            candidates.push(value);
        }
    }

    return candidates;
}

export function solveSudoku(grid: SudokuGrid): boolean {
    const empty = findEmptyCell(grid);

    if (!empty) {
        return true;
    }

    const [row, col] = empty;
    const candidates = shuffled(getCandidates(grid, row, col));

    for (const value of candidates) {
        grid[row][col] = value;

        if (solveSudoku(grid)) {
            return true;
        }

        grid[row][col] = 0;
    }

    return false;
}

export function countSolutions(
    grid: SudokuGrid,
    limit = 2,
): number {
    const working = cloneGrid(grid);
    let solutions = 0;

    function search(): void {
        if (solutions >= limit) {
            return;
        }

        const empty = findEmptyCell(working);

        if (!empty) {
            solutions += 1;
            return;
        }

        const [row, col] = empty;

        /*
         * Use the cell with the fewest candidates.
         * This makes uniqueness checking considerably faster.
         */
        let bestRow = row;
        let bestCol = col;
        let bestCandidates = getCandidates(working, row, col);

        for (let r = 0; r < 9; r += 1) {
            for (let c = 0; c < 9; c += 1) {
                if (working[r][c] !== 0) {
                    continue;
                }

                const currentCandidates = getCandidates(
                    working,
                    r,
                    c,
                );

                if (currentCandidates.length < bestCandidates.length) {
                    bestCandidates = currentCandidates;
                    bestRow = r;
                    bestCol = c;
                }

                if (bestCandidates.length === 1) {
                    break;
                }
            }

            if (bestCandidates.length === 1) {
                break;
            }
        }

        for (const value of bestCandidates) {
            working[bestRow][bestCol] = value;

            search();

            working[bestRow][bestCol] = 0;

            if (solutions >= limit) {
                return;
            }
        }
    }

    search();

    return solutions;
}

export function hasUniqueSolution(
    grid: SudokuGrid,
): boolean {
    return countSolutions(grid, 2) === 1;
}

export function generateSolvedGrid(): SudokuGrid {
    const grid: SudokuGrid = Array.from(
        { length: 9 },
        () => Array(9).fill(0),
    );

    solveSudoku(grid);

    return grid;
}

function shuffledPositions(): Array<[number, number]> {
    const positions: Array<[number, number]> = [];

    for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 9; col += 1) {
            positions.push([row, col]);
        }
    }

    return shuffled(
        positions.map((position) => positions.indexOf(position)),
    ).map((index) => positions[index]);
}

function cluesForDifficulty(
    difficulty: SudokuDifficulty,
): number {
    switch (difficulty) {
        case "easy":
            return 40;

        case "medium":
            return 34;

        case "hard":
            return 30;

        case "expert":
            return 26;

        case "evil":
            return 22;

        default:
            return 40;
    }
}

export function generateSudoku(
    difficulty: SudokuDifficulty,
    number: number,
): SudokuPuzzle {
    const solution = generateSolvedGrid();
    const puzzle = cloneGrid(solution);

    const targetClues = cluesForDifficulty(difficulty);
    const positions = shuffledPositions();

    let clues = 81;

    for (const [row, col] of positions) {
        if (clues <= targetClues) {
            break;
        }

        const originalValue = puzzle[row][col];

        puzzle[row][col] = 0;

        /*
         * Only keep the removal if the puzzle still has
         * exactly one possible solution.
         */
        if (hasUniqueSolution(puzzle)) {
            clues -= 1;
        } else {
            puzzle[row][col] = originalValue;
        }
    }

    return {
        id: `sudoku-${difficulty}-${number}`,
        number,
        difficulty,
        puzzle,
        solution,
    };
}

export function generateSudokuSet(
    difficulty: SudokuDifficulty,
    count: number,
): SudokuPuzzle[] {
    const puzzles: SudokuPuzzle[] = [];

    for (let i = 1; i <= count; i += 1) {
        puzzles.push(generateSudoku(difficulty, i));
    }

    return puzzles;
}