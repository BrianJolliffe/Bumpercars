import { computeImpact, DEFAULT_IMPACT_TUNING } from '../lib/game/impact.ts'

// Asserting against the game's live tuning, so these can never drift apart.
const T = DEFAULT_IMPACT_TUNING
const car = (x, y, vx, vy, dashing = false, dashDir = { x: 1, y: 0 }) => ({ x, y, vx, vy, dashing, dashDir })
const r2 = (n) => Math.round(n * 100) / 100

/** Steady driving speed, from MOVE_FORCE / mass / frictionAir in bumpercar.ts. */
const TOP_SPEED = 8
/** Extra velocity a dash adds instantly. */
const DASH_SPEED = 7

let failures = 0
function check(name, cond, detail) {
  if (cond) console.log(`  PASS  ${name}`)
  else { failures++; console.log(`  FAIL  ${name} — ${detail}`) }
}

console.log('\n1. Symmetric head-on must be symmetric')
{
  const res = computeImpact(car(0, 0, TOP_SPEED, 0), car(44, 0, -TOP_SPEED, 0), T)
  check('both launched equally', r2(res.launchOnA) === r2(res.launchOnB), `A=${r2(res.launchOnA)} B=${r2(res.launchOnB)}`)
  check('impulses mirror', r2(res.impulseA.x) === -r2(res.impulseB.x), `A.x=${r2(res.impulseA.x)} B.x=${r2(res.impulseB.x)}`)
  check('each pushed away', res.impulseA.x < 0 && res.impulseB.x > 0, `A.x=${r2(res.impulseA.x)} B.x=${r2(res.impulseB.x)}`)
}

console.log('\n2. Argument order must not change the physics')
{
  const ab = computeImpact(car(0, 0, 6, 0), car(44, 0, -2, 0), T)
  const ba = computeImpact(car(44, 0, -2, 0), car(0, 0, 6, 0), T)
  check('swapped call mirrors', r2(ab.launchOnB) === r2(ba.launchOnA) && r2(ab.launchOnA) === r2(ba.launchOnB),
    `ab=(${r2(ab.launchOnA)},${r2(ab.launchOnB)}) ba=(${r2(ba.launchOnA)},${r2(ba.launchOnB)})`)
}

console.log('\n3. Ramming a parked car must launch it')
{
  const res = computeImpact(car(0, 0, TOP_SPEED, 0), car(44, 0, 0, 0), T)
  check('parked car is launched', res.impulseB.x > 3, `B.x=${r2(res.impulseB.x)}`)
  check('attacker only recoils a little', res.impulseA.x < 0 && Math.abs(res.impulseA.x) < res.impulseB.x * 0.7,
    `A.x=${r2(res.impulseA.x)} vs B.x=${r2(res.impulseB.x)}`)
  check('parked car takes no blame', res.launchOnA === 0, `launchOnA=${res.launchOnA}`)
}

console.log('\n4. Dash bonus must follow the dasher, not the argument slot')
{
  const aDash = computeImpact(car(0, 0, TOP_SPEED + DASH_SPEED, 0, true), car(44, 0, -1, 0), T)
  const bDash = computeImpact(car(0, 0, -1, 0), car(44, 0, -(TOP_SPEED + DASH_SPEED), 0, true, { x: -1, y: 0 }), T)
  const plain = computeImpact(car(0, 0, TOP_SPEED, 0), car(44, 0, -1, 0), T)
  check('dashing hits harder than driving', aDash.launchOnB > plain.launchOnB * 1.5,
    `dash=${r2(aDash.launchOnB)} plain=${r2(plain.launchOnB)}`)
  check('both dashers hit equally hard', r2(aDash.launchOnB) === r2(bDash.launchOnA),
    `${r2(aDash.launchOnB)} vs ${r2(bDash.launchOnA)}`)
}

console.log('\n5. Run-up must matter — a dash is not one flat outcome')
{
  const standing = computeImpact(car(0, 0, DASH_SPEED, 0, true), car(44, 0, 0, 0), T)
  const runUp = computeImpact(car(0, 0, TOP_SPEED + DASH_SPEED, 0, true), car(44, 0, 0, 0), T)
  check('full run-up beats a standing dash', runUp.launchOnB > standing.launchOnB * 1.5,
    `runUp=${r2(runUp.launchOnB)} standing=${r2(standing.launchOnB)}`)
}

console.log('\n6. Counter-dashing must reward the defender')
{
  // Same incoming dash both times; the only difference is whether B counters.
  const attacker = () => car(0, 0, TOP_SPEED + DASH_SPEED, 0, true)
  const undefended = computeImpact(attacker(), car(44, 0, -TOP_SPEED, 0), T)
  const countered = computeImpact(
    attacker(),
    car(44, 0, -TOP_SPEED, 0, true, { x: -1, y: 0 }),
    T
  )
  check('counter-dash cuts the launch the defender takes', countered.launchOnB < undefended.launchOnB * 0.7,
    `countered=${r2(countered.launchOnB)} undefended=${r2(undefended.launchOnB)}`)

  const mutual = computeImpact(
    attacker(),
    car(44, 0, -(TOP_SPEED + DASH_SPEED), 0, true, { x: -1, y: 0 }),
    T
  )
  check('dash-vs-dash stays symmetric', r2(mutual.launchOnA) === r2(mutual.launchOnB),
    `A=${r2(mutual.launchOnA)} B=${r2(mutual.launchOnB)}`)
}

console.log('\n7. Aimed dash must steer the launch')
{
  const res = computeImpact(car(0, 0, TOP_SPEED, 0, true, { x: 0, y: -1 }), car(44, 0, 0, 0), T)
  check('launch bends toward the aim', res.impulseB.y < -1.5, `B.y=${r2(res.impulseB.y)}`)
  const straight = computeImpact(car(0, 0, TOP_SPEED, 0, true, { x: 1, y: 0 }), car(44, 0, 0, 0), T)
  check('un-aimed dash stays on the normal', Math.abs(straight.impulseB.y) < 0.001, `B.y=${r2(straight.impulseB.y)}`)
}

console.log('\n8. Cars drifting apart must not register a hit')
{
  check('separating cars ignored', computeImpact(car(0, 0, -5, 0), car(44, 0, 5, 0), T) === null, 'expected null')
  check('gentle touch ignored', computeImpact(car(0, 0, 0.2, 0), car(44, 0, 0, 0), T) === null, 'expected null')
}

console.log('\n9. Rear-end: faster car behind launches the slower one forward')
{
  const res = computeImpact(car(0, 0, TOP_SPEED, 0), car(44, 0, 3, 0), T)
  check('victim pushed forward', res.impulseB.x > 0, `B.x=${r2(res.impulseB.x)}`)
  check('rear-ender takes no launch', res.launchOnA === 0, `launchOnA=${r2(res.launchOnA)}`)
}

console.log('\n10. Knockout range must stay inside the arena')
{
  // At frictionAir 0.055 a launch of speed v coasts about 17*v pixels.
  const hardest = computeImpact(car(0, 0, TOP_SPEED + DASH_SPEED, 0, true), car(44, 0, -TOP_SPEED, 0), T)
  const coast = hardest.launchOnB * 17
  check('hardest hit does not cross the whole arena', coast < 600, `coast=${Math.round(coast)}px`)
  check('hardest hit still threatens', coast > 220, `coast=${Math.round(coast)}px`)
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
