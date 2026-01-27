// Threes LocalStorage Management

class ThreesStorage {
    constructor() {
        this.GAME_STATE_KEY = 'threes_game_state';
        this.STATS_KEY = 'threes_stats';
        this.SETTINGS_KEY = 'threes_settings';
    }

    saveGameState(state) {
        try {
            localStorage.setItem(this.GAME_STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    loadGameState() {
        try {
            const data = localStorage.getItem(this.GAME_STATE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Failed to load game state:', e);
            return null;
        }
    }

    clearGameState() {
        try {
            localStorage.removeItem(this.GAME_STATE_KEY);
        } catch (e) {
            console.warn('Failed to clear game state:', e);
        }
    }

    getStats() {
        try {
            const data = localStorage.getItem(this.STATS_KEY);
            return data ? JSON.parse(data) : {
                highScore: 0,
                gamesPlayed: 0,
                highestTile: 0
            };
        } catch (e) {
            console.warn('Failed to load stats:', e);
            return {
                highScore: 0,
                gamesPlayed: 0,
                highestTile: 0
            };
        }
    }

    saveStats(stats) {
        try {
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.warn('Failed to save stats:', e);
        }
    }

    updateStats(score, maxTile) {
        const stats = this.getStats();
        let isNewHighScore = false;

        if (score > stats.highScore) {
            stats.highScore = score;
            isNewHighScore = true;
        }

        if (maxTile > stats.highestTile) {
            stats.highestTile = maxTile;
        }

        stats.gamesPlayed++;

        this.saveStats(stats);
        return { stats, isNewHighScore };
    }

    getSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {
                soundEnabled: true
            };
        } catch (e) {
            console.warn('Failed to load settings:', e);
            return { soundEnabled: true };
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
}

window.ThreesStorage = ThreesStorage;
