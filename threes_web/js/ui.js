// Threes UI Rendering

class ThreesUI {
    constructor(game) {
        this.game = game;
        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.nextTileEl = document.getElementById('next-tile');
        this.nextTileValueEl = document.getElementById('next-tile-value');
        this.gameOverEl = document.getElementById('game-over');
        this.finalScoreEl = document.getElementById('final-score');
        this.highestTileEl = document.getElementById('highest-tile');
        this.newHighScoreEl = document.getElementById('new-high-score');
        this.isAnimating = false;
        this.tileElements = [];
    }

    init() {
        this.createBoard();
        this.render();
    }

    createBoard() {
        this.boardEl.innerHTML = '';
        this.tileElements = [];

        for (let i = 0; i < SIZE; i++) {
            const row = [];
            for (let j = 0; j < SIZE; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                const tile = document.createElement('div');
                tile.className = 'tile';
                cell.appendChild(tile);

                this.boardEl.appendChild(cell);
                row.push(tile);
            }
            this.tileElements.push(row);
        }
    }

    render() {
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                this.updateTile(i, j, this.game.grid[i][j]);
            }
        }
        this.updateScore();
        this.updateNextTile();
    }

    updateTile(row, col, value) {
        const tile = this.tileElements[row][col];
        tile.className = 'tile';

        if (value === 0) {
            tile.textContent = '';
            tile.classList.add('empty');
        } else {
            const displayValue = TILE_VALUES[value];
            tile.textContent = displayValue;
            tile.classList.add(`tile-${value <= 2 ? value : 'high'}`);

            // Add size class for large numbers
            if (displayValue >= 100000) {
                tile.classList.add('tile-6digit');
            } else if (displayValue >= 10000) {
                tile.classList.add('tile-5digit');
            } else if (displayValue >= 1000) {
                tile.classList.add('tile-4digit');
            }
        }
    }

    updateScore() {
        this.scoreEl.textContent = this.game.score;
    }

    updateHighScore(highScore) {
        this.highScoreEl.textContent = highScore;
    }

    updateNextTile() {
        const value = this.game.nextTile;
        const displayValue = TILE_VALUES[value];

        this.nextTileValueEl.textContent = displayValue;
        this.nextTileEl.className = 'next-tile-box';

        if (this.game.nextTileIsBonus) {
            this.nextTileEl.classList.add('tile-bonus');
        } else if (value === 1) {
            this.nextTileEl.classList.add('tile-1');
        } else if (value === 2) {
            this.nextTileEl.classList.add('tile-2');
        } else {
            this.nextTileEl.classList.add('tile-high');
        }
    }

    async animateMove(moveResult, skipAnimation = false) {
        if (!moveResult.moved) return;

        this.isAnimating = true;

        // If skipping animation, just render final state immediately
        if (skipAnimation) {
            this.render();
            this.isAnimating = false;
            return;
        }

        // 1. Render OLD grid state first (before the move)
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                this.updateTile(i, j, moveResult.oldGrid[i][j]);
            }
        }

        // 2. Apply transforms to animate tiles to new positions
        // Get actual cell spacing by measuring distance between adjacent cells
        const cells = this.boardEl.querySelectorAll('.cell');
        const cellSize = cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().left;
        const animatedTiles = [];

        for (const movement of moveResult.movements) {
            const tile = this.tileElements[movement.fromRow][movement.fromCol];
            const deltaX = (movement.toCol - movement.fromCol) * cellSize;
            const deltaY = (movement.toRow - movement.fromRow) * cellSize;

            tile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            tile.style.zIndex = '10';
            animatedTiles.push(tile);
        }

        // 3. Wait for slide animation
        await new Promise(resolve => setTimeout(resolve, 150));

        // 4. Hide animated tiles completely before state change
        for (const tile of animatedTiles) {
            tile.style.visibility = 'hidden';
        }

        // 5. Render final state - new tiles appear at correct positions
        this.render();

        // 6. Reset transforms on hidden tiles (no visual effect)
        for (const tile of animatedTiles) {
            tile.style.transition = 'none';
            tile.style.transform = '';
            tile.style.zIndex = '';
        }

        // 7. Force reflow then restore visibility and transitions
        this.boardEl.offsetHeight;
        for (const tile of animatedTiles) {
            tile.style.visibility = '';
            tile.style.transition = '';
        }

        // 8. Animate spawned tile sliding in from edge
        if (moveResult.spawnedTile) {
            const { row, col, direction } = moveResult.spawnedTile;
            const spawnedTile = this.tileElements[row][col];

            // Position off-screen based on swipe direction (tile comes from opposite edge)
            spawnedTile.style.transition = 'none';
            if (direction === UP) {
                spawnedTile.style.transform = 'translateY(100%)';
            } else if (direction === DOWN) {
                spawnedTile.style.transform = 'translateY(-100%)';
            } else if (direction === LEFT) {
                spawnedTile.style.transform = 'translateX(100%)';
            } else if (direction === RIGHT) {
                spawnedTile.style.transform = 'translateX(-100%)';
            }

            // Force reflow then animate to final position
            spawnedTile.offsetHeight;
            spawnedTile.style.transition = '';
            spawnedTile.style.transform = '';
        }

        // 9. Merge pulse animations
        for (const merge of moveResult.merges) {
            const tile = this.tileElements[merge.row][merge.col];
            tile.classList.add('merge-pulse');
            setTimeout(() => tile.classList.remove('merge-pulse'), 200);
        }

        this.isAnimating = false;
    }

    showGameOver(score, highestTile, isNewHighScore) {
        this.finalScoreEl.textContent = score;
        this.highestTileEl.textContent = TILE_VALUES[highestTile];
        this.newHighScoreEl.style.display = isNewHighScore ? 'block' : 'none';
        this.gameOverEl.classList.add('show');
    }

    hideGameOver() {
        this.gameOverEl.classList.remove('show');
    }

    showConfirmDialog(message) {
        return new Promise(resolve => {
            const dialog = document.getElementById('confirm-dialog');
            const messageEl = document.getElementById('confirm-message');
            const yesBtn = document.getElementById('confirm-yes');
            const noBtn = document.getElementById('confirm-no');

            messageEl.textContent = message;
            dialog.classList.add('show');

            const cleanup = () => {
                dialog.classList.remove('show');
                yesBtn.removeEventListener('click', onYes);
                noBtn.removeEventListener('click', onNo);
            };

            const onYes = () => {
                cleanup();
                resolve(true);
            };

            const onNo = () => {
                cleanup();
                resolve(false);
            };

            yesBtn.addEventListener('click', onYes);
            noBtn.addEventListener('click', onNo);
        });
    }
}

window.ThreesUI = ThreesUI;
