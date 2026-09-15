import { Particle } from './types'

let particles: Particle[] = []

const MAX_PARTICLES = 400

function push(p: Particle) {
  if (particles.length >= MAX_PARTICLES) particles.shift()
  particles.push(p)
}

export function spawnExplosion(x: number, y: number, count: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 5
    push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
      kind: 'spark',
    })
  }
  for (let i = 0; i < Math.floor(count / 3); i++) {
    const angle = Math.random() * Math.PI * 2
    push({
      x,
      y,
      vx: Math.cos(angle) * 0.7,
      vy: Math.sin(angle) * 0.7,
      life: 1,
      maxLife: 1,
      color: '#475569',
      size: 10 + Math.random() * 14,
      kind: 'smoke',
    })
  }
}

export function spawnFlash(x: number, y: number) {
  push({ x, y, vx: 0, vy: 0, life: 1, maxLife: 1, color: '#ffffff', size: 40, kind: 'flash' })
}

/** Expanding ring — reads as a shockwave at the point of contact. */
export function spawnShockwave(x: number, y: number, power: number, color = '#fbbf24') {
  push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 1,
    maxLife: 1,
    color,
    size: 14 + power * 46,
    kind: 'ring',
  })
}

/** Small directional spray thrown off by a collision. */
export function spawnImpactSparks(x: number, y: number, power: number) {
  const count = 4 + Math.floor(power * 14)
  const colors = ['#fde68a', '#fbbf24', '#f97316', '#ffffff']
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (0.8 + Math.random() * 3.5) * (0.5 + power)
    push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 3,
      kind: 'spark',
    })
  }
}

/** Exhaust puff kicked out behind a dashing car. */
export function spawnDashPuff(x: number, y: number, dx: number, dy: number, color: string) {
  for (let i = 0; i < 12; i++) {
    const spread = (Math.random() - 0.5) * 1.1
    const cos = Math.cos(spread)
    const sin = Math.sin(spread)
    const bx = -dx * cos + dy * sin
    const by = -dy * cos - dx * sin
    const speed = 1 + Math.random() * 3
    push({
      x: x - dx * 14,
      y: y - dy * 14,
      vx: bx * speed,
      vy: by * speed,
      life: 1,
      maxLife: 1,
      color: Math.random() > 0.5 ? color : '#e2e8f0',
      size: 2 + Math.random() * 4,
      kind: 'spark',
    })
  }
  spawnShockwave(x, y, 0.25, color)
}

export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    if (p.kind === 'smoke') {
      p.vx *= 0.94
      p.vy *= 0.94
      p.size += dt * 22
      p.life -= dt * 1.1
    } else if (p.kind === 'ring') {
      p.life -= dt * 2.6
    } else if (p.kind === 'flash') {
      p.life -= dt * 5
    } else {
      p.vx *= 0.95
      p.vy *= 0.95
      p.life -= dt * 1.8
    }
    if (p.life <= 0) particles.splice(i, 1)
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)

    if (p.kind === 'ring') {
      const radius = p.size * (1 - alpha) + 6
      ctx.globalAlpha = alpha * 0.8
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1 + alpha * 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      continue
    }

    if (p.kind === 'flash') {
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 - alpha) * 3, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    if (p.kind === 'smoke') {
      ctx.globalAlpha = alpha * 0.35
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function clearParticles() {
  particles = []
}
