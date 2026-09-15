export interface PlayerColor {
  body: string
  accent: string
  light: string
}

/**
 * Every car keeps its own colour for the whole match — you are identified by a
 * white ring and a YOU label, not by being recoloured, so nobody loses their
 * identity in the scoreboard.
 */
const PLAYER_COLORS: PlayerColor[] = [
  { body: '#22c55e', accent: '#15803d', light: '#86efac' },
  { body: '#f59e0b', accent: '#b45309', light: '#fcd34d' },
  { body: '#3b82f6', accent: '#1d4ed8', light: '#93c5fd' },
  { body: '#ef4444', accent: '#b91c1c', light: '#fca5a5' },
  { body: '#a855f7', accent: '#7e22ce', light: '#d8b4fe' },
  { body: '#ec4899', accent: '#be185d', light: '#f9a8d4' },
  { body: '#06b6d4', accent: '#0e7490', light: '#67e8f9' },
  { body: '#f97316', accent: '#c2410c', light: '#fdba74' },
  { body: '#84cc16', accent: '#4d7c0f', light: '#bef264' },
  { body: '#14b8a6', accent: '#0f766e', light: '#5eead4' },
  { body: '#e11d48', accent: '#9f1239', light: '#fda4af' },
  { body: '#8b5cf6', accent: '#6d28d9', light: '#c4b5fd' },
  { body: '#0ea5e9', accent: '#0369a1', light: '#7dd3fc' },
  { body: '#d946ef', accent: '#a21caf', light: '#f0abfc' },
  { body: '#facc15', accent: '#a16207', light: '#fde68a' },
  { body: '#fb923c', accent: '#ea580c', light: '#fed7aa' },
]

/** Colour of the "this is you" ring, arrow and label — never used as a car body. */
export const LOCAL_HIGHLIGHT = '#ffffff'

/**
 * Colour comes from the slot the server assigned on join, never from the
 * current roster order — otherwise one person joining or leaving repaints
 * every car mid-round.
 */
export function getPlayerColor(colorIndex: number): PlayerColor {
  const i = Number.isFinite(colorIndex) && colorIndex >= 0 ? colorIndex : 0
  return PLAYER_COLORS[i % PLAYER_COLORS.length]
}

/** Body colour as a hex string, for React-rendered UI outside the canvas. */
export function getPlayerHex(colorIndex: number): string {
  return getPlayerColor(colorIndex).body
}
