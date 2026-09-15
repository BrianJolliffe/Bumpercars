/**
 * Car-on-car impact resolution, kept pure and free of Matter.js so it can be
 * reasoned about and tested on its own.
 *
 * The rule that matters: each car's aggression is its OWN velocity along the
 * contact normal, never the relative closing speed. Relative closing speed is a
 * single number shared by both cars, so using it to pick an "attacker" silently
 * hands every mutual head-on to whichever car the physics engine happened to
 * list first. Measuring each car separately makes a symmetric crash symmetric
 * and makes a counter-dash a genuine read.
 */

export interface ImpactBody {
  x: number
  y: number
  vx: number
  vy: number
  dashing: boolean
  /** Unit vector the car's in-flight dash was aimed along. */
  dashDir: { x: number; y: number }
}

export interface ImpactTuning {
  launch: number
  recoil: number
  dashAttackBonus: number
  dashDefence: number
  dashAimBlend: number
  minApproach: number
}

/**
 * Live tuning. The server uses this directly and the tests assert against it, so
 * the numbers can never drift apart from what the game actually plays like.
 *
 * These are balanced against the car's air friction: at frictionAir 0.055 a car
 * launched at speed v coasts roughly 17*v pixels, so small changes here move
 * knockout range a long way.
 */
export const DEFAULT_IMPACT_TUNING: ImpactTuning = {
  launch: 0.85,
  recoil: 0.3,
  dashAttackBonus: 1.35,
  dashDefence: 0.55,
  dashAimBlend: 0.5,
  minApproach: 0.6,
}

export interface ImpactResult {
  impulseA: { x: number; y: number }
  impulseB: { x: number; y: number }
  /** Launch magnitude each car receives, before any speed cap. */
  launchOnA: number
  launchOnB: number
  /** Each car's own closing speed along the normal. */
  approachA: number
  approachB: number
  /** Midpoint of the contact, for effects. */
  x: number
  y: number
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y)
  if (len < 1e-6) return { x: 0, y: 0 }
  return { x: x / len, y: y / len }
}

function blendDirection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  bias: number
): { x: number; y: number } {
  const blended = normalize(a.x * (1 - bias) + b.x * bias, a.y * (1 - bias) + b.y * bias)
  return blended.x === 0 && blended.y === 0 ? a : blended
}

export function computeImpact(a: ImpactBody, b: ImpactBody, t: ImpactTuning): ImpactResult | null {
  // Normal points from A toward B.
  const n = normalize(b.x - a.x, b.y - a.y)
  if (n.x === 0 && n.y === 0) return null

  // How hard each car is driving into the other, measured independently.
  const approachA = Math.max(0, a.vx * n.x + a.vy * n.y)
  const approachB = Math.max(0, -(b.vx * n.x + b.vy * n.y))
  if (approachA + approachB < t.minApproach) return null

  const launchOnB =
    approachA * t.launch * (a.dashing ? t.dashAttackBonus : 1) * (b.dashing ? t.dashDefence : 1)
  const launchOnA =
    approachB * t.launch * (b.dashing ? t.dashAttackBonus : 1) * (a.dashing ? t.dashDefence : 1)

  // A dash sends its victim where the dasher aimed, not merely along the normal,
  // so lining a hit up toward the edge is a skill that pays.
  const away = { x: -n.x, y: -n.y }
  const dirOnB = a.dashing ? blendDirection(n, a.dashDir, t.dashAimBlend) : n
  const dirOnA = b.dashing ? blendDirection(away, b.dashDir, t.dashAimBlend) : away

  return {
    // Each car also recoils off its own aggression, so ramming costs some speed.
    impulseB: {
      x: dirOnB.x * launchOnB + n.x * approachB * t.recoil,
      y: dirOnB.y * launchOnB + n.y * approachB * t.recoil,
    },
    impulseA: {
      x: dirOnA.x * launchOnA - n.x * approachA * t.recoil,
      y: dirOnA.y * launchOnA - n.y * approachA * t.recoil,
    },
    launchOnA,
    launchOnB,
    approachA,
    approachB,
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}
