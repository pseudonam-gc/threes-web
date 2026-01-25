// Threes Audio Manager

class ThreesAudio {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        // Create audio context on first user interaction
        document.addEventListener('click', () => this.initContext(), { once: true });
        document.addEventListener('touchstart', () => this.initContext(), { once: true });
        document.addEventListener('keydown', () => this.initContext(), { once: true });
    }

    initContext() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            // Ignore audio errors
        }
    }

    playMove() {
        this.playTone(220, 0.08, 'sine', 0.15);
    }

    playMerge(tileValue) {
        // Higher tiles make higher pitched merge sounds
        const baseFreq = 330;
        const freq = baseFreq + (tileValue * 20);
        this.playTone(Math.min(freq, 880), 0.12, 'triangle', 0.25);
    }

    playGameOver() {
        // Descending notes
        setTimeout(() => this.playTone(440, 0.2, 'sine', 0.3), 0);
        setTimeout(() => this.playTone(349, 0.2, 'sine', 0.3), 150);
        setTimeout(() => this.playTone(294, 0.3, 'sine', 0.3), 300);
    }

    playHighScore() {
        // Ascending celebratory notes
        setTimeout(() => this.playTone(523, 0.15, 'sine', 0.3), 0);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 200);
        setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.3), 300);
    }
}

window.ThreesAudio = ThreesAudio;
