const fs = require('fs');
const path = require('path');

const TOTAL_PUZZLES = 100;
const CHAINS_COUNT = 50;
const CROSSWORDS_COUNT = 50;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomOp(difficulty) {
    const ops = ['+', '-'];
    if (difficulty >= 2) ops.push('*');
    if (difficulty >= 3) ops.push('/');
    return ops[Math.floor(Math.random() * ops.length)];
}

function generateChain(level) {
    const grid = Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ type: 'empty' })));
    
    // Difficulty logic
    const difficulty = Math.ceil(level / 12.5); // 1 to 4
    const length = 5 + Math.floor(level / 5); // 5 to 15
    let currentVal = getRandomInt(1, 10 * difficulty);
    
    let r = 0;
    let c = 0;
    let dir = 'R'; // R, D, L
    
    grid[r][c] = { type: 'number', value: currentVal.toString(), isBlank: false, isGiven: true };
    
    const numberCells = [];
    
    for (let i = 0; i < length; i++) {
        let op = getRandomOp(difficulty);
        let num;
        let res;
        
        // Ensure nice numbers
        if (op === '/') {
            num = getRandomInt(1, 5 * difficulty);
            res = currentVal;
            currentVal = res * num; // Backwards to avoid fractions
            // Update the previous result cell to match the new currentVal
            grid[r][c].value = currentVal.toString();
        } else if (op === '*') {
            num = getRandomInt(1, 5 * difficulty);
            res = currentVal * num;
        } else if (op === '+') {
            num = getRandomInt(1, 15 * difficulty);
            res = currentVal + num;
        } else {
            num = getRandomInt(1, 15 * difficulty);
            res = currentVal - num;
            if (difficulty < 3 && res < 0) {
                // Swap so it's positive
                res = currentVal + num;
                op = '+';
            }
        }
        
        // Add 4 cells: op, num, =, res
        for (let step = 0; step < 4; step++) {
            let nextR = r, nextC = c;
            
            if (dir === 'R') nextC = c + 1;
            if (dir === 'L') nextC = c - 1;
            if (dir === 'D') nextR = r + 1;
            
            if (nextC > 8) { dir = 'D'; nextC = c; nextR = r + 1; }
            if (nextC < 0) { dir = 'D'; nextC = c; nextR = r + 1; }
            if (nextR > 8) { dir = 'R'; nextC = c + 1; nextR = r; } // Prevent out of bounds
            
            // Re-apply direction after possible bounce
            if (dir === 'R' && step > 0 && nextC <= c) nextC = c + 1;
            if (dir === 'L' && step > 0 && nextC >= c) nextC = c - 1;
            
            r = nextR;
            c = nextC;
            
            let type = 'empty';
            let val = '';
            if (step === 0) { type = 'operator'; val = op; }
            if (step === 1) { type = 'number'; val = num.toString(); }
            if (step === 2) { type = 'equals'; val = '='; }
            if (step === 3) { type = 'number'; val = res.toString(); }
            
            grid[r][c] = { type, value: val, isBlank: false };
            if (type === 'number') {
                numberCells.push({ r, c, val });
            }
        }
        currentVal = res;
        
        // After finishing an operation, if we were going down, we should turn L or R
        if (dir === 'D') {
            if (c >= 8) dir = 'L';
            else if (c <= 0) dir = 'R';
        }
    }
    
    // Blank some cells
    const blankCount = Math.min(6 + Math.floor(level / 10), numberCells.length - 2);
    for (let i = numberCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numberCells[i], numberCells[j]] = [numberCells[j], numberCells[i]];
    }
    
    const bank = [];
    for (let i = 0; i < blankCount; i++) {
        const cell = numberCells[i];
        grid[cell.r][cell.c].isBlank = true;
        bank.push(cell.val);
    }
    
    // Trim empty rows/cols to compact the grid
    let minR = 9, maxR = -1, minC = 9, maxC = -1;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col].type !== 'empty') {
                if (row < minR) minR = row;
                if (row > maxR) maxR = row;
                if (col < minC) minC = col;
                if (col > maxC) maxC = col;
            }
        }
    }
    
    const compactGrid = [];
    if (minR <= maxR && minC <= maxC) {
        for (let row = minR; row <= maxR; row++) {
            const newRow = [];
            for (let col = minC; col <= maxC; col++) {
                newRow.push(grid[row][col]);
            }
            compactGrid.push(newRow);
        }
    }
    
    for (let i = bank.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bank[i], bank[j]] = [bank[j], bank[i]];
    }

    return { grid: compactGrid, bank };
}

function generateCrossword(level) {
    const difficulty = Math.ceil((level - 50) / 12.5); // 1 to 4
    let valid = false;
    let gridData = [];
    let bank = [];
    
    while (!valid) {
        const n00 = getRandomInt(1, 10 * difficulty);
        const n02 = getRandomInt(1, 10 * difficulty);
        const n20 = getRandomInt(1, 10 * difficulty);
        const n22 = getRandomInt(1, 10 * difficulty);
        
        const op01 = getRandomOp(difficulty);
        const op21 = getRandomOp(difficulty);
        const op10 = getRandomOp(difficulty);
        const op12 = getRandomOp(difficulty);
        
        let n04, n24, n40, n42, n44;
        let op14, op41;
        
        try {
            n04 = eval(`${n00} ${op01} ${n02}`);
            n24 = eval(`${n20} ${op21} ${n22}`);
            n40 = eval(`${n00} ${op10} ${n20}`);
            n42 = eval(`${n02} ${op12} ${n22}`);
            
            if (!Number.isInteger(n04) || !Number.isInteger(n24) || !Number.isInteger(n40) || !Number.isInteger(n42)) {
                continue;
            }
            if (n04 < 0 || n24 < 0 || n40 < 0 || n42 < 0) continue; // Keep things reasonable
            
            op41 = getRandomOp(difficulty);
            op14 = getRandomOp(difficulty);
            
            n44 = eval(`${n40} ${op41} ${n42}`);
            const n44_check = eval(`${n04} ${op14} ${n24}`);
            
            if (n44 === n44_check && Number.isInteger(n44) && n44 >= 0) {
                valid = true;
                
                gridData = [
                    [{type: 'number', value: n00.toString()}, {type: 'operator', value: op01}, {type: 'number', value: n02.toString()}, {type: 'equals', value: '='}, {type: 'number', value: n04.toString()}],
                    [{type: 'operator', value: op10}, {type: 'empty'}, {type: 'operator', value: op12}, {type: 'empty'}, {type: 'operator', value: op14}],
                    [{type: 'number', value: n20.toString()}, {type: 'operator', value: op21}, {type: 'number', value: n22.toString()}, {type: 'equals', value: '='}, {type: 'number', value: n24.toString()}],
                    [{type: 'equals', value: '='}, {type: 'empty'}, {type: 'equals', value: '='}, {type: 'empty'}, {type: 'equals', value: '='}],
                    [{type: 'number', value: n40.toString()}, {type: 'operator', value: op41}, {type: 'number', value: n42.toString()}, {type: 'equals', value: '='}, {type: 'number', value: n44.toString()}],
                ];
                
                let numberCells = [];
                for(let r=0; r<5; r++) {
                    for(let c=0; c<5; c++) {
                        if (gridData[r][c].type === 'number') {
                            numberCells.push({r, c, val: gridData[r][c].value});
                        }
                    }
                }
                
                const blankCount = Math.min(6 + Math.floor((level - 50) / 10), numberCells.length - 1);
                for (let i = numberCells.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [numberCells[i], numberCells[j]] = [numberCells[j], numberCells[i]];
                }
                
                for (let i = 0; i < blankCount; i++) {
                    const cell = numberCells[i];
                    gridData[cell.r][cell.c].isBlank = true;
                    bank.push(cell.val);
                }
                
                for (let i = bank.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bank[i], bank[j]] = [bank[j], bank[i]];
                }
            }
        } catch(e) {
            continue;
        }
    }
    
    return { grid: gridData, bank };
}

const puzzles = [];

for (let i = 1; i <= TOTAL_PUZZLES; i++) {
    let puzzleData;
    if (i <= CHAINS_COUNT) {
        puzzleData = generateChain(i);
    } else {
        puzzleData = generateCrossword(i);
    }
    
    puzzles.push({
        id: i,
        level: i,
        grid: puzzleData.grid,
        bank: puzzleData.bank,
        timeLimitSeconds: i <= 50 ? 120 : 180
    });
}

const targetPath = path.join(__dirname, '..', 'src', 'game', 'mathspuzzles', 'catalogue.ts');
const newContent = `import { MathsPuzzle } from "./types";\n\nexport const MATHS_CATALOGUE: MathsPuzzle[] = ${JSON.stringify(puzzles, null, 2)};\n`;

fs.writeFileSync(targetPath, newContent, 'utf8');
console.log("Updated catalogue.ts with 100 new puzzles!");
