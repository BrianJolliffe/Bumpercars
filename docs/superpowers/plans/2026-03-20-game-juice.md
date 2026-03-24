# Game Juice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual juice to the bumper car game — proper car shapes, explosive eliminations, living arena, and improved HUD.

**Architecture:** All juice is client-side only. The existing `game-canvas.tsx` (single monolithic render function) will be split into focused modules: car renderer, particle system, arena renderer, HUD renderer, and a game renderer that orchestrates them. The `GameCanvas` component switches from re-rendering on every React state change to a persistent `requestAnimationFrame` loop that interpolates between server updates for smooth 60fps.

**Tech Stack:** HTML Canvas 2D API, requestAnimationFrame, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-game-juice-design.md`

---

## File Structure

```
lib/
  game/
    types.ts           — shared types (Particle, TrailPoint, KillFeedEntry, etc.)
    colors.ts          — 16-color player palette + helper to assign colors
    particles.ts       — particle system (create, update, draw)
    car-renderer.ts    — draw top-down car shape with trails
    arena-renderer.ts  — living arena (pulse, danger zone, darkness, warnings)
    hud-renderer.ts    — timer, player pips, kill feed
    effects.ts         — screen shake + elimination orchestration
components/
  game-canvas.tsx      — rewrite: rAF loop, interpolation, orchestrates renderers
```

---

### Task 1: Shared Types and Color Palette

**Files:**
- Create: `lib/game/types.ts`
- Create: `lib/game/colors.ts`

- [ ] **Step 1: Create types file**

```ts
// lib/game/types.ts
export interface Player {
  id: string
  name: string
  x: number
  y: number
  angle: number
  eliminated: boolean
}

export interface GameState {
  status: 'waiting' | 'playing' | 'finished'
  players: Record<string, Player>
  winner?: string
  timeRemaining: number
  arenaRadius: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface TrailPoint {
  x: number
  y: number
  angle: number
  alpha: number
}

export interface KillFeedEntry {
  name: string
  timestamp: number
}

export interface ScreenShake {
  offsetX: number
  offsetY: number
  intensity: number
  duration: number
  elapsed: number
}
```

- [ ] **Step 2: Create colors file**

```ts
// lib/game/colors.ts
const PLAYER_COLORS = [
  { body: '#22c55e', accent: '#16a34a', light: '#86efac' }, // green (you)
  { body: '#f59e0b', accent: '#d97706', light: '#fcd34d' }, // amber
  { body: '#3b82f6', accent: '#2563eb', light: '#93c5fd' }, // blue
  { body: '#ef4444', accent: '#dc2626', light: '#fca5a5' }, // red
  { body: '#a855f7', accent: '#9333ea', light: '#d8b4fe' }, // purple
  { body: '#ec4899', accent: '#db2777', light: '#f9a8d4' }, // pink
  { body: '#06b6d4', accent: '#0891b2', light: '#67e8f9' }, // cyan
  { body: '#f97316', accent: '#ea580c', light: '#fdba74' }, // orange
  { body: '#84cc16', accent: '#65a30d', light: '#bef264' }, // lime
  { body: '#14b8a6', accent: '#0d9488', light: '#5eead4' }, // teal
  { body: '#e11d48', accent: '#be123c', light: '#fda4af' }, // rose
  { body: '#8b5cf6', accent: '#7c3aed', light: '#c4b5fd' }, // violet
  { body: '#0ea5e9', accent: '#0284c7', light: '#7dd3fc' }, // sky
  { body: '#d946ef', accent: '#c026d3', light: '#f0abfc' }, // fuchsia
  { body: '#facc15', accent: '#eab308', light: '#fde68a' }, // yellow
  { body: '#fb923c', accent: '#f97316', light: '#fed7aa' }, // light orange
]

export function getPlayerColor(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

export function getPlayerColorByOrder(playerId: string, playerIds: string[]) {
  const sorted = [...playerIds].sort()
  const index = sorted.indexOf(playerId)
  return PLAYER_COLORS[index >= 0 ? index % PLAYER_COLORS.length : 0]
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/game/types.ts lib/game/colors.ts
git commit -m "feat: add shared game types and color palette"
```

---

### Task 2: Particle System

**Files:**
- Create: `lib/game/particles.ts`

- [ ] **Step 1: Create particle system**

```ts
// lib/game/particles.ts
import { Particle } from './types'

let particles: Particle[] = []

export function spawnExplosion(x: number, y: number, count: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
    })
  }
}

export function spawnFlash(x: number, y: number) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 1,
    maxLife: 1,
    color: '#ffffff',
    size: 40,
  })
}

export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.96
    p.vy *= 0.96
    p.life -= dt * 1.8
    if (p.life <= 0) {
      particles.splice(i, 1)
    }
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    const size = p.size * (p.color === '#ffffff' ? (1 - alpha) * 3 : alpha)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function clearParticles() {
  particles = []
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/particles.ts
git commit -m "feat: add particle system for explosions and flashes"
```

---

### Task 3: Car Renderer with Motion Trails

**Files:**
- Create: `lib/game/car-renderer.ts`

- [ ] **Step 1: Create car renderer**

The car is a top-down rectangle (~30x18px) with rounded bumpers and a windshield rectangle. Motion trails are stored as a ring buffer of recent positions per player.

```ts
// lib/game/car-renderer.ts
import { Player, TrailPoint } from './types'
import { getPlayerColorByOrder } from './colors'

const trailBuffers: Map<string, TrailPoint[]> = new Map()
const TRAIL_LENGTH = 8

export function updateTrails(players: Record<string, Player>) {
  for (const [id, player] of Object.entries(players)) {
    if (player.eliminated) continue
    let trail = trailBuffers.get(id)
    if (!trail) {
      trail = []
      trailBuffers.set(id, trail)
    }
    trail.push({ x: player.x, y: player.y, angle: player.angle, alpha: 1 })
    if (trail.length > TRAIL_LENGTH) trail.shift()
  }
}

function drawCarShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  bodyColor: string,
  accentColor: string,
  alpha: number
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalAlpha = alpha

  // Car body
  const w = 30
  const h = 18
  const r = 4
  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.moveTo(-w / 2 + r, -h / 2)
  ctx.lineTo(w / 2 - r, -h / 2)
  ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  ctx.lineTo(w / 2, h / 2 - r)
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  ctx.lineTo(-w / 2 + r, h / 2)
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  ctx.lineTo(-w / 2, -h / 2 + r)
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  ctx.closePath()
  ctx.fill()

  // Bumper front
  ctx.fillStyle = accentColor
  ctx.fillRect(w / 2 - 4, -h / 2 + 2, 4, h - 4)

  // Windshield
  ctx.fillStyle = 'rgba(200, 230, 255, 0.4)'
  ctx.fillRect(2, -h / 2 + 3, 8, h - 6)

  ctx.restore()
  ctx.globalAlpha = 1
}

export function drawCar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isCurrentPlayer: boolean,
  playerIds: string[]
) {
  const colors = isCurrentPlayer
    ? { body: '#22c55e', accent: '#16a34a', light: '#86efac' }
    : player.eliminated
      ? { body: '#64748b', accent: '#475569', light: '#94a3b8' }
      : getPlayerColorByOrder(player.id, playerIds)

  // Draw motion trail
  if (!player.eliminated) {
    const trail = trailBuffers.get(player.id) || []
    for (let i = 0; i < trail.length - 1; i++) {
      const t = trail[i]
      const alpha = ((i + 1) / trail.length) * 0.2
      drawCarShape(ctx, t.x, t.y, t.angle, colors.body, colors.accent, alpha)
    }
  }

  // Draw glow ring for current player
  if (isCurrentPlayer && !player.eliminated) {
    ctx.shadowColor = colors.body
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2)
    ctx.strokeStyle = colors.body
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  // Draw car
  drawCarShape(ctx, player.x, player.y, player.angle, colors.body, colors.accent, player.eliminated ? 0.5 : 1)

  // Draw name above car
  ctx.fillStyle = player.eliminated ? '#94a3b8' : colors.light
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(player.name, player.x, player.y - 20)
}

export function clearTrails() {
  trailBuffers.clear()
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/car-renderer.ts
git commit -m "feat: add top-down car renderer with motion trails"
```

---

### Task 4: Arena Renderer (Living Arena)

**Files:**
- Create: `lib/game/arena-renderer.ts`

- [ ] **Step 1: Create arena renderer**

```ts
// lib/game/arena-renderer.ts
const CENTER_X = 400
const CENTER_Y = 400

export function drawArena(
  ctx: CanvasRenderingContext2D,
  arenaRadius: number,
  timeRemaining: number,
  canvasSize: number,
  frameTime: number
) {
  const elapsed = 30 - timeRemaining
  const progress = elapsed / 30 // 0 to 1

  // Background grid
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  for (let i = 0; i <= canvasSize; i += 50) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvasSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvasSize, i)
    ctx.stroke()
  }

  // Darken outside arena — gradient from transparent to near-black
  const darkness = 0.3 + progress * 0.6 // 0.3 → 0.9
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvasSize, canvasSize)
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
  ctx.fill()
  ctx.restore()

  // Danger zone — red gradient band inside the edge
  const dangerIntensity = 0.1 + progress * 0.5
  const dangerWidth = 40
  const gradient = ctx.createRadialGradient(
    CENTER_X, CENTER_Y, Math.max(0, arenaRadius - dangerWidth),
    CENTER_X, CENTER_Y, arenaRadius
  )
  gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
  gradient.addColorStop(1, `rgba(239, 68, 68, ${dangerIntensity})`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing boundary
  const pulseSpeed = 1 + progress * 2 // 1 → 3 cycles/sec
  const pulse = Math.sin(frameTime * pulseSpeed * Math.PI * 2) * 0.5 + 0.5
  const borderWidth = 2 + pulse * 2
  const borderAlpha = 0.6 + pulse * 0.4

  // Warning flash at 20s, 10s, 5s
  let flashMultiplier = 1
  if (timeRemaining <= 20.3 && timeRemaining > 19.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }
  if (timeRemaining <= 10.3 && timeRemaining > 9.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }
  if (timeRemaining <= 5.3 && timeRemaining > 4.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }

  const isWarning = flashMultiplier > 1
  ctx.strokeStyle = isWarning ? '#ef4444' : '#fbbf24'
  ctx.lineWidth = borderWidth * flashMultiplier
  ctx.globalAlpha = borderAlpha
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/arena-renderer.ts
git commit -m "feat: add living arena renderer with pulse, danger zone, warnings"
```

---

### Task 5: Effects System (Screen Shake + Elimination Orchestration)

**Files:**
- Create: `lib/game/effects.ts`

- [ ] **Step 1: Create effects system**

```ts
// lib/game/effects.ts
import { ScreenShake, KillFeedEntry } from './types'
import { spawnExplosion, spawnFlash } from './particles'

let shake: ScreenShake | null = null
let killFeed: KillFeedEntry[] = []
let eliminatedIds: Set<string> = new Set()
let pauseUntil = 0

export function triggerShake(intensity: number, duration: number) {
  shake = { offsetX: 0, offsetY: 0, intensity, duration, elapsed: 0 }
}

export function updateShake(dt: number) {
  if (!shake) return
  shake.elapsed += dt
  if (shake.elapsed >= shake.duration) {
    shake = null
    return
  }
  const remaining = 1 - shake.elapsed / shake.duration
  shake.offsetX = (Math.random() - 0.5) * shake.intensity * remaining * 2
  shake.offsetY = (Math.random() - 0.5) * shake.intensity * remaining * 2
}

export function getShakeOffset(): { x: number; y: number } {
  return shake ? { x: shake.offsetX, y: shake.offsetY } : { x: 0, y: 0 }
}

export function triggerElimination(
  playerName: string,
  x: number,
  y: number,
  isFinalKill: boolean
) {
  const explosionColors = ['#f97316', '#ef4444', '#fbbf24', '#fde68a']
  spawnExplosion(x, y, isFinalKill ? 30 : 18, explosionColors)
  spawnFlash(x, y)
  triggerShake(isFinalKill ? 6 : 3, isFinalKill ? 0.5 : 0.25)

  killFeed.push({ name: playerName, timestamp: performance.now() })
  if (killFeed.length > 5) killFeed.shift()

  if (isFinalKill) {
    pauseUntil = performance.now() + 500
  }
}

export function checkEliminations(
  players: Record<string, { id: string; name: string; x: number; y: number; eliminated: boolean }>,
  activePlayers: number
) {
  for (const player of Object.values(players)) {
    if (player.eliminated && !eliminatedIds.has(player.id)) {
      eliminatedIds.add(player.id)
      const isFinalKill = activePlayers <= 1
      triggerElimination(player.name, player.x, player.y, isFinalKill)
    }
  }
}

export function getKillFeed(): KillFeedEntry[] {
  const now = performance.now()
  killFeed = killFeed.filter((e) => now - e.timestamp < 3000)
  return killFeed
}

export function isPaused(): boolean {
  return performance.now() < pauseUntil
}

export function resetEffects() {
  shake = null
  killFeed = []
  eliminatedIds = new Set()
  pauseUntil = 0
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/effects.ts
git commit -m "feat: add screen shake, elimination effects, kill feed"
```

---

### Task 6: HUD Renderer

**Files:**
- Create: `lib/game/hud-renderer.ts`

- [ ] **Step 1: Create HUD renderer**

```ts
// lib/game/hud-renderer.ts
import { Player, KillFeedEntry } from './types'

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  timeRemaining: number,
  players: Record<string, Player>,
  playerId: string,
  killFeed: KillFeedEntry[],
  canvasSize: number,
  frameTime: number
) {
  const allPlayers = Object.values(players)
  const activePlayers = allPlayers.filter((p) => !p.eliminated)
  const isUrgent = timeRemaining <= 10

  // Timer — top center
  const timerPulse = isUrgent ? Math.sin(frameTime * 6) * 0.3 + 0.7 : 1
  const timerSize = isUrgent ? 28 + Math.sin(frameTime * 6) * 4 : 28
  ctx.fillStyle = isUrgent ? `rgba(239, 68, 68, ${timerPulse})` : '#fbbf24'
  ctx.font = `bold ${timerSize}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(`${timeRemaining.toFixed(1)}s`, canvasSize / 2, 35)

  // Player pips — top left
  const pipStartX = 20
  const pipY = 25
  const pipRadius = 5
  const pipSpacing = 14
  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i]
    const px = pipStartX + i * pipSpacing
    ctx.beginPath()
    ctx.arc(px, pipY, pipRadius, 0, Math.PI * 2)
    if (p.eliminated) {
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      ctx.fillStyle = p.id === playerId ? '#22c55e' : '#fbbf24'
      ctx.fill()
    }
  }

  // Player count label
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${activePlayers.length} alive`, pipStartX, pipY + 18)

  // Kill feed — top right
  const now = performance.now()
  for (let i = 0; i < killFeed.length; i++) {
    const entry = killFeed[i]
    const age = (now - entry.timestamp) / 3000
    const alpha = 1 - age
    ctx.globalAlpha = Math.max(0, alpha)
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${entry.name} eliminated!`, canvasSize - 20, 30 + i * 20)
  }
  ctx.globalAlpha = 1
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/hud-renderer.ts
git commit -m "feat: add HUD with timer, player pips, kill feed"
```

---

### Task 7: Rewrite GameCanvas Component

**Files:**
- Modify: `components/game-canvas.tsx` (full rewrite)

This is the main task — replace the single `useEffect` render with a persistent `requestAnimationFrame` loop that orchestrates all the renderers.

- [ ] **Step 1: Rewrite game-canvas.tsx**

```tsx
// components/game-canvas.tsx
'use client'

import { useEffect, useRef } from 'react'
import { GameState } from '@/lib/game/types'
import { drawArena } from '@/lib/game/arena-renderer'
import { drawCar, updateTrails, clearTrails } from '@/lib/game/car-renderer'
import { updateParticles, drawParticles, clearParticles } from '@/lib/game/particles'
import { drawHUD } from '@/lib/game/hud-renderer'
import {
  checkEliminations,
  updateShake,
  getShakeOffset,
  getKillFeed,
  isPaused,
  resetEffects,
} from '@/lib/game/effects'

interface GameCanvasProps {
  gameState: GameState
  playerId: string
}

const CANVAS_SIZE = 800

export function GameCanvas({ gameState, playerId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState>(gameState)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // Keep gameState ref in sync
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // Animation loop — runs once, reads from ref
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    startTimeRef.current = performance.now() / 1000
    resetEffects()
    clearParticles()
    clearTrails()

    function render(timestamp: number) {
      const time = timestamp / 1000
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 1 / 60
      lastTimeRef.current = time
      const frameTime = time - startTimeRef.current

      const state = gameStateRef.current
      if (!state || !ctx) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      if (isPaused()) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      // Update systems
      const activePlayers = Object.values(state.players).filter((p) => !p.eliminated).length
      checkEliminations(state.players, activePlayers)
      updateParticles(dt)
      updateShake(dt)
      updateTrails(state.players)

      const shakeOffset = getShakeOffset()

      // Clear
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Apply screen shake
      ctx.save()
      ctx.translate(shakeOffset.x, shakeOffset.y)

      // Draw arena
      drawArena(ctx, state.arenaRadius, state.timeRemaining, CANVAS_SIZE, frameTime)

      // Draw players
      const playerIds = Object.keys(state.players)
      for (const player of Object.values(state.players)) {
        drawCar(ctx, player, player.id === playerId, playerIds)
      }

      // Draw particles
      drawParticles(ctx)

      ctx.restore()

      // Draw HUD (not affected by screen shake)
      drawHUD(ctx, state.timeRemaining, state.players, playerId, getKillFeed(), CANVAS_SIZE, frameTime)

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      resetEffects()
      clearParticles()
      clearTrails()
    }
  }, [playerId])

  return (
    <canvas
      ref={canvasRef}
      className="border-2 border-amber-400 rounded-lg bg-slate-950 w-full max-w-2xl mx-auto"
    />
  )
}
```

- [ ] **Step 2: Remove old GameState interface from game-canvas.tsx**

The shared `GameState` type is now imported from `lib/game/types.ts`. Make sure the import in `app/game/[roomId]/page.tsx` also uses the shared type:

At the top of `app/game/[roomId]/page.tsx`, replace the local `GameState` interface with:
```ts
import { GameState } from '@/lib/game/types'
```
And delete the local `interface GameState { ... }` block (lines 9-15).

- [ ] **Step 3: Commit**

```bash
git add components/game-canvas.tsx app/game/\\[roomId\\]/page.tsx lib/game/
git commit -m "feat: rewrite game canvas with juice — car shapes, explosions, living arena, HUD"
```

---

### Task 8: Manual Smoke Test

- [ ] **Step 1: Start dev servers**

```bash
pnpm dev
```

- [ ] **Step 2: Open two browser tabs and create/join a game**

Verify:
- Cars render as top-down shapes (not circles)
- Your car has a green glow
- Other players have distinct colors
- Motion trails appear behind moving cars
- Arena boundary pulses (slow at start, faster later)
- Red danger zone visible near the edge
- Area outside arena darkens over time
- Warning flashes at 20s, 10s, 5s
- Timer in top-center, pulses red under 10s
- Player count shown as pips
- When a player is eliminated: explosion particles, screen shake, name in kill feed
- Final kill has bigger explosion and brief pause
- Kill feed entries fade after 3 seconds
