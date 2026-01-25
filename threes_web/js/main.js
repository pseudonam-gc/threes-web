// Threes Main Application

class ThreesApp {
    constructor() {
        this.game = new ThreesGame();
        this.storage = new ThreesStorage();
        this.audio = new ThreesAudio();
        this.ui = null;
        this.controls = null;
        this.pendingMove = null; // Buffered input during animation
    }

    init() {
        // Initialize audio
        this.audio.init();
        const settings = this.storage.getSettings();
        this.audio.setEnabled(settings.soundEnabled);
        this.updateSoundIcon(settings.soundEnabled);

        // Try to load saved game
        const savedState = this.storage.loadGameState();
        if (savedState) {
            this.game.setState(savedState);
        } else {
            this.game.init();
        }

        // Initialize UI
        this.ui = new ThreesUI(this.game);
        this.ui.init();

        // Update high score display
        const stats = this.storage.getStats();
        this.ui.updateHighScore(stats.highScore);

        // Initialize controls
        this.controls = new ThreesControls((direction) => this.handleMove(direction));
        this.controls.init();

        // Setup button listeners
        this.setupButtons();

        // Register service worker
        this.registerServiceWorker();

        // Save state periodically and on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.game.gameOver) {
                this.storage.saveGameState(this.game.getState());
            }
        });
    }

    async handleMove(direction, skipAnimation = false) {
        if (this.game.gameOver) return;

        // If animating, buffer this input for later
        if (this.ui.isAnimating) {
            this.pendingMove = direction;
            return;
        }

        const result = this.game.move(direction);

        if (result.moved) {
            this.audio.playMove();

            // Animate the move (or skip if requested)
            await this.ui.animateMove(result, skipAnimation);

            // Play merge sounds
            for (const merge of result.merges) {
                this.audio.playMerge(merge.value);
            }

            // Update score display
            this.ui.updateScore();
            this.ui.updateNextTile();

            // Save game state
            this.storage.saveGameState(this.game.getState());

            // Check for game over
            if (this.game.gameOver) {
                this.handleGameOver();
                return;
            }

            // Process any buffered input (skip animation for buffered moves)
            if (this.pendingMove !== null) {
                const nextMove = this.pendingMove;
                this.pendingMove = null;
                await this.handleMove(nextMove, true);
            }
        }
    }

    handleGameOver() {
        this.controls.disable();

        // Update stats
        const { stats, isNewHighScore } = this.storage.updateStats(
            this.game.score,
            this.game.maxTile
        );

        // Play appropriate sound
        if (isNewHighScore) {
            this.audio.playHighScore();
        } else {
            this.audio.playGameOver();
        }

        // Update high score display
        this.ui.updateHighScore(stats.highScore);

        // Show game over modal
        setTimeout(() => {
            this.ui.showGameOver(this.game.score, this.game.maxTile, isNewHighScore);
        }, 500);

        // Clear saved game state
        this.storage.clearGameState();
    }

    startNewGame() {
        this.game.init();
        this.ui.hideGameOver();
        this.ui.render();
        this.controls.enable();
        this.storage.saveGameState(this.game.getState());
    }

    async confirmNewGame() {
        if (this.game.gameOver) {
            this.startNewGame();
            return;
        }

        const confirmed = await this.ui.showConfirmDialog(
            'Start new game? Current progress will be lost.'
        );

        if (confirmed) {
            this.startNewGame();
        }
    }

    toggleSound() {
        const settings = this.storage.getSettings();
        settings.soundEnabled = !settings.soundEnabled;
        this.storage.saveSettings(settings);
        this.audio.setEnabled(settings.soundEnabled);
        this.updateSoundIcon(settings.soundEnabled);
    }

    updateSoundIcon(enabled) {
        const icon = document.getElementById('sound-icon');
        icon.textContent = enabled ? '🔊' : '🔇';
    }

    setupButtons() {
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.confirmNewGame();
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('sound-toggle').addEventListener('click', () => {
            this.toggleSound();
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered:', registration.scope);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ThreesApp();
    app.init();
});
