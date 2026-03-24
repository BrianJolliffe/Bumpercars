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
