import { generateSudokuSet } from "./engine";
import type { SudokuDifficulty, SudokuPuzzle } from "./types";

const DIFFICULTIES: SudokuDifficulty[] = [
    "easy",
    "medium",
    "hard",
    "expert",
    "evil",
];

const PUZZLES_PER_DIFFICULTY = 50;

export function generateFullSudokuCatalogue(): SudokuPuzzle[] {
    const catalogue: SudokuPuzzle[] = [];

    for (const difficulty of DIFFICULTIES) {
        const puzzles = generateSudokuSet(
            difficulty,
            PUZZLES_PER_DIFFICULTY,
        );

        catalogue.push(...puzzles);
    }

    return catalogue;
}