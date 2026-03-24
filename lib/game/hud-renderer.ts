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
