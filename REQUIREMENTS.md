# Threes Web - Requirements Document

## Overview

Threes is a sliding puzzle game played on a 4x4 grid. Players swipe to move tiles, combining them according to specific rules to build higher numbers and achieve the highest possible score. This document specifies the requirements for a mobile-friendly web application implementation.

---

## 1. Game Rules

### 1.1 Grid and Tiles

- **Grid Size**: 4x4 (16 cells)
- **Tile Values**: 1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288, 24576, 49152, 98304, 196608
- **Tile Indices**: Internally stored as indices 1-19 mapping to the values above
- **Empty Cell**: Represented as index 0

### 1.2 Tile Combining Rules

| Combination | Result | Rule |
|-------------|--------|------|
| 1 + 2 | 3 | Only 1s and 2s can combine with each other |
| 3 + 3 | 6 | Same-value tiles (3+) combine |
| 6 + 6 | 12 | Same-value tiles combine |
| N + N | 2N | Pattern continues for all values 3+ |

**Invalid combinations:**
- 1 + 1 (cannot combine)
- 2 + 2 (cannot combine)
- 1 + 3 (cannot combine)
- 3 + 6 (cannot combine - must be same value)

### 1.3 Movement Mechanics

- Player swipes in one of four directions: UP, DOWN, LEFT, RIGHT
- All tiles attempt to move one cell in the swipe direction
- Tiles stop when they hit:
  - The edge of the grid
  - Another tile they cannot combine with
- Tiles that can combine will merge when pushed into each other
- A move is only valid if at least one tile moves or merges

### 1.4 Tile Spawning

After each valid move, a new tile spawns on the grid:

**Spawn Location:**
- New tile appears on the edge **opposite** to the swipe direction
  - Swipe UP → tile spawns on bottom edge
  - Swipe DOWN → tile spawns on top edge
  - Swipe LEFT → tile spawns on right edge
  - Swipe RIGHT → tile spawns on left edge
- Tile only spawns in cells belonging to rows/columns that actually moved
- Random selection among valid spawn positions

**Spawn Value (Tile Pool System):**

The game uses a bag/pool system for tile spawning:

1. **Tile Pool**: Contains 12 tiles (four 1s, four 2s, four 3s)
   - Tiles are drawn randomly and removed from pool
   - Pool refills when all 12 tiles are drawn

2. **Bonus Pool**: Activated when max tile ≥ 48 (index 7)
   - Contains tiles from 6 to max_tile/8
   - Example: If max tile is 768, bonus pool contains [6, 12, 24, 48, 96]

3. **Draw Queue**: Contains 21 "slips"
   - 20 normal-tile slips (draw from tile pool)
   - 1 bonus-tile slip (draw from bonus pool)
   - Queue refills after 21 draws
   - Bonus position is randomized each cycle

**Bonus Tile Distribution (Triplet System):**
- If 1 option: Return that option (always 6)
- If 2 options: Uniform random between them
- If 3 options: Uniform random among all three
- If 4+ options: Pick random triplet, then uniform within triplet

### 1.5 Game Start

- **Initial Tiles**: 9 tiles placed randomly across the grid
- **Initial Tile Values**: Drawn from the tile pool (random mix of 1s, 2s, 3s)
- **Next Tile Preview**: First "next tile" is drawn and displayed

### 1.6 Game End

The game ends when:
- No empty cells remain AND
- No valid moves exist (no adjacent tiles can combine)

---

## 2. Scoring System

### 2.1 Score Calculation

Uses the original Threes scoring formula:

| Tile Value | Score Points | Formula |
|------------|--------------|---------|
| 1 | 0 | - |
| 2 | 0 | - |
| 3 | 3 | 3^1 |
| 6 | 9 | 3^2 |
| 12 | 27 | 3^3 |
| 24 | 81 | 3^4 |
| 48 | 243 | 3^5 |
| 96 | 729 | 3^6 |
| 192 | 2187 | 3^7 |
| 384 | 6561 | 3^8 |
| ... | ... | 3^n |

**Score Accumulation:**
- Points are added when tiles merge (using the resulting tile's score value)
- Points are added when new tiles spawn (using the spawned tile's score value)
- Final score is the accumulated total, not the sum of tiles on board

### 2.2 Statistics Tracked

- **High Score**: Best score ever achieved
- **Games Played**: Total number of completed games
- **Highest Tile**: Largest tile value ever achieved

---

## 3. User Interface

### 3.1 Layout

```
+----------------------------------+
|  Score: 12345     High: 99999    |
+----------------------------------+
|                                  |
|    +----+----+----+----+         |
|    | 48 | 24 | 12 |  6 |         |
|    +----+----+----+----+         |
|    |  3 |  1 |  2 |  3 |         |
|    +----+----+----+----+         |
|    |  6 |    |  1 |  2 |         |
|    +----+----+----+----+         |
|    | 12 |  3 |    |  1 |         |
|    +----+----+----+----+         |
|                                  |
+----------------------------------+
|  Next: [3]           [New Game]  |
+----------------------------------+
```

### 3.2 Visual Design

**Theme**: Original Threes style (clean, pastel aesthetic)

**Tile Colors:**
| Tile | Background Color | Text Color |
|------|------------------|------------|
| Empty | Background (dark) | - |
| 1 | Light Blue (#A3CEDC) | White |
| 2 | Light Red/Pink (#FF8080) | White |
| 3+ | White/Light Gray (#DCDCDC) | Black (3), Red (6+) |

**Typography:**
- Tile numbers: Bold, centered
- Score display: Clear, readable
- Responsive font sizing based on tile value digits

### 3.3 Responsive Design

**Board Sizing:**
- Board fills the largest possible square within viewport
- Maintains aspect ratio on all screen sizes
- Minimum padding around board edges

**Breakpoints:**
- Mobile: Board takes full width minus padding
- Tablet: Board centered with max-width constraint
- Desktop: Board centered with comfortable max-width

### 3.4 Next Tile Preview

- Shows the **exact number** of the next tile to spawn
- Displays with appropriate tile color (blue for 1, red for 2, white for 3+)
- Bonus tiles (6+) display in white with red text

---

## 4. Controls

### 4.1 Touch Controls (Mobile)

- **Gesture**: Swipe anywhere on screen
- **Swipe Threshold**: 40px minimum distance
- **Direction Detection**: Based on primary axis of movement
- **Invalid Moves**: Ignored silently (no feedback)

### 4.2 Keyboard Controls (Desktop)

| Keys | Action |
|------|--------|
| ↑ or W | Move Up |
| ↓ or S | Move Down |
| ← or A | Move Left |
| → or D | Move Right |

### 4.3 Mouse Controls (Desktop)

- Click and drag to swipe (same as touch)

---

## 5. Animations

### 5.1 Tile Movement

- **Style**: Smooth slide
- **Duration**: 150-200ms
- **Easing**: Ease-out for natural deceleration

### 5.2 Tile Merging

- Movement animation completes first
- Optional: Brief scale/pulse on merged tile

### 5.3 New Tile Spawn

- Tile appears after movement animation completes
- Optional: Fade-in or scale-up effect

---

## 6. Audio

### 6.1 Sound Effects

- **Tile Move**: Subtle slide sound
- **Tile Merge**: Satisfying "pop" or "click"
- **Game Over**: Distinct end-game sound
- **New High Score**: Celebratory sound

### 6.2 Audio Controls

- Mute/unmute toggle
- Audio state persisted in localStorage

---

## 7. Game Flow

### 7.1 New Game

- Confirmation dialog if game is in progress: "Start new game? Current progress will be lost."
- On confirm: Reset grid, draw 9 initial tiles, draw first next tile

### 7.2 Game Over Screen

Display:
- Final score
- Highest tile achieved this game
- High score (with indicator if new record)
- "Play Again" button
- Statistics summary

### 7.3 Persistence

**Saved to localStorage:**
- Current game state (grid, score, bag state, next tile)
- High score
- Statistics (games played, highest tile)
- Audio preferences

**Resume on Load:**
- If saved game exists, restore and continue
- Display current score and board state

---

## 8. Technical Requirements

### 8.1 Technology Stack

- **Framework**: Vanilla JavaScript (no frameworks)
- **Styling**: CSS3 (no preprocessors required)
- **Build**: None required (static files)

### 8.2 Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome for Android

### 8.3 Progressive Web App (PWA)

**Required Features:**
- Service Worker for offline support
- Web App Manifest for "Add to Home Screen"
- Cached assets for offline play
- App-like experience (no browser chrome when installed)

**Manifest Requirements:**
- App name: "Threes"
- Theme color matching game aesthetic
- Icons: 192x192 and 512x512 PNG
- Display: standalone
- Orientation: portrait (primary), landscape (allowed)

### 8.4 Performance

- 60fps animations
- No jank on tile movement
- Fast initial load (<2s on 3G)
- Minimal JavaScript bundle size

---

## 9. File Structure

```
threes_web/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── css/
│   └── style.css      # All styles
├── js/
│   ├── game.js        # Core game logic
│   ├── ui.js          # UI rendering and updates
│   ├── controls.js    # Input handling
│   ├── storage.js     # LocalStorage management
│   └── audio.js       # Sound effects
├── assets/
│   ├── icons/         # PWA icons
│   └── sounds/        # Audio files
└── REQUIREMENTS.md    # This document
```

---

## 10. Testing Considerations

### 10.1 Game Logic Tests

- Tile combining (all valid/invalid combinations)
- Movement in all directions
- Spawn position validation
- Tile pool exhaustion and refill
- Bonus tile draw timing and distribution
- Game over detection
- Score calculation accuracy

### 10.2 UI Tests

- Responsive layout on various screen sizes
- Touch gesture recognition
- Keyboard input handling
- Animation smoothness
- Correct tile colors and values displayed

### 10.3 PWA Tests

- Offline functionality
- Add to home screen flow
- App icon display
- Service worker caching

---

## 11. Future Considerations (Out of Scope)

The following features are explicitly **not** included in this version:
- Undo functionality
- Dark mode theme
- Leaderboards/online scores
- Multiplayer
- Daily challenges
- Haptic feedback
- Tutorial/onboarding
- Achievements

---

## References

- [Threes - Wikipedia](https://en.wikipedia.org/wiki/Threes)
- [Original Threes Game](https://threesjs.io/)
- Existing C implementation: `threes.h` in this repository
