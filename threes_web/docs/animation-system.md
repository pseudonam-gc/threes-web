# Tile Animation System

This document explains how tile animations work in the Threes game.

## Key Concepts

- **Grid Position**: The actual DOM position of a tile element (row, col)
- **Visual Position**: Where the tile appears on screen (affected by CSS transform)
- **Threes Rule**: Tiles only move 1 space per swipe (unlike 2048)

## Animation Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. EXISTING TILES        2. STATE SWAP         3. SPAWNED TILE │
│     slide A → B              (instant)             slides in    │
│                                                                 │
│   ┌───┐                      ┌───┐                      ┌───┐  │
│   │ 3 │ ───────────►         │ 3 │              ← ───── │ 1 │  │
│   └───┘   150ms              └───┘   hidden→show        └───┘  │
│                                                         150ms   │
└─────────────────────────────────────────────────────────────────┘
```

## Scenario 1: Single Tile Slide (Swipe Left)

```
STEP 1: Render old grid, apply transform
┌─────┬─────┬─────┬─────┐
│     │  3  │     │     │   tileElements[0][1] = "3"
│     │ ──► │     │     │   transform: translateX(-cellSize)
└─────┴─────┴─────┴─────┘   z-index: 10

        ↓ 150ms animation

STEP 2: Tile reaches destination
┌─────┬─────┬─────┬─────┐
│  3  │     │     │     │   Tile visually at col 0
│     │     │     │     │   (still DOM element at col 1)
└─────┴─────┴─────┴─────┘

STEP 3: Hide animated tile, render new state
┌─────┬─────┬─────┬─────┐
│  3  │     │     │     │   [0][1] hidden (visibility: hidden)
│     │     │     │     │   [0][0] now shows "3"
└─────┴─────┴─────┴─────┘   Transform reset while hidden

STEP 4: Spawned tile slides in from edge
┌─────┬─────┬─────┬─────┐
│  3  │     │     │ ←1  │   New tile slides in from right
│     │     │     │     │   (opposite of swipe direction)
└─────┴─────┴─────┴─────┘
```

## Scenario 2: Multiple Adjacent Tiles (Swipe Left)

```
OLD GRID:
     col0  col1  col2  col3
    ┌─────┬─────┬─────┬─────┐
    │     │  3  │  6  │ 12  │
    └─────┴─────┴─────┴─────┘

ANIMATION (all slide 1 cell left simultaneously):
    ┌─────┬─────┬─────┬─────┐
    │  3  │  6  │ 12  │     │  All transforms: translateX(-cellSize)
    │ ←── │ ←── │ ←── │     │
    └─────┴─────┴─────┴─────┘

AFTER HIDE + RENDER (instant swap):
    ┌─────┬─────┬─────┬─────┐
    │  3  │  6  │ 12  │     │  Animated tiles hidden
    │     │     │     │     │  New tiles appear instantly
    └─────┴─────┴─────┴─────┘

SPAWNED TILE SLIDES IN:
    ┌─────┬─────┬─────┬─────┐
    │  3  │  6  │ 12  │ ←1  │  New tile slides from right edge
    └─────┴─────┴─────┴─────┘
```

## Scenario 3: Merge (1 + 2 = 3)

```
OLD GRID:
    ┌─────┬─────┬─────┬─────┐
    │  1  │  2  │     │     │
    └─────┴─────┴─────┴─────┘

ANIMATION:
    ┌─────┬─────┬─────┬─────┐
    │  1  │     │     │     │  "2" slides onto "1"
    │ [2] │ ←── │     │     │
    └─────┴─────┴─────┴─────┘

AFTER SWAP + MERGE PULSE:
    ┌─────┬─────┬─────┬─────┐
    │ *3* │     │     │  1  │  "3" with pulse animation
    └─────┴─────┴─────┴─────┘  Spawned tile slides in
```

## Code Flow

```
animateMove(moveResult)
│
├─► 1. Render OLD grid state
│      for each cell: updateTile(i, j, oldGrid[i][j])
│
├─► 2. Calculate cellSize from actual DOM
│      cellSize = cells[1].left - cells[0].left
│
├─► 3. Apply transforms to moving tiles
│      tile.transform = translate(deltaX, deltaY)
│      tile.zIndex = 10
│
├─► 4. Wait 150ms (CSS transition runs)
│
├─► 5. Hide animated tiles
│      tile.visibility = 'hidden'
│
├─► 6. Render NEW grid state
│      this.render()  // New tiles appear instantly
│
├─► 7. Reset transforms (invisible, no visual effect)
│      tile.transition = 'none'
│      tile.transform = ''
│
├─► 8. Restore visibility
│      tile.visibility = ''
│      tile.transition = ''
│
├─► 9. Animate spawned tile (slides in from edge)
│      spawnedTile.transform = translateX/Y(±100%)
│      // reflow
│      spawnedTile.transform = ''
│
└─► 10. Merge pulse animations
       tile.classList.add('merge-pulse')
```

## Spawned Tile Direction

The spawned tile slides in from the edge opposite to the swipe:

```
Swipe UP    → Tile enters from BOTTOM  → translateY(100%)  → translateY(0)
Swipe DOWN  → Tile enters from TOP     → translateY(-100%) → translateY(0)
Swipe LEFT  → Tile enters from RIGHT   → translateX(100%)  → translateX(0)
Swipe RIGHT → Tile enters from LEFT    → translateX(-100%) → translateX(0)
```

## Input Buffering

```
USER INPUT:     A          B                    (B processed)
                │          │                         │
TIME:     ──────┼──────────┼─────────────────────────┼────►
                │          │                         │
ANIMATION: ─────[=====A=====]─────────────────[==B (skip)==]
                0ms      150ms                    150ms+

• Input B arrives during A's animation → stored in pendingMove
• After A completes, B is processed with skipAnimation=true
• Buffered moves render instantly for responsive feel
```

## CSS Requirements

```css
.cell {
    overflow: visible !important;  /* Allow tiles to slide across */
    contain: none;
}

.board {
    overflow: hidden;  /* Clip at board edges */
}

.tile {
    transition: transform 0.15s ease-out;
}
```
