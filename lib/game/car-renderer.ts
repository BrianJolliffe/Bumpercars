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

  const w = 44
  const h = 28
  const r = 5
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
    ctx.arc(player.x, player.y, 28, 0, Math.PI * 2)
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
