// Threes Audio Manager

class ThreesAudio {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
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

            // Master compressor to prevent clipping from overlapping sounds
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 12;
            this.compressor.ratio.value = 8;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.1;

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.8;

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);

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
            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            // Short fade-in to avoid click on start
            gainNode.gain.setValueAtTime(0.001, now);
            gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.005);
            // Fade out
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

            oscillator.start(now);
            oscillator.stop(now + duration + 0.01);
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
