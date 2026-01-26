// Threes Game Core Logic

const TILE_VALUES = [0, 1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288, 24576, 49152, 98304, 196608];
const TILE_SCORES = [0, 0, 0, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049, 177147, 531441, 1594323, 4782969, 14348907, 43046721, 129140163];

const SIZE = 4;
const EMPTY = 0;
const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;

class ThreesGame {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.bag = [4, 4, 4]; // 4 ones, 4 twos, 4 threes
        this.nextTile = 0;
        this.nextTileIsBonus = false;
        this.movesMade = 0;
        this.bonusPosition = 0;
        this.maxTile = 0;
        this.gameOver = false;
        this.lastMove = null;
        this.validSpawnPositions = [];
    }

    init() {
        // Initialize empty grid
        this.grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(EMPTY));
        this.score = 0;
        this.bag = [4, 4, 4];
        this.movesMade = 0;
        this.bonusPosition = Math.floor(Math.random() * 21);
        this.maxTile = 0;
        this.gameOver = false;
        this.lastMove = null;
        this.validSpawnPositions = [];

        // Place 9 initial tiles
        for (let i = 0; i < 9; i++) {
            const tile = this.drawFromBag();
            this.placeRandomTile(tile);
            this.score += TILE_SCORES[tile];
        }

        // Draw first next tile
        this.nextTile = this.drawFromBag();

        this.updateMaxTile();
    }

    drawFromBag() {
        // Check if bonus tile should be drawn
        const movesMod = this.movesMade % 21;
        const bonusCheck = movesMod === this.bonusPosition;
        const maxTileCheck = this.maxTile >= 7;

        if (bonusCheck && maxTileCheck) {
            this.nextTileIsBonus = true;
            return this.drawBonusTile();
        }

        this.nextTileIsBonus = false;

        // Draw from regular bag
        const bagSize = this.bag[0] + this.bag[1] + this.bag[2];
        const r = Math.floor(Math.random() * bagSize);

        let tile;
        if (r < this.bag[0]) {
            tile = 1;
            this.bag[0]--;
        } else if (r < this.bag[0] + this.bag[1]) {
            tile = 2;
            this.bag[1]--;
        } else {
            tile = 3;
            this.bag[2]--;
        }

        // Refill bag if empty
        if (this.bag[0] + this.bag[1] + this.bag[2] === 0) {
            this.bag = [4, 4, 4];
        }

        return tile;
    }

    drawBonusTile() {
        // Max bonus is maxTile / 8, which in index terms is maxTile - 3
        // Min bonus is always index 4 (value 6)
        const maxBonusIdx = this.maxTile - 3;
        const minBonusIdx = 4;
        const numBonuses = maxBonusIdx - minBonusIdx + 1;

        if (numBonuses <= 1) {
            return minBonusIdx;
        } else if (numBonuses === 2) {
            return minBonusIdx + Math.floor(Math.random() * 2);
        } else if (numBonuses === 3) {
            return minBonusIdx + Math.floor(Math.random() * 3);
        } else {
            // Triplet system
            const numTriplets = numBonuses - 2;
            const triplet = Math.floor(Math.random() * numTriplets);
            const posInTriplet = Math.floor(Math.random() * 3);
            return minBonusIdx + triplet + posInTriplet;
        }
    }

    placeRandomTile(tile) {
        const emptyPositions = [];
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (this.grid[i][j] === EMPTY) {
                    emptyPositions.push([i, j]);
                }
            }
        }

        if (emptyPositions.length > 0) {
            const [row, col] = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            this.grid[row][col] = tile;
        }
    }

    placeTileOnEdge(tile, direction) {
        // Place tile on opposite edge, only on rows/columns that moved
        if (this.validSpawnPositions.length === 0) return null;

        const idx = Math.floor(Math.random() * this.validSpawnPositions.length);
        const [row, col] = this.validSpawnPositions[idx];
        this.grid[row][col] = tile;
        return { row, col, tile };
    }

    canCombine(a, b) {
        if (a === EMPTY || b === EMPTY) return false;
        // 1 + 2 = 3
        if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
        // Same value tiles >= 3
        if (a === b && a >= 3) return true;
        return false;
    }

    combine(a, b) {
        if (a === 1 && b === 2) return 3;
        if (a === 2 && b === 1) return 3;
        if (a === b && a >= 3) return a + 1; // Index increases by 1
        return 0;
    }

    move(direction) {
        if (this.gameOver) return { moved: false };

        const oldGrid = this.grid.map(row => [...row]);
        let moved = false;
        let scoreAdd = 0;
        const merges = [];
        const movements = [];
        this.validSpawnPositions = [];

        if (direction === UP || direction === DOWN) {
            for (let col = 0; col < SIZE; col++) {
                const result = this.slideColumn(col, direction);
                if (result.moved) {
                    moved = true;
                    scoreAdd += result.scoreAdd;
                    merges.push(...result.merges);
                    movements.push(...result.movements);

                    // Add spawn position
                    const spawnRow = direction === UP ? SIZE - 1 : 0;
                    if (this.grid[spawnRow][col] === EMPTY) {
                        this.validSpawnPositions.push([spawnRow, col]);
                    }
                }
            }
        } else {
            for (let row = 0; row < SIZE; row++) {
                const result = this.slideRow(row, direction);
                if (result.moved) {
                    moved = true;
                    scoreAdd += result.scoreAdd;
                    merges.push(...result.merges);
                    movements.push(...result.movements);

                    // Add spawn position
                    const spawnCol = direction === LEFT ? SIZE - 1 : 0;
                    if (this.grid[row][spawnCol] === EMPTY) {
                        this.validSpawnPositions.push([row, spawnCol]);
                    }
                }
            }
        }

        let spawnedTile = null;
        if (moved) {
            this.lastMove = direction;

            // Reset bonus position every 21 moves
            if (this.movesMade % 21 === 0) {
                //this.bonusPosition = Math.floor(Math.random() * 21);
                this.bonusPosition = 100; // Disable bonus tiles for now
            }
            this.movesMade++;

            // Spawn new tile
            spawnedTile = this.placeTileOnEdge(this.nextTile, direction);
            if (spawnedTile) {
                spawnedTile.direction = direction;
                scoreAdd += TILE_SCORES[this.nextTile];
            }

            // Draw next tile
            this.nextTile = this.drawFromBag();

            this.score += scoreAdd;
            this.updateMaxTile();
            this.checkGameOver();
        }

        return {
            moved,
            scoreAdd,
            merges,
            movements,
            spawnedTile,
            oldGrid
        };
    }

    slideRow(row, direction) {
        const temp = [];
        const isLeft = direction === LEFT;

        for (let i = 0; i < SIZE; i++) {
            const idx = isLeft ? i : SIZE - 1 - i;
            temp.push(this.grid[row][idx]);
        }

        const result = this.slideAndMerge(temp);

        if (result.moved) {
            for (let i = 0; i < SIZE; i++) {
                const idx = isLeft ? i : SIZE - 1 - i;
                this.grid[row][idx] = temp[i];
            }

            // Convert merge positions back to grid coordinates
            result.merges = result.merges.map(m => ({
                row,
                col: isLeft ? m.pos : SIZE - 1 - m.pos,
                value: m.value
            }));

            result.movements = result.movements.map(m => ({
                fromRow: row,
                fromCol: isLeft ? m.from : SIZE - 1 - m.from,
                toRow: row,
                toCol: isLeft ? m.to : SIZE - 1 - m.to
            }));
        }

        return result;
    }

    slideColumn(col, direction) {
        const temp = [];
        const isUp = direction === UP;

        for (let i = 0; i < SIZE; i++) {
            const idx = isUp ? i : SIZE - 1 - i;
            temp.push(this.grid[idx][col]);
        }

        const result = this.slideAndMerge(temp);

        if (result.moved) {
            for (let i = 0; i < SIZE; i++) {
                const idx = isUp ? i : SIZE - 1 - i;
                this.grid[idx][col] = temp[i];
            }

            // Convert merge positions back to grid coordinates
            result.merges = result.merges.map(m => ({
                row: isUp ? m.pos : SIZE - 1 - m.pos,
                col,
                value: m.value
            }));

            result.movements = result.movements.map(m => ({
                fromRow: isUp ? m.from : SIZE - 1 - m.from,
                fromCol: col,
                toRow: isUp ? m.to : SIZE - 1 - m.to,
                toCol: col
            }));
        }

        return result;
    }

    slideAndMerge(arr) {
        let moved = false;
        let scoreAdd = 0;
        const merges = [];
        const movements = [];

        for (let i = 1; i < SIZE; i++) {
            if (arr[i] !== EMPTY) {
                // Check for merge
                if (this.canCombine(arr[i], arr[i - 1])) {
                    const newValue = this.combine(arr[i], arr[i - 1]);
                    scoreAdd += TILE_SCORES[newValue];
                    arr[i - 1] = newValue;
                    arr[i] = EMPTY;
                    moved = true;
                    merges.push({ pos: i - 1, value: newValue });
                    movements.push({ from: i, to: i - 1 });
                    if (newValue > this.maxTile) this.maxTile = newValue;
                }
                // Check for slide
                else if (arr[i - 1] === EMPTY) {
                    arr[i - 1] = arr[i];
                    arr[i] = EMPTY;
                    moved = true;
                    movements.push({ from: i, to: i - 1 });
                }
            }
        }

        return { moved, scoreAdd, merges, movements };
    }

    updateMaxTile() {
        this.maxTile = 0;
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (this.grid[i][j] > this.maxTile) {
                    this.maxTile = this.grid[i][j];
                }
            }
        }
    }

    checkGameOver() {
        // Check for empty cells
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (this.grid[i][j] === EMPTY) {
                    this.gameOver = false;
                    return;
                }
            }
        }

        // Check for possible merges
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const current = this.grid[i][j];
                // Check below
                if (i < SIZE - 1) {
                    if (this.canCombine(current, this.grid[i + 1][j])) {
                        this.gameOver = false;
                        return;
                    }
                }
                // Check right
                if (j < SIZE - 1) {
                    if (this.canCombine(current, this.grid[i][j + 1])) {
                        this.gameOver = false;
                        return;
                    }
                }
            }
        }

        this.gameOver = true;
    }

    getState() {
        return {
            grid: this.grid.map(row => [...row]),
            score: this.score,
            bag: [...this.bag],
            nextTile: this.nextTile,
            nextTileIsBonus: this.nextTileIsBonus,
            movesMade: this.movesMade,
            bonusPosition: this.bonusPosition,
            maxTile: this.maxTile,
            gameOver: this.gameOver
        };
    }

    setState(state) {
        this.grid = state.grid.map(row => [...row]);
        this.score = state.score;
        this.bag = [...state.bag];
        this.nextTile = state.nextTile;
        this.nextTileIsBonus = state.nextTileIsBonus || false;
        this.movesMade = state.movesMade;
        this.bonusPosition = state.bonusPosition;
        this.maxTile = state.maxTile;
        this.gameOver = state.gameOver;
    }

    getTileValue(index) {
        return TILE_VALUES[index] || 0;
    }

    getTileScore(index) {
        return TILE_SCORES[index] || 0;
    }
}

// Export for use in other modules
window.ThreesGame = ThreesGame;
window.TILE_VALUES = TILE_VALUES;
window.TILE_SCORES = TILE_SCORES;
window.SIZE = SIZE;
window.UP = UP;
window.DOWN = DOWN;
window.LEFT = LEFT;
window.RIGHT = RIGHT;
