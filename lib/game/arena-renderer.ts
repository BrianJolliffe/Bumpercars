import { Obstacle } from './types'

const START_RADIUS = 300

export function drawArena(
  ctx: CanvasRenderingContext2D,
  arenaRadius: number,
  centerX: number,
  centerY: number,
  obstacles: Obstacle[],
  canvasSize: number,
  frameTime: number,
  suddenDeath: boolean
) {
  const CENTER_X = centerX
  const CENTER_Y = centerY
  // Progress tracks how far the floor has closed in, not the clock — sudden
  // death keeps shrinking after the timer hits zero.
  const progress = Math.min(1, (START_RADIUS - arenaRadius) / (START_RADIUS - 60))

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

  // Floor inside the ring, so the playable area reads as solid ground.
  const floor = ctx.createRadialGradient(CENTER_X, CENTER_Y, 0, CENTER_X, CENTER_Y, arenaRadius)
  floor.addColorStop(0, '#1e293b')
  floor.addColorStop(0.75, '#172033')
  floor.addColorStop(1, '#0f172a')
  ctx.fillStyle = floor
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.fill()

  const darkness = 0.35 + progress * 0.55
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvasSize, canvasSize)
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
  ctx.fill()
  ctx.restore()

  const dangerIntensity = (0.12 + progress * 0.5) * (suddenDeath ? 1.5 : 1)
  const dangerWidth = 40
  const gradient = ctx.createRadialGradient(
    CENTER_X,
    CENTER_Y,
    Math.max(0, arenaRadius - dangerWidth),
    CENTER_X,
    CENTER_Y,
    arenaRadius
  )
  gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
  gradient.addColorStop(1, `rgba(239, 68, 68, ${Math.min(0.85, dangerIntensity)})`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.fill()

  const pulseSpeed = suddenDeath ? 5 : 1 + progress * 2
  const pulse = Math.sin(frameTime * pulseSpeed * Math.PI * 2) * 0.5 + 0.5

  ctx.save()
  ctx.strokeStyle = suddenDeath ? '#ef4444' : '#fbbf24'
  ctx.shadowColor = suddenDeath ? '#ef4444' : '#fbbf24'
  ctx.shadowBlur = 12 + pulse * 18
  ctx.lineWidth = (suddenDeath ? 4 : 2.5) + pulse * 2.5
  ctx.globalAlpha = 0.7 + pulse * 0.3
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  drawObstacles(ctx, obstacles)
}

/** Solid pillars you can ricochet opponents off — or get pinned against. */
function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
  for (const o of obstacles) {
    const gradient = ctx.createRadialGradient(
      o.x - o.radius * 0.3,
      o.y - o.radius * 0.3,
      o.radius * 0.2,
      o.x,
      o.y,
      o.radius
    )
    gradient.addColorStop(0, '#64748b')
    gradient.addColorStop(1, '#334155')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Hazard stripes so a pillar never reads as part of the floor.
    ctx.save()
    ctx.beginPath()
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
    ctx.clip()
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'
    ctx.lineWidth = 5
    for (let i = -o.radius * 2; i < o.radius * 2; i += 14) {
      ctx.beginPath()
      ctx.moveTo(o.x + i, o.y - o.radius)
      ctx.lineTo(o.x + i + o.radius * 2, o.y + o.radius)
      ctx.stroke()
    }
    ctx.restore()
  }
}
