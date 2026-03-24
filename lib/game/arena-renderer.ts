const CENTER_X = 400
const CENTER_Y = 400

export function drawArena(
  ctx: CanvasRenderingContext2D,
  arenaRadius: number,
  timeRemaining: number,
  canvasSize: number,
  frameTime: number
) {
  const elapsed = 30 - timeRemaining
  const progress = elapsed / 30

  // Background grid
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  for (let i = 0; i <= canvasSize; i += 50) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvasSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvasSize, i)
    ctx.stroke()
  }

  // Darken outside arena
  const darkness = 0.3 + progress * 0.6
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvasSize, canvasSize)
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
  ctx.fill()
  ctx.restore()

  // Danger zone — red gradient band inside the edge
  const dangerIntensity = 0.1 + progress * 0.5
  const dangerWidth = 40
  const gradient = ctx.createRadialGradient(
    CENTER_X, CENTER_Y, Math.max(0, arenaRadius - dangerWidth),
    CENTER_X, CENTER_Y, arenaRadius
  )
  gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
  gradient.addColorStop(1, `rgba(239, 68, 68, ${dangerIntensity})`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing boundary
  const pulseSpeed = 1 + progress * 2
  const pulse = Math.sin(frameTime * pulseSpeed * Math.PI * 2) * 0.5 + 0.5
  const borderWidth = 2 + pulse * 2
  const borderAlpha = 0.6 + pulse * 0.4

  // Warning flash at 20s, 10s, 5s
  let flashMultiplier = 1
  if (timeRemaining <= 20.3 && timeRemaining > 19.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }
  if (timeRemaining <= 10.3 && timeRemaining > 9.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }
  if (timeRemaining <= 5.3 && timeRemaining > 4.7) {
    flashMultiplier = Math.sin(frameTime * 20) > 0 ? 2 : 1
  }

  const isWarning = flashMultiplier > 1
  ctx.strokeStyle = isWarning ? '#ef4444' : '#fbbf24'
  ctx.lineWidth = borderWidth * flashMultiplier
  ctx.globalAlpha = borderAlpha
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, arenaRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}
