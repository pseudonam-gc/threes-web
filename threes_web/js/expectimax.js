// Expectimax Search with Neural Network Leaf Evaluation
// Uses the trained model's value function to evaluate leaf nodes

class ExpectimaxSearch {
    constructor(ai) {
        this.ai = ai;
        this.nodesEvaluated = 0;
    }

    /**
     * Run expectimax search to find the best move
     * @param {ThreesGame} game - Current game state
     * @param {number} depth - Search depth (1-3 recommended)
     * @returns {Object} - { action, value, nodesEvaluated }
     */
    async search(game, depth = 2) {
        this.nodesEvaluated = 0;

        const actions = [0, 1, 2, 3]; // UP, DOWN, LEFT, RIGHT
        const actionNames = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        let bestAction = 0;
        let bestValue = -Infinity;
        const actionValues = [];

        for (const action of actions) {
            // Clone game state
            const simGame = this.cloneGame(game);

            // Try the move
            const moveResult = this.simulateMove(simGame, action);

            if (!moveResult.moved) {
                actionValues.push({ action, value: -Infinity, valid: false });
                continue;
            }

            // Evaluate with expectimax
            const value = await this.chanceNode(simGame, moveResult, depth - 1);
            actionValues.push({ action, value, valid: true });

            if (value > bestValue) {
                bestValue = value;
                bestAction = action;
            }
        }

        console.log('Expectimax results:', actionValues.map(a =>
            `${actionNames[a.action]}: ${a.valid ? a.value.toFixed(2) : 'invalid'}`
        ).join(', '));

        return {
            action: bestAction,
            value: bestValue,
            nodesEvaluated: this.nodesEvaluated,
            actionValues
        };
    }

    /**
     * Chance node: Average over possible tile spawn positions
     */
    async chanceNode(game, moveResult, depth) {
        const spawnPositions = moveResult.validSpawnPositions;

        if (spawnPositions.length === 0) {
            // No valid spawn positions - evaluate current state
            return await this.evaluateLeaf(game);
        }

        // The next tile is already determined (game.nextTile from before the move)
        // We need to average over spawn positions
        let totalValue = 0;
        const probability = 1.0 / spawnPositions.length;

        for (const [row, col] of spawnPositions) {
            // Clone and place tile at this position
            const simGame = this.cloneGame(game);
            simGame.grid[row][col] = moveResult.nextTile;

            // Draw next tile for the cloned game (simplified - just use current bag state)
            simGame.nextTile = this.drawFromBagSimulated(simGame);

            let value;
            if (depth <= 0) {
                value = await this.evaluateLeaf(simGame);
            } else {
                value = await this.maxNode(simGame, depth);
            }

            totalValue += probability * value;
        }

        return totalValue;
    }

    /**
     * Max node: Player chooses best action
     */
    async maxNode(game, depth) {
        if (this.isGameOver(game)) {
            return await this.evaluateLeaf(game);
        }

        let bestValue = -Infinity;
        const actions = [0, 1, 2, 3];

        for (const action of actions) {
            const simGame = this.cloneGame(game);
            const moveResult = this.simulateMove(simGame, action);

            if (!moveResult.moved) continue;

            const value = await this.chanceNode(simGame, moveResult, depth - 1);
            bestValue = Math.max(bestValue, value);
        }

        return bestValue === -Infinity ? await this.evaluateLeaf(game) : bestValue;
    }

    /**
     * Evaluate leaf node using neural network value function
     */
    async evaluateLeaf(game) {
        this.nodesEvaluated++;

        // Use the AI's predict method to get the value
        // We need to temporarily not update LSTM state for leaf evaluations
        const result = await this.ai.predictWithoutStateUpdate(game);
        return result.value;
    }

    /**
     * Clone game state for simulation
     */
    cloneGame(game) {
        return {
            grid: game.grid.map(row => [...row]),
            score: game.score,
            bag: [...game.bag],
            nextTile: game.nextTile,
            nextTileIsBonus: game.nextTileIsBonus || false,
            movesMade: game.movesMade,
            bonusPosition: game.bonusPosition,
            maxTile: game.maxTile,
            gameOver: game.gameOver
        };
    }

    /**
     * Simulate a move without affecting the real game
     * Returns move result with validSpawnPositions
     */
    simulateMove(game, direction) {
        const SIZE = 4;
        const EMPTY = 0;
        const UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3;

        const oldGrid = game.grid.map(row => [...row]);
        let moved = false;
        const validSpawnPositions = [];
        const nextTile = game.nextTile;

        if (direction === UP || direction === DOWN) {
            for (let col = 0; col < SIZE; col++) {
                const result = this.slideColumn(game, col, direction);
                if (result.moved) {
                    moved = true;
                    const spawnRow = direction === UP ? SIZE - 1 : 0;
                    if (game.grid[spawnRow][col] === EMPTY) {
                        validSpawnPositions.push([spawnRow, col]);
                    }
                }
            }
        } else {
            for (let row = 0; row < SIZE; row++) {
                const result = this.slideRow(game, row, direction);
                if (result.moved) {
                    moved = true;
                    const spawnCol = direction === LEFT ? SIZE - 1 : 0;
                    if (game.grid[row][spawnCol] === EMPTY) {
                        validSpawnPositions.push([row, spawnCol]);
                    }
                }
            }
        }

        return { moved, validSpawnPositions, nextTile, oldGrid };
    }

    /**
     * Slide a column up or down
     */
    slideColumn(game, col, direction) {
        const SIZE = 4;
        const UP = 0;
        const temp = [];

        if (direction === UP) {
            for (let row = 0; row < SIZE; row++) temp.push(game.grid[row][col]);
        } else {
            for (let row = SIZE - 1; row >= 0; row--) temp.push(game.grid[row][col]);
        }

        const result = this.slideArray(temp);

        if (direction === UP) {
            for (let row = 0; row < SIZE; row++) game.grid[row][col] = result.arr[row];
        } else {
            for (let row = 0; row < SIZE; row++) game.grid[row][col] = result.arr[SIZE - 1 - row];
        }

        return { moved: result.moved };
    }

    /**
     * Slide a row left or right
     */
    slideRow(game, row, direction) {
        const SIZE = 4;
        const LEFT = 2;
        const temp = [];

        if (direction === LEFT) {
            for (let col = 0; col < SIZE; col++) temp.push(game.grid[row][col]);
        } else {
            for (let col = SIZE - 1; col >= 0; col--) temp.push(game.grid[row][col]);
        }

        const result = this.slideArray(temp);

        if (direction === LEFT) {
            for (let col = 0; col < SIZE; col++) game.grid[row][col] = result.arr[col];
        } else {
            for (let col = 0; col < SIZE; col++) game.grid[row][col] = result.arr[SIZE - 1 - col];
        }

        return { moved: result.moved };
    }

    /**
     * Slide and merge an array (core Threes logic)
     */
    slideArray(arr) {
        const EMPTY = 0;
        const result = [...arr];
        let moved = false;

        for (let i = 0; i < result.length - 1; i++) {
            if (result[i] === EMPTY && result[i + 1] !== EMPTY) {
                // Slide into empty space
                result[i] = result[i + 1];
                result[i + 1] = EMPTY;
                moved = true;
            } else if (result[i] !== EMPTY && result[i + 1] !== EMPTY) {
                // Try to merge
                if (this.canCombine(result[i], result[i + 1])) {
                    result[i] = this.combine(result[i], result[i + 1]);
                    result[i + 1] = EMPTY;
                    moved = true;
                }
            }
        }

        return { arr: result, moved };
    }

    canCombine(a, b) {
        if (a === 0 || b === 0) return false;
        if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
        if (a === b && a >= 3) return true;
        return false;
    }

    combine(a, b) {
        if (a === 1 && b === 2) return 3;
        if (a === 2 && b === 1) return 3;
        if (a === b && a >= 3) return a + 1;
        return 0;
    }

    /**
     * Simplified bag draw for simulation
     */
    drawFromBagSimulated(game) {
        const bag = game.bag;
        const total = bag[0] + bag[1] + bag[2];

        if (total === 0) {
            // Refill bag
            game.bag = [4, 4, 4];
            return Math.floor(Math.random() * 3) + 1;
        }

        // Weighted random selection
        const r = Math.random() * total;
        if (r < bag[0]) {
            game.bag[0]--;
            return 1;
        } else if (r < bag[0] + bag[1]) {
            game.bag[1]--;
            return 2;
        } else {
            game.bag[2]--;
            return 3;
        }
    }

    /**
     * Check if game is over
     */
    isGameOver(game) {
        const SIZE = 4;
        const EMPTY = 0;

        // Check for empty cells
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (game.grid[i][j] === EMPTY) return false;
            }
        }

        // Check for possible merges
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const current = game.grid[i][j];
                if (i < SIZE - 1 && this.canCombine(current, game.grid[i + 1][j])) return false;
                if (j < SIZE - 1 && this.canCombine(current, game.grid[i][j + 1])) return false;
            }
        }

        return true;
    }
}

// Export for browser
window.ExpectimaxSearch = ExpectimaxSearch;
