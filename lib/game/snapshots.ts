import { GameState, Player } from './types'

/**
 * The server broadcasts at 30Hz. Rendering the newest snapshot directly makes
 * cars jump tens of pixels a frame, so we render slightly in the past and
 * interpolate between the two snapshots bracketing that moment.
 *
 * Remote cars are drawn on this one delayed clock so contact lines up. The local
 * car is the exception, and is predicted forward from live input in
 * lib/game/prediction.ts — naive extrapolation was wrong because it ignored what
 * the player was actually pressing; running the real integration is not.
 */
export const RENDER_DELAY_MS = 55

interface Snapshot {
  state: GameState
  t: number
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f
}

function lerpAngle(a: number, b: number, f: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * f
}

export class SnapshotBuffer {
  private buf: Snapshot[] = []

  push(state: GameState) {
    this.buf.push({ state, t: performance.now() })
    if (this.buf.length > 24) this.buf.shift()
  }

  clear() {
    this.buf = []
  }

  newest(): GameState | null {
    return this.buf.length ? this.buf[this.buf.length - 1].state : null
  }

  /** A view of the world at `now`, ready to draw. */
  sample(now: number): GameState | null {
    if (this.buf.length === 0) return null
    if (this.buf.length === 1) return { ...this.buf[0].state, players: { ...this.buf[0].state.players } }

    const renderTime = now - RENDER_DELAY_MS

    let older = this.buf[0]
    let newer = this.buf[1]
    for (let i = this.buf.length - 1; i > 0; i--) {
      if (this.buf[i - 1].t <= renderTime) {
        older = this.buf[i - 1]
        newer = this.buf[i]
        break
      }
    }

    const span = newer.t - older.t
    const f = span > 0 ? Math.max(0, Math.min(1, (renderTime - older.t) / span)) : 1

    const players: Record<string, Player> = {}
    for (const [id, target] of Object.entries(newer.state.players)) {
      const from = older.state.players[id]

      if (!from) {
        players[id] = { ...target }
        continue
      }

      players[id] = {
        ...target,
        x: lerp(from.x, target.x, f),
        y: lerp(from.y, target.y, f),
        angle: lerpAngle(from.angle, target.angle, f),
      }
    }

    return {
      ...newer.state,
      players,
      arenaRadius: lerp(older.state.arenaRadius, newer.state.arenaRadius, f),
      centerX: lerp(older.state.centerX, newer.state.centerX, f),
      centerY: lerp(older.state.centerY, newer.state.centerY, f),
      timeRemaining: lerp(older.state.timeRemaining, newer.state.timeRemaining, f),
    }
  }
}
