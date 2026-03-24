const PLAYER_COLORS = [
  { body: '#22c55e', accent: '#16a34a', light: '#86efac' },
  { body: '#f59e0b', accent: '#d97706', light: '#fcd34d' },
  { body: '#3b82f6', accent: '#2563eb', light: '#93c5fd' },
  { body: '#ef4444', accent: '#dc2626', light: '#fca5a5' },
  { body: '#a855f7', accent: '#9333ea', light: '#d8b4fe' },
  { body: '#ec4899', accent: '#db2777', light: '#f9a8d4' },
  { body: '#06b6d4', accent: '#0891b2', light: '#67e8f9' },
  { body: '#f97316', accent: '#ea580c', light: '#fdba74' },
  { body: '#84cc16', accent: '#65a30d', light: '#bef264' },
  { body: '#14b8a6', accent: '#0d9488', light: '#5eead4' },
  { body: '#e11d48', accent: '#be123c', light: '#fda4af' },
  { body: '#8b5cf6', accent: '#7c3aed', light: '#c4b5fd' },
  { body: '#0ea5e9', accent: '#0284c7', light: '#7dd3fc' },
  { body: '#d946ef', accent: '#c026d3', light: '#f0abfc' },
  { body: '#facc15', accent: '#eab308', light: '#fde68a' },
  { body: '#fb923c', accent: '#f97316', light: '#fed7aa' },
]

export function getPlayerColor(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

export function getPlayerColorByOrder(playerId: string, playerIds: string[]) {
  const sorted = [...playerIds].sort()
  const index = sorted.indexOf(playerId)
  return PLAYER_COLORS[index >= 0 ? index % PLAYER_COLORS.length : 0]
}
