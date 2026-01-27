// Threes Input Controls

class ThreesControls {
    constructor(onMove) {
        this.onMove = onMove;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.swipeThreshold = 40;
        this.enabled = true;
    }

    init() {
        this.setupKeyboard();
        this.setupTouch();
        this.setupMouse();
    }

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            let direction = null;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    direction = UP;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    direction = DOWN;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    direction = LEFT;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    direction = RIGHT;
                    break;
            }

            if (direction !== null) {
                e.preventDefault();
                this.onMove(direction);
            }
        });
    }

    setupTouch() {
        document.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isTouching = true;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.enabled || !this.isTouching) return;
            // Prevent scrolling while swiping
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.enabled || !this.isTouching) return;
            this.isTouching = false;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            this.handleSwipe(touchEndX - this.touchStartX, touchEndY - this.touchStartY);
        });
    }

    setupMouse() {
        let mouseDown = false;
        let startX = 0;
        let startY = 0;

        document.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            mouseDown = true;
            startX = e.clientX;
            startY = e.clientY;
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.enabled || !mouseDown) return;
            mouseDown = false;

            this.handleSwipe(e.clientX - startX, e.clientY - startY);
        });

        document.addEventListener('mouseleave', () => {
            mouseDown = false;
        });
    }

    handleSwipe(deltaX, deltaY) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Check if swipe is long enough
        if (absX < this.swipeThreshold && absY < this.swipeThreshold) {
            return;
        }

        let direction;

        if (absX > absY) {
            // Horizontal swipe
            direction = deltaX > 0 ? RIGHT : LEFT;
        } else {
            // Vertical swipe
            direction = deltaY > 0 ? DOWN : UP;
        }

        this.onMove(direction);
    }
}

window.ThreesControls = ThreesControls;
