import { ScreenShake, KillFeedEntry } from './types'
import { spawnExplosion, spawnFlash } from './particles'

let shake: ScreenShake | null = null
let killFeed: KillFeedEntry[] = []
let eliminatedIds: Set<string> = new Set()
let pauseUntil = 0

export function triggerShake(intensity: number, duration: number) {
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

export function triggerElimination(
  playerName: string,
  x: number,
  y: number,
  isFinalKill: boolean
) {
  const explosionColors = ['#f97316', '#ef4444', '#fbbf24', '#fde68a']
  spawnExplosion(x, y, isFinalKill ? 30 : 18, explosionColors)
  spawnFlash(x, y)
  triggerShake(isFinalKill ? 6 : 3, isFinalKill ? 0.5 : 0.25)

  killFeed.push({ name: playerName, timestamp: performance.now() })
  if (killFeed.length > 5) killFeed.shift()

  if (isFinalKill) {
    pauseUntil = performance.now() + 500
  }
}

export function checkEliminations(
  players: Record<string, { id: string; name: string; x: number; y: number; eliminated: boolean }>,
  activePlayers: number
) {
  for (const player of Object.values(players)) {
    if (player.eliminated && !eliminatedIds.has(player.id)) {
      eliminatedIds.add(player.id)
      const isFinalKill = activePlayers <= 1
      triggerElimination(player.name, player.x, player.y, isFinalKill)
    }
  }
}

export function getKillFeed(): KillFeedEntry[] {
  const now = performance.now()
  killFeed = killFeed.filter((e) => now - e.timestamp < 3000)
  return killFeed
}

export function isPaused(): boolean {
  return performance.now() < pauseUntil
}

export function resetEffects() {
  shake = null
  killFeed = []
  eliminatedIds = new Set()
  pauseUntil = 0
}
