export interface Player {
  id: string
  name: string
  x: number
  y: number
  angle: number
  vx: number
  vy: number
  eliminated: boolean
  isBot: boolean
  /** Total tournament points across all rounds so far. */
  score: number
  /** Points earned in the round that just finished (0 while a round is live). */
  roundPoints: number
  /** Knockouts landed this round. */
  kills: number
  /** Knockouts across the whole league, used to break score ties. */
  totalKills: number
  /** Who this player, once eliminated, called to win the round. */
  prediction?: string
  /** 0 = just used, 1 = ready. */
  dashCharge: number
  /** True for the brief window where this car is a battering ram. */
  dashing: boolean
  /** True while outside the ring and still able to recover. */
  outOfBounds: boolean
  /** 1 = safe, counting down to 0 as the recovery window runs out. */
  recovery: number
  /** Revenge bonuses banked this round. */
  revenge: number
  /** Who knocked this car out, so revenge can be paid if they follow it. */
  eliminatedBy?: string
  /** Fixed palette slot, assigned once on join so colours never reshuffle. */
  colorIndex: number
}

export interface Obstacle {
  x: number
  y: number
  radius: number
}

export type GameEvent =
  | { id: number; type: 'hit'; x: number; y: number; power: number; dashed: boolean }
  | { id: number; type: 'dash'; x: number; y: number; dx: number; dy: number; playerId: string }
  | {
      id: number
      type: 'elim'
      x: number
      y: number
      playerId: string
      name: string
      byName?: string
      byBonus?: number
      byId?: string
      byX?: number
      byY?: number
      final: boolean
    }

export interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'roundEnd' | 'finished'
  players: Record<string, Player>
  /** The arena drifts, so this is the live centre of the ring, not the canvas. */
  centerX: number
  centerY: number
  obstacles: Obstacle[]
  /** Whoever controls the lobby. The invite is a public link, so this matters. */
  hostId?: string
  timeRemaining: number
  suddenDeath: boolean
  countdown: number
  arenaRadius: number
  round: number
  totalRounds: number
  /** Rolling buffer of recent effect events; clients dedupe on `id`. */
  events: GameEvent[]
  /** Last player standing in the round that just ended. */
  roundSurvivor?: string
  champion?: string
  ultimateLoser?: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  kind: 'spark' | 'flash' | 'ring' | 'smoke'
}

export interface TrailPoint {
  x: number
  y: number
  angle: number
  alpha: number
}

export interface KillFeedEntry {
  name: string
  byName?: string
  timestamp: number
}

export interface ScreenShake {
  offsetX: number
  offsetY: number
  intensity: number
  duration: number
  elapsed: number
}
