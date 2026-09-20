const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'game', 'mathspuzzles', 'catalogue.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const exportIndex = content.indexOf('export const MATHS_CATALOGUE');
const arrayStartIndex = content.indexOf('=', exportIndex) + 1;
const jsonStart = content.indexOf('[', arrayStartIndex);

const prefix = content.substring(0, jsonStart);
let jsonStr = content.substring(jsonStart);

// Remove trailing characters like semicolons or newlines
jsonStr = jsonStr.trim().replace(/;$/, '');

let puzzles;
try {
    puzzles = JSON.parse(jsonStr);
} catch (e) {
    console.error("Failed to parse JSON:", e.message);
    process.exit(1);
}

for (let puzzle of puzzles) {
    let numberCells = [];
    for (let r = 0; r < puzzle.grid.length; r++) {
        for (let c = 0; c < puzzle.grid[r].length; c++) {
            if (puzzle.grid[r][c].type === 'number') {
                puzzle.grid[r][c].isBlank = false; // reset
                numberCells.push(puzzle.grid[r][c]);
            }
        }
    }

    // Shuffle
    for (let i = numberCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numberCells[i], numberCells[j]] = [numberCells[j], numberCells[i]];
    }

    // Pick up to 10
    const toBlank = numberCells.slice(0, Math.min(10, numberCells.length));
    const newBank = [];
    for (let cell of toBlank) {
        cell.isBlank = true;
        newBank.push(cell.value);
    }
    
    // Shuffle bank
    for (let i = newBank.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBank[i], newBank[j]] = [newBank[j], newBank[i]];
    }

    puzzle.bank = newBank;
}

const newContent = prefix + JSON.stringify(puzzles, null, 2) + ';\n';
fs.writeFileSync(targetPath, newContent, 'utf8');
console.log("Updated catalogue.ts");
