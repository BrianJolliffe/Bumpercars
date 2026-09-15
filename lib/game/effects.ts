import { ScreenShake, KillFeedEntry, GameEvent } from './types'
import { spawnExplosion, spawnFlash, spawnImpactSparks, spawnShockwave, spawnDashPuff } from './particles'
import { playHit, playDash, playElimination } from './audio'

let shake: ScreenShake | null = null
let killFeed: KillFeedEntry[] = []
let pauseUntil = 0
let lastEventId = 0

interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  life: number
  size: number
}

let floatingTexts: FloatingText[] = []

export function triggerShake(intensity: number, duration: number) {
  // Never let a small hit cancel a bigger shake already in flight.
  if (shake && shake.intensity > intensity && shake.elapsed < shake.duration) return
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

function addFloatingText(x: number, y: number, text: string, color: string, size = 16) {
  floatingTexts.push({ x, y, text, color, life: 1, size })
  if (floatingTexts.length > 12) floatingTexts.shift()
}

export function updateFloatingTexts(dt: number) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i]
    t.y -= dt * 34
    t.life -= dt * 0.75
    if (t.life <= 0) floatingTexts.splice(i, 1)
  }
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D) {
  for (const t of floatingTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life * 1.4))
    ctx.fillStyle = t.color
    ctx.font = `900 ${t.size}px sans-serif`
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)'
    ctx.lineWidth = 3
    ctx.strokeText(t.text, t.x, t.y)
    ctx.fillText(t.text, t.x, t.y)
  }
  ctx.globalAlpha = 1
}

/**
 * Server-authored events drive every effect, so a knockout fires at the moment
 * the car crosses the line rather than whenever it happens to drift off-canvas.
 */
export function processEvents(events: GameEvent[], localPlayerId: string, colorFor: (id: string) => string) {
  for (const evt of events) {
    if (evt.id <= lastEventId) continue
    lastEventId = evt.id

    if (evt.type === 'hit') {
      spawnImpactSparks(evt.x, evt.y, evt.power)
      spawnShockwave(evt.x, evt.y, evt.power, evt.dashed ? '#f97316' : '#fbbf24')
      // Scale by power squared and skip the small stuff, so a late-round pile-up
      // doesn't become a constant clank that drowns out the hits that matter.
      if (evt.power > 0.25) triggerShake(evt.power * evt.power * 7, 0.1 + evt.power * 0.16)
      playHit(evt.power, evt.dashed)
    }

    if (evt.type === 'dash') {
      spawnDashPuff(evt.x, evt.y, evt.dx, evt.dy, colorFor(evt.playerId))
      playDash()
    }

    if (evt.type === 'elim') {
      spawnExplosion(evt.x, evt.y, evt.final ? 34 : 20, ['#f97316', '#ef4444', '#fbbf24', '#fde68a'])
      spawnFlash(evt.x, evt.y)
      spawnShockwave(evt.x, evt.y, 1, '#ef4444')
      triggerShake(evt.final ? 8 : 4.5, evt.final ? 0.55 : 0.3)
      playElimination(evt.final)

      const isLocal = evt.playerId === localPlayerId
      addFloatingText(
        evt.x,
        evt.y - 26,
        isLocal ? 'YOU ARE OUT!' : `${evt.name} OUT!`,
        isLocal ? '#f87171' : '#fca5a5',
        isLocal ? 20 : 15
      )

      if (evt.byName && evt.byX !== undefined && evt.byY !== undefined) {
        addFloatingText(evt.byX, evt.byY - 40, `+${evt.byBonus ?? 0} KO`, '#fbbf24', 17)
      }

      killFeed.push({ name: evt.name, byName: evt.byName, timestamp: performance.now() })
      if (killFeed.length > 5) killFeed.shift()

      if (evt.final) pauseUntil = performance.now() + 380
    }
  }
}

export function getKillFeed(): KillFeedEntry[] {
  const now = performance.now()
  killFeed = killFeed.filter((e) => now - e.timestamp < 3500)
  return killFeed
}

export function isPaused(): boolean {
  return performance.now() < pauseUntil
}

export function resetEffects() {
  shake = null
  killFeed = []
  floatingTexts = []
  pauseUntil = 0
  lastEventId = 0
}
