// Threes Main Application

class ThreesApp {
    constructor() {
        this.game = new ThreesGame();
        this.storage = new ThreesStorage();
        this.audio = new ThreesAudio();
        this.ui = null;
        this.controls = null;
        this.pendingMove = null; // Buffered input during animation
        this.ai = null; // AI model
        this.expectimax = null; // Expectimax search
        this.autoAIRunning = false; // Auto-AI mode flag
        // Speed tracking
        this.moveTimestamps = [];
        this.lastSpeedUpdate = 0;
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

        // Initialize AI model in background
        this.initAI();
    }

    async initAI() {
        try {
            this.ai = new ThreesAI();
            const loaded = await this.ai.load('model/onnx_model.onnx');
            if (loaded) {
                document.getElementById('ai-btn').disabled = false;
                document.getElementById('auto-ai-btn').disabled = false;
                // Initialize expectimax search
                this.expectimax = new ExpectimaxSearch(this.ai);
                console.log('AI model loaded successfully');
            } else {
                console.warn('Failed to load AI model');
            }
        } catch (error) {
            console.error('Error initializing AI:', error);
        }
    }

    isExpectimaxEnabled() {
        return document.getElementById('expectimax-toggle').checked;
    }

    getExpectimaxDepth() {
        return parseInt(document.getElementById('expectimax-depth').value, 10);
    }

    // Logarithmic speed ticks: slider position -> moves per second
    speedTicks = [1, 2, 3, 4, 5, 10, 20, 40, 100, 200, 400];

    getAISpeed() {
        const sliderPos = parseInt(document.getElementById('ai-speed').value, 10);
        return this.speedTicks[sliderPos] || 10;
    }

    getAnimationDuration() {
        const speed = this.getAISpeed();
        // At speed 1: full 150ms animation
        // At speed 10: 100ms animation
        // At speed 20+: skip animation entirely
        if (speed >= 20) return 0;
        if (speed >= 10) return 100 - (speed - 10) * 10;
        return 150 - (speed - 1) * 5;
    }

    async getAIHint() {
        if (!this.ai || !this.ai.isLoaded || this.game.gameOver) return;

        try {
            const actions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
            const actionEl = document.getElementById('ai-action');
            const hintEl = document.getElementById('ai-hint');

            let result;
            if (this.isExpectimaxEnabled() && this.expectimax) {
                // Use expectimax search
                const depth = this.getExpectimaxDepth();
                actionEl.textContent = 'Thinking...';
                hintEl.style.display = 'flex';

                result = await this.expectimax.search(this.game, depth);
                actionEl.innerHTML = `${actions[result.action]} (v=${result.value.toFixed(1)})<br>n=${result.nodesEvaluated}`;
                console.log('Expectimax:', actions[result.action], 'value:', result.value.toFixed(2), 'nodes:', result.nodesEvaluated);
            } else {
                // Use direct neural network prediction (stateless - doesn't advance LSTM)
                result = await this.ai.predictWithoutStateUpdate(this.game);
                actionEl.textContent = `${actions[result.action]} (${(result.probs[result.action] * 100).toFixed(1)}%)`;
                console.log('AI prediction:', actions[result.action], 'probs:', result.probs.map(p => p.toFixed(3)));
            }

            hintEl.style.display = 'flex';
            return result;
        } catch (error) {
            console.error('AI prediction error:', error);
        }
    }

    toggleAutoAI() {
        this.autoAIRunning = !this.autoAIRunning;
        const btn = document.getElementById('auto-ai-btn');
        const speedContainer = document.getElementById('speed-container');

        if (this.autoAIRunning) {
            btn.textContent = 'Stop AI';
            btn.classList.add('btn-active');
            speedContainer.style.display = 'flex';
            // Reset speed tracking
            this.moveTimestamps = [];
            this.lastSpeedUpdate = 0;
            document.getElementById('speed-actual').textContent = '-';
            this.runAutoAI();
        } else {
            btn.textContent = 'Auto AI';
            btn.classList.remove('btn-active');
            speedContainer.style.display = 'none';
        }
    }

    async runAutoAI() {
        if (!this.autoAIRunning || !this.ai || !this.ai.isLoaded) return;
        if (this.game.gameOver) {
            this.autoAIRunning = false;
            document.getElementById('auto-ai-btn').textContent = 'Auto AI';
            document.getElementById('auto-ai-btn').classList.remove('btn-active');
            document.getElementById('speed-container').style.display = 'none';
            return;
        }

        try {
            const actions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
            const actionEl = document.getElementById('ai-action');
            const hintEl = document.getElementById('ai-hint');

            let result;
            if (this.isExpectimaxEnabled() && this.expectimax) {
                // Use expectimax search
                const depth = this.getExpectimaxDepth();
                result = await this.expectimax.search(this.game, depth);
                actionEl.innerHTML = `${actions[result.action]} (v=${result.value.toFixed(1)})<br>n=${result.nodesEvaluated}`;
            } else {
                // Use direct neural network prediction
                result = await this.ai.predict(this.game);
                actionEl.textContent = `${actions[result.action]} (${(result.probs[result.action] * 100).toFixed(1)}%)`;
            }

            hintEl.style.display = 'flex';

            // Get speed and animation settings
            const speed = this.getAISpeed();
            const animDuration = this.getAnimationDuration();

            // Make the move with appropriate animation duration
            await this.handleMove(result.action, animDuration);

            // Track actual speed
            const now = performance.now();
            this.moveTimestamps.push(now);
            // Keep only last 1 second of timestamps
            const cutoff = now - 1000;
            this.moveTimestamps = this.moveTimestamps.filter(t => t > cutoff);
            // Update display every 200ms
            if (now - this.lastSpeedUpdate > 200) {
                const actualSpeed = this.moveTimestamps.length;
                document.getElementById('speed-actual').textContent = actualSpeed;
                this.lastSpeedUpdate = now;
            }

            // Schedule next move based on speed (moves per second)
            if (this.autoAIRunning && !this.game.gameOver) {
                const delay = Math.max(0, Math.floor(1000 / speed) - animDuration);
                setTimeout(() => this.runAutoAI(), delay);
            }
        } catch (error) {
            console.error('Auto AI error:', error);
            this.autoAIRunning = false;
            document.getElementById('auto-ai-btn').textContent = 'Auto AI';
            document.getElementById('speed-container').style.display = 'none';
        }
    }

    async handleMove(direction, animationDuration = 150) {
        if (this.game.gameOver) return;

        // Handle legacy boolean parameter (true = skip, false = default)
        if (animationDuration === true) animationDuration = 0;
        if (animationDuration === false) animationDuration = 150;

        // If animating, buffer this input for later
        if (this.ui.isAnimating) {
            this.pendingMove = direction;
            return;
        }

        const result = this.game.move(direction);

        if (result.moved) {
            this.audio.playMove();

            // Animate the move with specified duration (0 = skip)
            await this.ui.animateMove(result, animationDuration);

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
                await this.handleMove(nextMove, 0);
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
        // Reset AI LSTM state for new game
        if (this.ai && this.ai.isLoaded) {
            this.ai.resetState();
        }
        // Stop auto-AI and hide hint/speed controls
        this.autoAIRunning = false;
        document.getElementById('auto-ai-btn').textContent = 'Auto AI';
        document.getElementById('auto-ai-btn').classList.remove('btn-active');
        document.getElementById('ai-hint').style.display = 'none';
        document.getElementById('speed-container').style.display = 'none';
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

        document.getElementById('ai-btn').addEventListener('click', () => {
            this.getAIHint();
        });

        document.getElementById('auto-ai-btn').addEventListener('click', () => {
            this.toggleAutoAI();
        });

        // Expectimax toggle - show/hide depth selector
        document.getElementById('expectimax-toggle').addEventListener('change', (e) => {
            document.getElementById('depth-container').style.display = e.target.checked ? 'flex' : 'none';
        });

        // Speed slider - update display with mapped value
        document.getElementById('ai-speed').addEventListener('input', (e) => {
            const speed = this.speedTicks[parseInt(e.target.value, 10)] || 10;
            document.getElementById('speed-value').textContent = speed;
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
  			const swPath = '/threes-web/sw.js'; // include repo name for project pages
  			navigator.serviceWorker.register(swPath)
    		.then(reg => console.log('SW registered:', reg))
    		.catch(err => console.error('SW registration failed:', err));
			}
        }
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ThreesApp();
    app.init();
});
