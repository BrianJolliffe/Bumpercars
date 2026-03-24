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
