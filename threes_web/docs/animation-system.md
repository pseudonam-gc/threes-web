# Tile Animation System

This document explains how tile animations work in the Threes game.

## Key Concepts

- **Grid Position**: The actual DOM position of a tile element (row, col)
- **Visual Position**: Where the tile appears on screen (affected by CSS transform)
- **z-index**: Controls which tile appears on top when overlapping
- **Threes Rule**: Tiles only move 1 space per swipe (unlike 2048)

## Scenario 1: Single Tile Slide (Swipe Left)

A single tile at position (0,1) slides to position (0,0).

```
OLD GRID (what we render first):
┌─────┬─────┬─────┬─────┐
│     │  3  │     │     │  tileElements[0][1] = "3"
└─────┴─────┴─────┴─────┘

ANIMATION (apply transform):
┌─────┬─────┬─────┬─────┐
│  3  │     │     │     │  tileElements[0][1] gets
│ ←───│     │     │     │  transform: translateX(-cellSize)
└─────┴─────┴─────┴─────┘  z-index: 10

AFTER 150ms (lower z-index, render new state):
┌─────┬─────┬─────┬─────┐
│  3  │     │     │     │  tileElements[0][0] = "3" (new, on top)
│ [_] │     │     │     │  tileElements[0][1] = empty (underneath)
└─────┴─────┴─────┴─────┘

RESET TRANSFORM:
┌─────┬─────┬─────┬─────┐
│  3  │     │     │     │  Transform removed from [0][1]
│     │     │     │     │  Empty tile snaps back (invisible)
└─────┴─────┴─────┴─────┘
```

## Scenario 2: Multiple Tiles Slide (Swipe Left)

Three adjacent tiles all slide left by 1 cell.

```
OLD GRID:
     col0  col1  col2  col3
    ┌─────┬─────┬─────┬─────┐
    │     │  3  │  6  │ 12  │
    └─────┴─────┴─────┴─────┘

MOVEMENTS RECORDED:
    • {from: col1, to: col0}  →  "3" moves 1 left
    • {from: col2, to: col1}  →  "6" moves 1 left
    • {from: col3, to: col2}  →  "12" moves 1 left

ANIMATION (all tiles get same transform: -cellSize):
    ┌─────┬─────┬─────┬─────┐
    │  3  │  6  │ 12  │     │  All tiles slide 1 cell left
    │ ←── │ ←── │ ←── │     │  All transforms: translateX(-cellSize)
    └─────┴─────┴─────┴─────┘  All z-index: 10

NEW GRID (after render):
    ┌─────┬─────┬─────┬─────┐
    │  3  │  6  │ 12  │  1  │  ← New tile spawns at col3
    └─────┴─────┴─────┴─────┘
```

## Scenario 3: Merge (1 + 2 = 3, Swipe Left)

```
OLD GRID:
    ┌─────┬─────┬─────┬─────┐
    │  1  │  2  │     │     │
    └─────┴─────┴─────┴─────┘

ANIMATION:
    ┌─────┬─────┬─────┬─────┐
    │  1  │     │     │     │  "2" slides left onto "1"
    │ [2] │ ←── │     │     │  z-index: 10 (on top)
    └─────┴─────┴─────┴─────┘

NEW GRID + MERGE PULSE:
    ┌─────┬─────┬─────┬─────┐
    │ *3* │     │     │  1  │  "3" appears with pulse animation
    └─────┴─────┴─────┴─────┘  New tile spawns at edge
```

## Scenario 4: Tiles with Gap (Swipe Left)

When there's a gap, only tiles with empty space to their left move.

```
OLD GRID:
    ┌─────┬─────┬─────┬─────┐
    │  3  │     │     │  6  │  Gap between 3 and 6
    └─────┴─────┴─────┴─────┘

MOVEMENTS RECORDED:
    • Only {from: col3, to: col2} - "6" moves 1 left
    • "3" has no empty space to its left, so it doesn't move

ANIMATION:
    ┌─────┬─────┬─────┬─────┐
    │  3  │     │  6  │     │  Only "6" slides
    │     │     │ ←── │     │
    └─────┴─────┴─────┴─────┘

NEW GRID:
    ┌─────┬─────┬─────┬─────┐
    │  3  │     │  6  │  2  │  Gap still exists (1 space per swipe)
    └─────┴─────┴─────┴─────┘  New tile at col3
```

## Animation Sequence (Code Flow)

```
1. RENDER OLD GRID
   ┌────────────────────────────────────┐
   │ for each cell:                     │
   │   updateTile(i, j, oldGrid[i][j])  │
   └────────────────────────────────────┘
              │
              ▼
2. APPLY TRANSFORMS (start animation)
   ┌────────────────────────────────────┐
   │ for each movement:                 │
   │   tile = tileElements[from]        │
   │   tile.transform = translate(...)  │
   │   tile.zIndex = 10                 │
   └────────────────────────────────────┘
              │
              ▼
3. WAIT 150ms (CSS transition runs)
              │
              ▼
4. LOWER Z-INDEX
   ┌────────────────────────────────────┐
   │ for each animated tile:            │
   │   tile.zIndex = 1  (below new)     │
   └────────────────────────────────────┘
              │
              ▼
5. RENDER NEW GRID (on top of animated tiles)
   ┌────────────────────────────────────┐
   │ this.render()                      │
   │ New tiles appear at z-index: auto  │
   │ Animated tiles underneath at z: 1  │
   └────────────────────────────────────┘
              │
              ▼
6. RESET TRANSFORMS (invisible - underneath)
   ┌────────────────────────────────────┐
   │ for each animated tile:            │
   │   tile.transition = none           │
   │   tile.transform = ''              │
   │   tile.zIndex = ''                 │
   └────────────────────────────────────┘
```

## Z-Index Stack Visualization

```
DURING ANIMATION:              AFTER RENDER (before reset):

    ┌─────────────┐               ┌─────────────┐
    │ Animated    │ z:10          │ New tiles   │ z:auto
    │ (sliding)   │               │ (rendered)  │
    ├─────────────┤               ├─────────────┤
    │ Static      │ z:auto        │ Animated    │ z:1
    │ tiles       │               │ (old)       │
    └─────────────┘               └─────────────┘

The key: lower animated tiles' z-index BEFORE rendering
new state, so new tiles cover them seamlessly.
```

## Input Buffering

```
USER INPUT:     A          B                    (B processed)
                │          │                         │
TIME:     ──────┼──────────┼─────────────────────────┼────▶
                │          │                         │
ANIMATION: ─────[=====A=====]─────────────────[==B (skip)==]
                0ms      150ms                    150ms+

• Input B arrives during A's animation
• B is stored in pendingMove
• After A completes, B is processed with skipAnimation=true
• Buffered moves render instantly for responsive feel
```
