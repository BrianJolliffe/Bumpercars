'use client'

import { useEffect, useRef, useState } from 'react'

interface GameState {
  status: 'waiting' | 'playing' | 'finished'
  players: Record<string, { id: string; name: string; x: number; y: number; angle: number; eliminated: boolean }>
  winner?: string
  timeRemaining: number
  arenaRadius: number
}

interface GameCanvasProps {
  gameState: GameState
  playerId: string
}

export function GameCanvas({ gameState, playerId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 800

    const centerX = 400
    const centerY = 400

    // Clear background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid background
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = 0; i <= 800; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 800)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(800, i)
      ctx.stroke()
    }

    // Draw arena circle
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, centerY, gameState.arenaRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw shrinking indicator
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.arc(centerX, centerY, gameState.arenaRadius + 10, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw players
    Object.values(gameState.players).forEach((player) => {
      const isCurrentPlayer = player.id === playerId
      const isEliminated = player.eliminated

      // Draw car shadow
      ctx.fillStyle = isEliminated ? '#334155' : isCurrentPlayer ? '#22c55e' : '#fbbf24'
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(player.x + 2, player.y + 2, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Draw car circle
      ctx.fillStyle = isEliminated ? '#64748b' : isCurrentPlayer ? '#22c55e' : '#fbbf24'
      ctx.beginPath()
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2)
      ctx.fill()

      // Draw car border
      ctx.strokeStyle = isCurrentPlayer ? '#16a34a' : isEliminated ? '#475569' : '#d97706'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw player direction indicator
      const dirX = Math.cos(player.angle) * 12
      const dirY = Math.sin(player.angle) * 12
      ctx.strokeStyle = isCurrentPlayer ? '#86efac' : isEliminated ? '#cbd5e1' : '#fcd34d'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      ctx.lineTo(player.x + dirX, player.y + dirY)
      ctx.stroke()

      // Draw player name
      ctx.fillStyle = isEliminated ? '#94a3b8' : isCurrentPlayer ? '#a7f3d0' : '#fef3c7'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(player.name, player.x, player.y - 25)

      // Draw eliminated status
      if (isEliminated) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(player.x, player.y, 20, 0, Math.PI * 2)
        ctx.stroke()

        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(player.x - 8, player.y - 8)
        ctx.lineTo(player.x + 8, player.y + 8)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(player.x + 8, player.y - 8)
        ctx.lineTo(player.x - 8, player.y + 8)
        ctx.stroke()
      }
    })

    // Draw UI
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`TIME: ${gameState.timeRemaining.toFixed(1)}s`, 20, 30)

    const playerCount = Object.values(gameState.players).filter((p) => !p.eliminated).length
    ctx.fillText(`PLAYERS: ${playerCount}/16`, 20, 60)

    // Draw current player info
    const currentPlayer = gameState.players[playerId]
    if (currentPlayer && !currentPlayer.eliminated) {
      ctx.fillStyle = '#22c55e'
      ctx.textAlign = 'right'
      ctx.fillText('YOU', 780, 30)
    }
  }, [gameState, playerId])

  return (
    <canvas
      ref={canvasRef}
      className="border-2 border-amber-400 rounded-lg bg-slate-950 w-full max-w-2xl mx-auto"
    />
  )
}
