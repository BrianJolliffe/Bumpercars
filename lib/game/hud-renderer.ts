import { Player, KillFeedEntry } from './types'
import { getPlayerColor } from './colors'

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  timeRemaining: number,
  suddenDeath: boolean,
  players: Record<string, Player>,
  playerId: string,
  killFeed: KillFeedEntry[],
  canvasSize: number,
  frameTime: number
) {
  const allPlayers = Object.values(players)
  const alive = allPlayers.filter((p) => !p.eliminated)
  const isUrgent = timeRemaining <= 10

  // Timer / sudden-death banner — top centre, the only clock on screen.
  if (suddenDeath) {
    const flash = Math.sin(frameTime * 9) * 0.5 + 0.5
    ctx.fillStyle = `rgba(239, 68, 68, ${0.65 + flash * 0.35})`
    ctx.font = '900 30px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SUDDEN DEATH', canvasSize / 2, 40)
  } else {
    const pulse = isUrgent ? Math.sin(frameTime * 6) * 0.3 + 0.7 : 1
    const size = isUrgent ? 30 + Math.sin(frameTime * 6) * 4 : 30
    ctx.fillStyle = isUrgent ? `rgba(239, 68, 68, ${pulse})` : '#fbbf24'
    ctx.font = `bold ${size}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(`${timeRemaining.toFixed(1)}s`, canvasSize / 2, 40)
  }

  // Alive pips, coloured to match each car.
  const pipStartX = 20
  const pipY = 26
  const pipRadius = 5.5
  const pipSpacing = 15
  allPlayers.forEach((p, i) => {
    const px = pipStartX + i * pipSpacing
    const color = getPlayerColor(p.colorIndex)
    ctx.beginPath()
    ctx.arc(px, pipY, pipRadius, 0, Math.PI * 2)
    if (p.eliminated) {
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      ctx.fillStyle = color.body
      ctx.fill()
      if (p.id === playerId) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  })

  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${alive.length} ALIVE`, pipStartX, pipY + 19)

  // Kill feed, with credit where a knockout was actually landed.
  const now = performance.now()
  killFeed.forEach((entry, i) => {
    const age = (now - entry.timestamp) / 3500
    ctx.globalAlpha = Math.max(0, 1 - age)
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'right'
    if (entry.byName) {
      ctx.fillStyle = '#fbbf24'
      ctx.fillText(`${entry.byName} launched ${entry.name}`, canvasSize - 20, 30 + i * 20)
    } else {
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`${entry.name} fell out`, canvasSize - 20, 30 + i * 20)
    }
  })
  ctx.globalAlpha = 1

  const me = players[playerId]
  if (me && me.outOfBounds && !me.eliminated) {
    const flash = Math.sin(frameTime * 16) * 0.5 + 0.5
    ctx.fillStyle = `rgba(248, 113, 113, ${0.6 + flash * 0.4})`
    ctx.font = '900 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GET BACK IN!', canvasSize / 2, canvasSize / 2 - 120)
  }

  drawDashMeter(ctx, me, canvasSize, frameTime)
}

function drawDashMeter(
  ctx: CanvasRenderingContext2D,
  me: Player | undefined,
  canvasSize: number,
  frameTime: number
) {
  if (!me || me.eliminated) return

  const width = 180
  const height = 12
  const x = canvasSize / 2 - width / 2
  const y = canvasSize - 40
  const ready = me.dashCharge >= 1

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 6)
  ctx.fill()
  ctx.stroke()

  const pulse = ready ? Math.sin(frameTime * 4) * 0.15 + 0.85 : 1
  ctx.fillStyle = ready ? `rgba(251, 146, 60, ${pulse})` : '#78716c'
  ctx.beginPath()
  ctx.roundRect(x + 2, y + 2, (width - 4) * me.dashCharge, height - 4, 4)
  ctx.fill()

  ctx.fillStyle = ready ? '#fdba74' : '#64748b'
  ctx.font = '900 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(ready ? 'SPACE — DASH READY' : 'DASH RECHARGING', canvasSize / 2, y - 6)
}
