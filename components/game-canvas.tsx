'use client'

import { useEffect, useRef } from 'react'
import { GameState, GameEvent } from '@/lib/game/types'
import { drawArena } from '@/lib/game/arena-renderer'
import { drawCar, updateTrails, clearTrails, drawStopMarker } from '@/lib/game/car-renderer'
import { updateParticles, drawParticles, clearParticles } from '@/lib/game/particles'
import { drawHUD } from '@/lib/game/hud-renderer'
import { getPlayerColor } from '@/lib/game/colors'
import { playShrinkWarning } from '@/lib/game/audio'
import { LocalPredictor } from '@/lib/game/prediction'
import { SnapshotBuffer, RENDER_DELAY_MS } from '@/lib/game/snapshots'
import {
  processEvents,
  updateShake,
  getShakeOffset,
  getKillFeed,
  isPaused,
  resetEffects,
  updateFloatingTexts,
  drawFloatingTexts,
} from '@/lib/game/effects'

interface GameCanvasProps {
  gameState: GameState
  playerId: string
  /** Live steering vector, so the local car can be predicted instead of lagging. */
  dirRef: React.RefObject<{ x: number; y: number }>
  /** Increments on every dash input, so the predictor can fire it immediately. */
  dashNonceRef: React.RefObject<number>
}

const CANVAS_SIZE = 800

export function GameCanvas({ gameState, playerId, dirRef, dashNonceRef }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<SnapshotBuffer>(new SnapshotBuffer())
  const pendingEventsRef = useRef<Array<{ evt: GameEvent; at: number }>>([])
  const seenEventIdsRef = useRef<Set<number>>(new Set())
  const playerIdRef = useRef(playerId)
  const latestStateRef = useRef<GameState>(gameState)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const wasOutOfBoundsRef = useRef(false)
  const predictorRef = useRef<LocalPredictor>(new LocalPredictor())
  const frozenStateRef = useRef<GameState | null>(null)
  const seenDashNonceRef = useRef(0)
  const startTimeRef = useRef<number>(0)

  playerIdRef.current = playerId
  latestStateRef.current = gameState

  // Feed each server broadcast into the interpolation buffer, and queue its
  // effect events to fire when the render clock catches up to them.
  useEffect(() => {
    bufferRef.current.push(gameState)

    const now = performance.now()
    for (const evt of gameState.events ?? []) {
      if (seenEventIdsRef.current.has(evt.id)) continue
      seenEventIdsRef.current.add(evt.id)
      pendingEventsRef.current.push({ evt, at: now })
    }
    if (seenEventIdsRef.current.size > 500) seenEventIdsRef.current.clear()
  }, [gameState])

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
    bufferRef.current.clear()
    pendingEventsRef.current = []
    seenEventIdsRef.current.clear()
    // Seed with what we already have so the arena is on screen immediately,
    // rather than staying black until the next server broadcast.
    // Treat anything already in the buffer as history: a remount (each new
    // round mounts a fresh canvas) must not replay the last round's explosions.
    for (const evt of latestStateRef.current.events ?? []) {
      seenEventIdsRef.current.add(evt.id)
    }
    bufferRef.current.push(latestStateRef.current)
    predictorRef.current.reset()

    function render(timestamp: number) {
      const time = timestamp / 1000
      const dt = lastTimeRef.current ? Math.min(0.05, time - lastTimeRef.current) : 1 / 60
      lastTimeRef.current = time
      const frameTime = time - startTimeRef.current

      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      const now = performance.now()
      const state = bufferRef.current.sample(now)
      if (!state) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      const colorFor = (id: string) => getPlayerColor(state.players[id]?.colorIndex ?? 0).body

      // Fire events in step with the delayed render clock, so an explosion
      // lands where the car is actually being drawn.
      const due: GameEvent[] = []
      pendingEventsRef.current = pendingEventsRef.current.filter((entry) => {
        if (entry.at <= now - RENDER_DELAY_MS) {
          due.push(entry.evt)
          return false
        }
        return true
      })
      if (due.length) {
        due.sort((a, b) => a.id - b.id)
        processEvents(due, playerIdRef.current, colorFor)
      }

      const me = state.players[playerIdRef.current]

      // Your own car is predicted forward from your live inputs so steering is
      // immediate; everyone else stays on the delayed clock so contact lines up.
      const newest = bufferRef.current.newest()
      const authoritative = newest?.players[playerIdRef.current]
      if (me && authoritative && !me.eliminated && state.status === 'playing') {
        if (dashNonceRef.current !== seenDashNonceRef.current) {
          seenDashNonceRef.current = dashNonceRef.current
          predictorRef.current.dash(dirRef.current)
        }
        const predicted = predictorRef.current.step(authoritative, dirRef.current, dt * 1000)
        me.x = predicted.x
        me.y = predicted.y
      } else {
        predictorRef.current.reset()
      }

      const outNow = !!me && me.outOfBounds && !me.eliminated
      if (outNow && !wasOutOfBoundsRef.current) playShrinkWarning()
      wasOutOfBoundsRef.current = outNow

      // Hit-stop on the round-deciding knockout: freeze the world, keep drawing.
      const frozen = isPaused()
      if (frozen && frozenStateRef.current) {
        // Keep drawing the frozen frame so the decisive knockout actually lands.
        Object.assign(state, frozenStateRef.current)
      } else if (frozen) {
        frozenStateRef.current = state
      } else {
        frozenStateRef.current = null
      }

      if (!frozen) {
        updateParticles(dt)
        updateFloatingTexts(dt)
        updateTrails(state.players)
      }
      updateShake(dt)

      const shakeOffset = getShakeOffset()

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      ctx.save()
      ctx.translate(shakeOffset.x, shakeOffset.y)

      drawArena(
        ctx,
        state.arenaRadius,
        state.centerX,
        state.centerY,
        state.obstacles ?? [],
        CANVAS_SIZE,
        frameTime,
        state.suddenDeath
      )

      const local = state.players[playerIdRef.current]
      if (local && state.status === 'playing') {
        drawStopMarker(ctx, local, state.arenaRadius, state.centerX, state.centerY)
      }

      // Eliminated cars first, so live cars always draw on top of the wreckage.
      const cars = Object.values(state.players)
      for (const player of cars) {
        if (player.eliminated) drawCar(ctx, player, player.id === playerIdRef.current)
      }
      for (const player of cars) {
        if (!player.eliminated) drawCar(ctx, player, player.id === playerIdRef.current)
      }

      drawParticles(ctx)
      drawFloatingTexts(ctx)

      ctx.restore()

      drawHUD(
        ctx,
        state.timeRemaining,
        state.suddenDeath,
        state.players,
        playerIdRef.current,
        getKillFeed(),
        CANVAS_SIZE,
        frameTime
      )

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      resetEffects()
      clearParticles()
      clearTrails()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-3xl mx-auto rounded-xl border-2 border-slate-700 bg-slate-950 shadow-[0_0_60px_rgba(15,23,42,0.9)]"
    />
  )
}
