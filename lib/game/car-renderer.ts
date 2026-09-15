import { Player, TrailPoint } from './types'
import { getPlayerColor, LOCAL_HIGHLIGHT } from './colors'

const trailBuffers: Map<string, TrailPoint[]> = new Map()
const TRAIL_LENGTH = 10
/** Only record a trail point once the car has actually moved, so trails streak. */
const TRAIL_MIN_STEP = 2.5

export function updateTrails(players: Record<string, Player>) {
  for (const [id, player] of Object.entries(players)) {
    if (player.eliminated) {
      trailBuffers.delete(id)
      continue
    }
    let trail = trailBuffers.get(id)
    if (!trail) {
      trail = []
      trailBuffers.set(id, trail)
    }
    const last = trail[trail.length - 1]
    if (last && Math.hypot(player.x - last.x, player.y - last.y) < TRAIL_MIN_STEP) continue
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
  const r = 6

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

  // Bright front bumper — the heading has to be readable at a glance.
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.moveTo(w / 2 - 7, -h / 2 + 2)
  ctx.lineTo(w / 2, -h / 2 + 6)
  ctx.lineTo(w / 2, h / 2 - 6)
  ctx.lineTo(w / 2 - 7, h / 2 - 2)
  ctx.closePath()
  ctx.fill()

  // Rear block, darker, so front and back never read the same.
  ctx.fillStyle = accentColor
  ctx.fillRect(-w / 2 + 1, -h / 2 + 4, 6, h - 8)

  ctx.fillStyle = 'rgba(210, 235, 255, 0.45)'
  ctx.fillRect(-1, -h / 2 + 4, 10, h - 8)

  ctx.restore()
  ctx.globalAlpha = 1
}

export function drawCar(ctx: CanvasRenderingContext2D, player: Player, isCurrentPlayer: boolean) {
  if (player.eliminated && (player.x < -40 || player.x > 840 || player.y < -40 || player.y > 840)) {
    return
  }

  const colors = getPlayerColor(player.colorIndex)

  if (!player.eliminated) {
    const trail = trailBuffers.get(player.id) || []
    for (let i = 0; i < trail.length - 1; i++) {
      const t = trail[i]
      const alpha = ((i + 1) / trail.length) * (player.dashing ? 0.42 : 0.22)
      drawCarShape(ctx, t.x, t.y, t.angle, colors.body, colors.accent, alpha)
    }
  }

  // Out of bounds but not gone yet — a closing red ring counts down the
  // window you have to drive back in.
  if (player.outOfBounds && !player.eliminated) {
    const radius = 22 + player.recovery * 22
    ctx.save()
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 18
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Dashing cars glow — you need to see a ram coming.
  if (player.dashing && !player.eliminated) {
    ctx.save()
    ctx.shadowColor = '#fb923c'
    ctx.shadowBlur = 26
    ctx.beginPath()
    ctx.arc(player.x, player.y, 26, 0, Math.PI * 2)
    ctx.strokeStyle = '#fb923c'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  // Dash charge is drawn on everyone — punishing someone who just burned theirs
  // is only possible if you can see that they did.
  if (!player.eliminated) {
    const radius = isCurrentPlayer ? 31 : 27
    if (player.dashCharge < 1) {
      ctx.beginPath()
      ctx.arc(player.x, player.y, radius, -Math.PI / 2, -Math.PI / 2 + player.dashCharge * Math.PI * 2)
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)'
      ctx.lineWidth = isCurrentPlayer ? 3.5 : 2.5
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#fb923c'
      ctx.globalAlpha = isCurrentPlayer ? 0.9 : 0.6
      ctx.lineWidth = isCurrentPlayer ? 3 : 2
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  if (isCurrentPlayer && !player.eliminated) {
    ctx.save()
    ctx.shadowColor = LOCAL_HIGHLIGHT
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(player.x, player.y, 35, 0, Math.PI * 2)
    ctx.strokeStyle = LOCAL_HIGHLIGHT
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    const arrowY = player.y - 36
    ctx.fillStyle = LOCAL_HIGHLIGHT
    ctx.beginPath()
    ctx.moveTo(player.x, arrowY + 7)
    ctx.lineTo(player.x - 6, arrowY)
    ctx.lineTo(player.x + 6, arrowY)
    ctx.closePath()
    ctx.fill()
  }

  if (player.eliminated) {
    drawCarShape(ctx, player.x, player.y, player.angle, '#7f1d1d', '#450a0a', 0.65)
  } else {
    drawCarShape(ctx, player.x, player.y, player.angle, colors.body, colors.accent, 1)
  }

  if (!player.eliminated) {
    ctx.fillStyle = isCurrentPlayer ? LOCAL_HIGHLIGHT : colors.light
    ctx.font = isCurrentPlayer ? '900 13px sans-serif' : 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.8)'
    ctx.lineWidth = 3
    const label = isCurrentPlayer ? 'YOU' : player.name
    ctx.strokeText(label, player.x, player.y - 22)
    ctx.fillText(label, player.x, player.y - 22)
  }
}

/**
 * Where your car will coast to if you stop steering now. With real momentum the
 * hardest thing to read is your own stopping distance, and this turns that into
 * something you can see — red once the coast takes you over the line.
 */
export function drawStopMarker(
  ctx: CanvasRenderingContext2D,
  player: Player,
  arenaRadius: number,
  centerX: number,
  centerY: number
) {
  if (player.eliminated) return

  const speed = Math.hypot(player.vx, player.vy)
  if (speed < 1.2) return

  // At frictionAir 0.055 a car coasts about 17x its current speed.
  const stopX = player.x + (player.vx / speed) * speed * 17
  const stopY = player.y + (player.vy / speed) * speed * 17
  const danger = Math.hypot(stopX - centerX, stopY - centerY) > arenaRadius

  ctx.save()
  ctx.globalAlpha = danger ? 0.85 : 0.3
  ctx.strokeStyle = danger ? '#ef4444' : '#e2e8f0'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(player.x, player.y)
  ctx.lineTo(stopX, stopY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(stopX, stopY, danger ? 9 : 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function clearTrails() {
  trailBuffers.clear()
}
