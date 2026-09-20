export type CellType = 'empty' | 'number' | 'operator' | 'equals';
export type Operator = '+' | '-' | '*' | '/';

export type MathsCell = {
    type: CellType;
    value?: string;
    isBlank?: boolean;
};

export type MathsGrid = MathsCell[][];

export type MathsPuzzle = {
    id: number;
    level: number;
    grid: MathsGrid;
    bank: string[];
    timeLimitSeconds: number;
};
