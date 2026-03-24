# Game Juice — Visual Polish, Dramatic Eliminations, Living Arena

**Date:** 2026-03-20
**Status:** Approved

## Overview

Add visual juice to the bumper car battle royale to make it feel alive. Three focus areas: proper car rendering, explosive eliminations, and a living arena boundary. All effects are client-side only — the server stays unchanged.

## 1. Visual Polish — Car Rendering

Replace plain circles with top-down car shapes drawn via canvas paths.

- **Car body:** Rectangular with rounded bumper front/back, small windshield detail on top
- **Color palette:** 16 high-contrast colors assigned per player
- **Current player indicator:** Green glow ring around your own car
- **Orientation:** Car shape rotates to match the physics `angle` — no separate direction indicator needed
- **Motion trails:** Semi-transparent afterimages behind moving cars, based on velocity magnitude. Stored as a short ring buffer of recent positions per player (last 5-8 frames). Each trail copy rendered with decreasing opacity.

## 2. Dramatic Eliminations

When a player crosses the arena boundary:

- **Freeze:** Car freezes in place briefly (~200ms)
- **Explosion:** 15-20 particles burst outward in random directions, colored orange/red/yellow, shrinking and fading over ~600ms
- **Flash:** White circle expands from the elimination point and fades (~150ms)
- **Screen shake:** All players see a shake effect (4-5 frames, 3-4px canvas translate offset)
- **Name callout:** Eliminated player's name floats upward and fades ("Player3 OUT!")
- **Final kill:** Longer screen shake, bigger explosion, ~500ms pause before victory screen

## 3. Living Arena

The arena boundary escalates tension as the game progresses.

### Pulsing Boundary
- Yellow border pulses in opacity/thickness on a sine wave
- Pulse rate: ~1 cycle/sec at start, accelerating to ~3 cycles/sec in the final 5 seconds

### Danger Zone
- Red gradient band inside the arena edge (~40px wide)
- Barely visible at radius 300, intense at radius 80

### Warning Flashes
- At 20s, 10s, and 5s remaining: arena border flashes bright red 3 times quickly
- Timer text pulses larger briefly to draw attention

### Background Shift
- Area outside the arena gradually darkens from grid background to near-black
- Playable area feels like a shrinking island of light

## 4. HUD Improvements

- **Timer:** Top-center, larger font, pulses red when under 10s
- **Player count:** Displayed as pips/dots (filled = alive, hollow = eliminated)
- **Kill feed:** Top-right corner, "PlayerName eliminated!" messages stack and fade after 3s

## 5. Technical Approach

### Rendering
- All effects rendered on the single HTML Canvas — no DOM overlays
- Client-side interpolation between server updates (~20fps) for smooth 60fps rendering
- Screen shake applied as a canvas translate offset, reset each frame

### Particle System
- Simple arrays of `{x, y, vx, vy, life, color, size}` objects
- Updated each client frame, removed when `life <= 0`
- Used for explosion particles, motion trail dots, and arena edge effects

### Performance
- All juice is purely client-side — no server changes needed
- Particle counts kept modest (15-20 per explosion, 5-8 trail positions per car)
- Arena effects use simple math (sine waves, linear interpolation)

### Smooth Arena Shrink
- Client interpolates `arenaRadius` between server updates rather than jumping to new values
