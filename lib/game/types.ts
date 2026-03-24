export interface Player {
  id: string
  name: string
  x: number
  y: number
  angle: number
  eliminated: boolean
}

export interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'roundEnd' | 'finished'
  players: Record<string, Player>
  winner?: string
  timeRemaining: number
  countdown: number
  arenaRadius: number
  tournamentRound: number
  totalRounds: number
  promotedPlayers: string[] // IDs of players who won their round (safe)
  roundWinner?: string // winner of the current round
  tournamentLoser?: string // the ultimate loser (loser of final 1v1)
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
}

export interface TrailPoint {
  x: number
  y: number
  angle: number
  alpha: number
}

export interface KillFeedEntry {
  name: string
  timestamp: number
}

export interface ScreenShake {
  offsetX: number
  offsetY: number
  intensity: number
  duration: number
  elapsed: number
}
