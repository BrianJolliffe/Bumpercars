import type * as Party from 'partykit/server'
import * as Matter from 'matter-js'
import { computeImpact, DEFAULT_IMPACT_TUNING } from '../lib/game/impact'

const { Engine, World, Bodies, Body, Events } = Matter

const CENTER_X = 400
const CENTER_Y = 400
const START_RADIUS = 300
const END_RADIUS = 60
const MIN_RADIUS = 12
const ROUND_TIME = 30
const HARD_ROUND_CAP = 50
const CAR_RADIUS = 22
const MOVE_FORCE = 0.0024
const DASH_SPEED = 7
const DASH_DURATION = 180
const DASH_COOLDOWN = 2000
const TOTAL_ROUNDS = 5
const KILL_BONUS = 5

/** Impact tuning. Launch is applied along the contact normal, scaled by closing speed. */
/** Ceiling on post-impact speed, so nothing gets fired clean off the map. */
const MAX_LAUNCH_SPEED = 16
const PAIR_COOLDOWN = 140
/**
 * Grace period after being hit during which an elimination is credited.
 *
 * This has to cover the whole knockout, not just the impact: a launched car
 * coasts for up to ~1.5s and then burns the full out-of-bounds recovery window
 * before it is actually out. Too short and every genuine knockout is recorded as
 * the victim having driven themselves out, which silently kills the kill bonus.
 */
const KILL_CREDIT_WINDOW = 3500
/**
 * Crossing the line is not instant death — you get this long to claw your way
 * back in. Turns a big hit into a scramble instead of a full stop.
 */
const OUT_OF_BOUNDS_GRACE = 900
/** The ring is the killer in sudden death, so the scramble window tightens. */
const SUDDEN_DEATH_GRACE = 350
/** Sudden death holds a small ring for a real showdown before closing it. */
const SUDDEN_DEATH_HOLD = 4.5
/**
 * Cars spawn on a ring and converge, so without this the opening pile-up can
 * end a round in three seconds. Nobody is eliminated this early — the first
 * exchange knocks people around instead of knocking them out.
 */
const ELIMINATION_GRACE = 1.5
/**
 * Physics steps a bot looks ahead along its own velocity. Without this they
 * steer by where they are rather than where they're going, and a car with real
 * momentum simply coasts out of the arena on its own.
 */
const BOT_LOOKAHEAD = 14
/** How far out a bot starts steering around a pillar. */
const BOT_OBSTACLE_CLEARANCE = 70
/**
 * Bumper cars are about the run-up. Left to chase the nearest opponent, bots
 * converge into a slow scrum and grind — hundreds of contacts, none of them
 * hard enough to launch anyone. Inside this range with no dash ready, a bot
 * peels off to rebuild speed instead of pushing.
 */
const BOT_GRIND_RANGE = 78
const BOT_REGROUP_MS = 700
/** Only a genuine hit earns a knockout; a nudge is not a kill. */
const KILL_CREDIT_MIN_LAUNCH = 3
/** Below this the impact is real physics but not worth a spark and a thud. */
const EVENT_MIN_LAUNCH = 1.2
/** The final round is worth more, but not enough to erase four rounds of play. */
const FINAL_ROUND_MULTIPLIER = 1.5
/** The ring wanders, so no fixed point on the canvas is ever safe. */
const DRIFT_SPEED = 50
const DRIFT_RETARGET_MIN = 4000
const DRIFT_RETARGET_MAX = 6500
const DRIFT_MAX_OFFSET = 180
/** Calling the round's survivor from the sidelines pays, so being out still has stakes. */
const SPECTATOR_BONUS = 2

/** Being knocked out by someone who is later knocked out themselves pays. */
const REVENGE_BONUS = 3

const IMPACT_TUNING = DEFAULT_IMPACT_TUNING

interface Player {
  id: string
  name: string
  x: number
  y: number
  angle: number
  vx: number
  vy: number
  eliminated: boolean
  isBot: boolean
  score: number
  roundPoints: number
  kills: number
  /** Knockouts across the whole league, used to break score ties. */
  totalKills: number
  dashCharge: number
  dashing: boolean
  /** True while outside the ring and still able to recover. */
  outOfBounds: boolean
  /** 1 = safe, counting down to 0 as the recovery window runs out. */
  recovery: number
  /** Revenge bonuses banked this round. */
  revenge: number
  /** Who knocked this car out, so revenge can be paid if they follow it. */
  eliminatedBy?: string
  /** Who this player, once eliminated, called to win the round. */
  prediction?: string
  /** Fixed palette slot, assigned once on join so colours never reshuffle. */
  colorIndex: number
}

type GameEvent =
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

/** Distributive omit, so each event variant keeps its own shape when `id` is stripped. */
type WithoutId<T> = T extends { id: number } ? Omit<T, 'id'> : never
type NewGameEvent = WithoutId<GameEvent>

interface Obstacle {
  x: number
  y: number
  radius: number
}

interface GameState {
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
  events: GameEvent[]
  roundSurvivor?: string
  champion?: string
  ultimateLoser?: string
}

interface Keys {
  w: boolean
  a: boolean
  s: boolean
  d: boolean
}

/** How fast thrust swings toward new input. Below 1 the car has a turning radius. */
const STEER_RATE = 0.2

/** Steering vector, magnitude 0..1. Keyboard sends unit vectors; touch is analog. */
interface InputDir {
  x: number
  y: number
}

interface Runtime {
  socket: Party.Connection | null
  body: Matter.Body
  isBot: boolean
  /** False for a mid-round joiner whose car isn't in the world yet. */
  inWorld: boolean
  keys: Keys
  dir: InputDir
  /** Thrust direction, which lags behind `dir` so the car has to turn. */
  steer: InputDir
  dashUntil: number
  dashReadyAt: number
  /** Direction of the dash in flight, used to aim its launch. */
  dashDir: { x: number; y: number }
  /** Smoothed steering vector, so bots drive instead of vibrating. */
  botAim: { x: number; y: number }
  /** While set, this bot is backing off to line up another run. */
  regroupUntil: number
  botSkill: number
  /** How far through the recovery window this car is; 0 while safely inside. */
  outsideProgress: number
  lastHitBy?: { id: string; at: number; launch: number }
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y)
  if (len < 1e-6) return { x: 0, y: 0 }
  return { x: x / len, y: y / len }
}

/** Shortest-path angular step, so a car knocked backwards turns the short way round. */
function approachAngle(current: number, target: number, rate: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * rate
}

export default class BumperCarParty implements Party.Server {
  engine: Matter.Engine
  gameState: GameState
  players: Map<string, Runtime>
  gameLoop: ReturnType<typeof setInterval> | null = null
  countdownTimer: ReturnType<typeof setInterval> | null = null
  nextRoundTimer: ReturnType<typeof setTimeout> | null = null

  eventId = 0
  obstacleBodies: Matter.Body[] = []
  driftTarget: { x: number; y: number } | null = null
  driftRetargetAt = 0
  /** Order players left the arena this round; drives placement points. */
  eliminationOrder: string[] = []
  pairCooldowns: Map<string, number> = new Map()
  roundEndingAt = 0
  frameCount = 0

  constructor(public room: Party.Room) {
    this.engine = Engine.create()
    this.engine.gravity.y = 0
    this.engine.gravity.x = 0

    this.gameState = {
      status: 'waiting',
      players: {},
      centerX: CENTER_X,
      centerY: CENTER_Y,
      obstacles: [],
      timeRemaining: ROUND_TIME,
      suddenDeath: false,
      countdown: 0,
      arenaRadius: START_RADIUS,
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      events: [],
    }

    this.players = new Map()

    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.label === 'car' && pair.bodyB.label === 'car') {
          this.resolveImpact(pair.bodyA, pair.bodyB)
        }
      }
    })
  }

  // ---------------------------------------------------------------- impacts

  /**
   * Resolve a car-on-car impact. The maths lives in lib/game/impact.ts so it can
   * be tested without a physics engine; this method only wires it to Matter.
   */
  resolveImpact(bodyA: Matter.Body, bodyB: Matter.Body) {
    const idA = this.idForBody(bodyA)
    const idB = this.idForBody(bodyB)
    if (!idA || !idB) return

    const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
    const now = Date.now()
    const last = this.pairCooldowns.get(key) ?? 0
    if (now - last < PAIR_COOLDOWN) return

    const rtA = this.players.get(idA)!
    const rtB = this.players.get(idB)!

    const impact = computeImpact(
      {
        x: bodyA.position.x,
        y: bodyA.position.y,
        vx: bodyA.velocity.x,
        vy: bodyA.velocity.y,
        dashing: now < rtA.dashUntil,
        dashDir: rtA.dashDir,
      },
      {
        x: bodyB.position.x,
        y: bodyB.position.y,
        vx: bodyB.velocity.x,
        vy: bodyB.velocity.y,
        dashing: now < rtB.dashUntil,
        dashDir: rtB.dashDir,
      },
      IMPACT_TUNING
    )
    if (!impact) return

    this.pairCooldowns.set(key, now)
    this.applyImpulse(bodyB, impact.impulseB)
    this.applyImpulse(bodyA, impact.impulseA)

    // Credit only real hits, so a graze can't steal a knockout.
    if (impact.launchOnB > EVENT_MIN_LAUNCH)
      rtB.lastHitBy = { id: idA, at: now, launch: impact.launchOnB }
    if (impact.launchOnA > EVENT_MIN_LAUNCH)
      rtA.lastHitBy = { id: idB, at: now, launch: impact.launchOnA }

    const power = Math.max(impact.launchOnA, impact.launchOnB)
    if (power < EVENT_MIN_LAUNCH) return
    this.pushEvent({
      type: 'hit',
      x: impact.x,
      y: impact.y,
      power: Math.min(1, power / 14),
      dashed: now < rtA.dashUntil || now < rtB.dashUntil,
    })
  }

  /** Add to a body's velocity, capped so nothing gets fired clean off the map. */
  applyImpulse(body: Matter.Body, impulse: { x: number; y: number }) {
    const x = body.velocity.x + impulse.x
    const y = body.velocity.y + impulse.y
    const speed = Math.hypot(x, y)
    const scale = speed > MAX_LAUNCH_SPEED ? MAX_LAUNCH_SPEED / speed : 1
    Body.setVelocity(body, { x: x * scale, y: y * scale })
  }

  idForBody(body: Matter.Body): string | undefined {
    for (const [id, rt] of this.players) {
      if (rt.body === body) return id
    }
    return undefined
  }

  pushEvent(evt: NewGameEvent) {
    this.eventId++
    this.gameState.events.push({ ...evt, id: this.eventId } as GameEvent)
    if (this.gameState.events.length > 40) this.gameState.events.shift()
  }

  // ------------------------------------------------------------ connections

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = conn.id
    const url = new URL(ctx.request.url)
    const playerName = url.searchParams.get('name') || `Player ${this.players.size + 1}`

    // Only put the car in the world if a round isn't live — otherwise it would
    // sit at dead centre as an invisible obstacle until the next round respawns it.
    const body = this.makeCar(CENTER_X, CENTER_Y)
    const inWorld = this.gameState.status === 'waiting'
    if (inWorld) World.add(this.engine.world, body)

    this.players.set(playerId, {
      socket: conn,
      body,
      isBot: false,
      inWorld,
      keys: { w: false, a: false, s: false, d: false },
      dir: { x: 0, y: 0 },
      steer: { x: 0, y: 0 },
      dashUntil: 0,
      dashReadyAt: 0,
      dashDir: { x: 1, y: 0 },
      botAim: { x: 0, y: 0 },
      regroupUntil: 0,
      botSkill: 1,
      outsideProgress: 0,
    })

    // Anyone joining mid-round sits out until the next one starts.
    this.gameState.players[playerId] = this.blankPlayer(playerId, playerName, false)
    if (this.gameState.status !== 'waiting') {
      this.gameState.players[playerId].eliminated = true
    }

    this.gameState.hostId = this.hostId()
    conn.send(JSON.stringify({ type: 'init', playerId, gameState: this.gameState }))
    this.broadcastGameState()
  }

  /** The longest-present human. Only they can start, restart, or add bots. */
  hostId(): string | undefined {
    for (const [id, rt] of this.players) {
      if (!rt.isBot) return id
    }
    return undefined
  }

  /** Lowest palette slot nobody is using, so colours are stable for the match. */
  nextColorIndex(): number {
    const taken = new Set(Object.values(this.gameState.players).map((p) => p.colorIndex))
    let i = 0
    while (taken.has(i)) i++
    return i
  }

  blankPlayer(id: string, name: string, isBot: boolean): Player {
    return {
      id,
      name,
      x: CENTER_X,
      y: CENTER_Y,
      angle: 0,
      vx: 0,
      vy: 0,
      eliminated: false,
      isBot,
      score: 0,
      roundPoints: 0,
      kills: 0,
      totalKills: 0,
      dashCharge: 1,
      dashing: false,
      outOfBounds: false,
      recovery: 1,
      revenge: 0,
      colorIndex: this.nextColorIndex(),
    }
  }

  makeCar(x: number, y: number): Matter.Body {
    return Bodies.circle(x, y, CAR_RADIUS, {
      friction: 0.02,
      frictionAir: 0.055,
      restitution: 0.1,
      label: 'car',
    })
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message)

      // Lobby control is the host's alone — anyone with the link could otherwise
      // restart a league mid-play.
      const isHost = sender.id === this.hostId()

      if (data.type === 'addBot' && isHost && this.gameState.status === 'waiting') {
        this.addBot()
      }

      if (data.type === 'startGame' && isHost) {
        if (this.players.size >= 2 && this.gameState.status === 'waiting') {
          this.startMatch()
        }
      }

      if (data.type === 'restartGame' && isHost && this.gameState.status === 'finished') {
        this.resetToLobby()
      }

      if (data.type === 'input') {
        const rt = this.players.get(sender.id)
        if (rt && data.keys) {
          rt.keys = {
            w: !!data.keys.w,
            a: !!data.keys.a,
            s: !!data.keys.s,
            d: !!data.keys.d,
          }
        }
        if (rt && data.dir) {
          const x = Number(data.dir.x) || 0
          const y = Number(data.dir.y) || 0
          const len = Math.hypot(x, y)
          rt.dir = len > 1 ? { x: x / len, y: y / len } : { x, y }
        }
      }

      if (data.type === 'dash' && this.gameState.status === 'playing') {
        this.tryDash(sender.id)
      }

      // Eliminated players call who they think survives — something to do, and
      // something to shout about, while they wait out the round.
      if (data.type === 'predictSurvivor') {
        const me = this.gameState.players[sender.id]
        const pick = this.gameState.players[data.playerId]
        if (me && me.eliminated && pick && !pick.eliminated && this.gameState.status === 'playing') {
          me.prediction = data.playerId
          this.broadcastGameState()
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', e)
    }
  }

  tryDash(playerId: string, dirOverride?: { x: number; y: number }) {
    const rt = this.players.get(playerId)
    const player = this.gameState.players[playerId]
    if (!rt || !player || player.eliminated) return

    const now = Date.now()
    if (now < rt.dashReadyAt) return

    // Dash where you're steering; failing that, where you're already going.
    let dir = dirOverride ? normalize(dirOverride.x, dirOverride.y) : normalize(rt.dir.x, rt.dir.y)
    if (dir.x === 0 && dir.y === 0) {
      dir = normalize(rt.body.velocity.x, rt.body.velocity.y)
    }
    if (dir.x === 0 && dir.y === 0) {
      dir = { x: Math.cos(rt.body.angle), y: Math.sin(rt.body.angle) }
    }

    rt.dashUntil = now + DASH_DURATION
    rt.dashReadyAt = now + DASH_COOLDOWN
    rt.dashDir = dir

    Body.setVelocity(rt.body, {
      x: rt.body.velocity.x + dir.x * DASH_SPEED,
      y: rt.body.velocity.y + dir.y * DASH_SPEED,
    })

    this.pushEvent({
      type: 'dash',
      x: rt.body.position.x,
      y: rt.body.position.y,
      dx: dir.x,
      dy: dir.y,
      playerId,
    })
  }

  // ------------------------------------------------------------ match flow

  startMatch() {
    this.gameState.totalRounds = TOTAL_ROUNDS
    this.gameState.round = 0
    this.gameState.champion = undefined
    this.gameState.ultimateLoser = undefined
    for (const p of Object.values(this.gameState.players)) {
      p.score = 0
      p.roundPoints = 0
      p.kills = 0
      p.totalKills = 0
    }
    this.startNextRound()
  }

  startNextRound() {
    // Everyone else left — don't march a lone player through solo rounds.
    if (this.players.size < 2) {
      this.resetToLobby()
      return
    }

    this.gameState.round++
    this.gameState.roundSurvivor = undefined
    this.gameState.suddenDeath = false
    this.gameState.arenaRadius = START_RADIUS
    this.gameState.centerX = CENTER_X
    this.gameState.centerY = CENTER_Y
    this.driftTarget = null
    this.driftRetargetAt = 0
    this.eliminationOrder = []
    this.pairCooldowns.clear()
    this.roundEndingAt = 0
    // Drop last round's explosions so a fresh client can't replay them.
    this.gameState.events = []

    World.clear(this.engine.world, false)
    this.buildObstacles(this.gameState.round)

    // Everyone plays every round — evenly spaced on a ring, no overlapping spawns.
    const ids = [...this.players.keys()]
    const spawnRadius = START_RADIUS * 0.62
    ids.forEach((id, i) => {
      const angle = (i / ids.length) * Math.PI * 2 + Math.random() * 0.15
      const x = CENTER_X + Math.cos(angle) * spawnRadius
      const y = CENTER_Y + Math.sin(angle) * spawnRadius
      const body = this.makeCar(x, y)
      // Face the middle — the fight is in there.
      Body.setAngle(body, angle + Math.PI)
      World.add(this.engine.world, body)

      const rt = this.players.get(id)!
      rt.body = body
      rt.inWorld = true
      rt.keys = { w: false, a: false, s: false, d: false }
      rt.dir = { x: 0, y: 0 }
      rt.steer = { x: 0, y: 0 }
      rt.dashUntil = 0
      rt.dashReadyAt = 0
      rt.lastHitBy = undefined
      rt.botAim = { x: 0, y: 0 }
      rt.regroupUntil = 0
      rt.outsideProgress = 0

      const p = this.gameState.players[id]
      p.x = x
      p.y = y
      p.angle = angle + Math.PI
      p.vx = 0
      p.vy = 0
      p.eliminated = false
      p.roundPoints = 0
      p.kills = 0
      p.dashCharge = 1
      p.dashing = false
      p.outOfBounds = false
      p.recovery = 1
      p.revenge = 0
      p.eliminatedBy = undefined
      p.prediction = undefined
    })

    this.startCountdown()
  }

  /**
   * Something to bounce people off. An empty circle gives players nothing to use;
   * a pillar turns a shove into a ricochet and a round into a place.
   */
  buildObstacles(round: number) {
    const layouts: Record<number, Obstacle[]> = {
      2: [{ x: CENTER_X, y: CENTER_Y, radius: 38 }],
      3: [
        { x: CENTER_X - 140, y: CENTER_Y, radius: 30 },
        { x: CENTER_X + 140, y: CENTER_Y, radius: 30 },
      ],
      4: [
        { x: CENTER_X, y: CENTER_Y - 120, radius: 28 },
        { x: CENTER_X - 104, y: CENTER_Y + 60, radius: 28 },
        { x: CENTER_X + 104, y: CENTER_Y + 60, radius: 28 },
      ],
      5: [
        { x: CENTER_X - 86, y: CENTER_Y - 86, radius: 26 },
        { x: CENTER_X + 86, y: CENTER_Y - 86, radius: 26 },
        { x: CENTER_X - 86, y: CENTER_Y + 86, radius: 26 },
        { x: CENTER_X + 86, y: CENTER_Y + 86, radius: 26 },
      ],
    }

    const obstacles = layouts[round] ?? []
    this.gameState.obstacles = obstacles
    this.obstacleBodies = obstacles.map((o) => {
      const body = Bodies.circle(o.x, o.y, o.radius, {
        isStatic: true,
        // Fully deadened. A pillar kills your momentum and pins you for someone
        // to finish, rather than firing you across the arena on its own.
        restitution: 0,
        friction: 0.4,
        label: 'obstacle',
      })
      World.add(this.engine.world, body)
      return body
    })
  }

  startCountdown() {
    this.gameState.status = 'countdown'
    this.gameState.countdown = 2
    this.gameState.timeRemaining = ROUND_TIME
    this.broadcastGameState()

    if (this.countdownTimer) clearInterval(this.countdownTimer)
    this.countdownTimer = setInterval(() => {
      this.gameState.countdown--
      this.broadcastGameState()
      if (this.gameState.countdown <= 0) {
        clearInterval(this.countdownTimer!)
        this.countdownTimer = null
        this.startRound()
      }
    }, 1000)
  }

  startRound() {
    this.gameState.status = 'playing'
    this.gameState.timeRemaining = ROUND_TIME
    this.frameCount = 0

    if (this.gameLoop) clearInterval(this.gameLoop)
    this.gameLoop = setInterval(() => this.tick(), 1000 / 60)
  }

  tick() {
    this.frameCount++
    const elapsed = this.frameCount / 60
    const now = Date.now()

    this.gameState.timeRemaining = Math.max(0, ROUND_TIME - elapsed)

    // Once the round is won the ring stops moving and stops killing — the hold
    // is a victory lap, and the winner must not be swallowed by their own ring.
    const decided = this.roundEndingAt !== 0

    if (!decided) {
      // Eased shrink: roomy early, claustrophobic late. Sudden death then holds a
      // tight ring for a real showdown before squeezing it shut.
      if (elapsed <= ROUND_TIME) {
        const t = elapsed / ROUND_TIME
        this.gameState.arenaRadius = START_RADIUS - (START_RADIUS - END_RADIUS) * Math.pow(t, 1.4)
      } else {
        this.gameState.suddenDeath = true
        const overtime = elapsed - ROUND_TIME
        this.gameState.arenaRadius = Math.max(
          MIN_RADIUS,
          END_RADIUS - Math.max(0, overtime - SUDDEN_DEATH_HOLD) * 12
        )
      }
      this.updateDrift(now)
    }

    this.applyInput()
    this.runBots()

    Engine.update(this.engine)

    this.syncBodies(now)
    if (!decided && elapsed > ELIMINATION_GRACE) this.checkEliminations(now)

    const active = this.activeCount()

    if (this.roundEndingAt === 0 && (active <= 1 || elapsed > HARD_ROUND_CAP)) {
      // Hold the round open briefly so the decisive knockout actually gets to play out.
      this.roundEndingAt = now + 900
    }

    if (this.roundEndingAt !== 0 && now >= this.roundEndingAt) {
      this.finishRound()
      return
    }

    if (this.frameCount % 2 === 0) {
      this.broadcastGameState()
    }
  }

  /**
   * Wander the ring's centre. A fixed centre is a safe room: nothing can reach a
   * parked car until the arena has shrunk most of the way, so the correct play
   * becomes to sit still. A moving ring keeps everyone near an edge.
   */
  updateDrift(now: number) {
    const maxOffset = Math.min(DRIFT_MAX_OFFSET, 400 - this.gameState.arenaRadius - 20)

    if (!this.driftTarget || now >= this.driftRetargetAt) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * Math.max(0, maxOffset)
      this.driftTarget = {
        x: CENTER_X + Math.cos(angle) * dist,
        y: CENTER_Y + Math.sin(angle) * dist,
      }
      this.driftRetargetAt =
        now + DRIFT_RETARGET_MIN + Math.random() * (DRIFT_RETARGET_MAX - DRIFT_RETARGET_MIN)
    }

    const step = DRIFT_SPEED / 60
    const dx = this.driftTarget.x - this.gameState.centerX
    const dy = this.driftTarget.y - this.gameState.centerY
    const dist = Math.hypot(dx, dy)
    if (dist > step) {
      this.gameState.centerX += (dx / dist) * step
      this.gameState.centerY += (dy / dist) * step
    }

    // Keep the whole ring on the canvas as it grows relative to the offset.
    const offX = this.gameState.centerX - CENTER_X
    const offY = this.gameState.centerY - CENTER_Y
    const off = Math.hypot(offX, offY)
    if (off > maxOffset && off > 0) {
      this.gameState.centerX = CENTER_X + (offX / off) * maxOffset
      this.gameState.centerY = CENTER_Y + (offY / off) * maxOffset
    }
  }

  applyInput() {
    this.players.forEach((rt, id) => {
      const p = this.gameState.players[id]
      if (!p || p.eliminated || rt.isBot) return

      // Thrust swings toward the stick rather than snapping to it, so a hard
      // reverse costs you a moment — that moment is where the driving skill is.
      rt.steer.x += (rt.dir.x - rt.steer.x) * STEER_RATE
      rt.steer.y += (rt.dir.y - rt.steer.y) * STEER_RATE

      const magnitude = Math.hypot(rt.steer.x, rt.steer.y)
      if (magnitude < 0.03) return

      Body.applyForce(rt.body, rt.body.position, {
        x: rt.steer.x * MOVE_FORCE,
        y: rt.steer.y * MOVE_FORCE,
      })
    })
  }

  runBots() {
    const now = Date.now()
    const cx = this.gameState.centerX
    const cy = this.gameState.centerY

    this.players.forEach((rt, id) => {
      const p = this.gameState.players[id]
      if (!rt.isBot || !p || p.eliminated) return

      const pos = rt.body.position
      const distToCenter = Math.hypot(pos.x - cx, pos.y - cy)

      // Two separate reads: where the car is, and where its momentum is taking
      // it. Retreating on the projection alone made bots hover in the middle and
      // never fight, so only an actual overshoot pulls them off an attack.
      const leadX = pos.x + rt.body.velocity.x * BOT_LOOKAHEAD
      const leadY = pos.y + rt.body.velocity.y * BOT_LOOKAHEAD
      const projected = Math.hypot(leadX - cx, leadY - cy) / this.gameState.arenaRadius
      const edgePressure = distToCenter / this.gameState.arenaRadius
      const mustRetreat = projected > 0.95 || edgePressure > 0.85

      let target: { id: string; x: number; y: number; dist: number } | null = null
      let threat: { x: number; y: number; dist: number } | null = null

      this.players.forEach((otherRt, otherId) => {
        if (otherId === id) return
        const other = this.gameState.players[otherId]
        if (!other || other.eliminated) return
        const dist = Math.hypot(otherRt.body.position.x - pos.x, otherRt.body.position.y - pos.y)

        if (!target || dist < target.dist) {
          target = {
            id: otherId,
            // Aim where they're going, not where they are.
            x: otherRt.body.position.x + otherRt.body.velocity.x * 8,
            y: otherRt.body.position.y + otherRt.body.velocity.y * 8,
            dist,
          }
        }

        // A dashing car bearing down is worth backing away from.
        if (other.dashing && dist < 120 && (!threat || dist < threat.dist)) {
          threat = { x: otherRt.body.position.x, y: otherRt.body.position.y, dist }
        }
      })

      let desired: { x: number; y: number }

      if (mustRetreat) {
        desired = normalize(cx - pos.x, cy - pos.y)
      } else if (now < rt.regroupUntil && target) {
        // Backing off to get a run-up — biased toward the middle, or peeling
        // away from an opponent simply reverses you off the edge.
        const t = target as { id: string; x: number; y: number; dist: number }
        const away = normalize(pos.x - t.x, pos.y - t.y)
        const inward = normalize(cx - pos.x, cy - pos.y)
        desired = normalize(away.x + inward.x * 0.8, away.y + inward.y * 0.8)
      } else if (threat && now < rt.dashReadyAt) {
        // Only run if there's no dash to answer with — otherwise stand and counter.
        const t = threat as { x: number; y: number; dist: number }
        const away = normalize(pos.x - t.x, pos.y - t.y)
        const inward = normalize(cx - pos.x, cy - pos.y)
        desired = normalize(away.x + inward.x * 0.6, away.y + inward.y * 0.6)
      } else if (target) {
        const t = target as { id: string; x: number; y: number; dist: number }
        desired = normalize(t.x - pos.x, t.y - pos.y)
        const noise = (1 - rt.botSkill) * 0.9
        desired = normalize(
          desired.x + (Math.random() - 0.5) * noise,
          desired.y + (Math.random() - 0.5) * noise
        )
      } else {
        desired = normalize(cx - pos.x, cy - pos.y)
      }

      // Push off nearby pillars, or bots drive straight into them and carom out.
      for (const o of this.gameState.obstacles) {
        const ox = pos.x - o.x
        const oy = pos.y - o.y
        const dist = Math.hypot(ox, oy)
        const range = o.radius + BOT_OBSTACLE_CLEARANCE
        if (dist >= range || dist === 0) continue
        const push = (range - dist) / range
        desired = normalize(desired.x + (ox / dist) * push * 1.6, desired.y + (oy / dist) * push * 1.6)
      }

      rt.botAim.x += (desired.x - rt.botAim.x) * 0.12
      rt.botAim.y += (desired.y - rt.botAim.y) * 0.12

      Body.applyForce(rt.body, pos, {
        x: rt.botAim.x * MOVE_FORCE,
        y: rt.botAim.y * MOVE_FORCE,
      })

      if (now < rt.dashReadyAt) return

      // Out over the line: burn the dash driving back in, same as a human would.
      if (p.outOfBounds) {
        this.tryDash(id, normalize(cx - pos.x, cy - pos.y))
        return
      }

      // Someone is charging and the dash is up: answer it rather than run.
      if (threat) {
        const t = threat as { x: number; y: number; dist: number }
        this.tryDash(id, normalize(t.x - pos.x, t.y - pos.y))
        return
      }

      if (!target) return
      const t = target as { id: string; x: number; y: number; dist: number }

      // Grinding at contact range with nothing to hit them with: back off and
      // come again with speed behind it.
      if (t.dist < BOT_GRIND_RANGE && now >= rt.regroupUntil) {
        rt.regroupUntil = now + BOT_REGROUP_MS
        return
      }

      const toTarget = normalize(t.x - pos.x, t.y - pos.y)
      const alignment = toTarget.x * rt.botAim.x + toTarget.y * rt.botAim.y
      if (t.dist > 130 || alignment < 0.7 || edgePressure > 0.85) return

      // Committing into a loaded opponent is a worse bet, but not an unthinkable one.
      const victim = this.gameState.players[t.id]
      if (victim && victim.dashCharge >= 1 && Math.random() < rt.botSkill * 0.5) return

      if (Math.random() < 0.1 + rt.botSkill * 0.25) {
        // Aim through the target, away from the middle, so the hit sends them out.
        const outward = normalize(t.x - cx, t.y - cy)
        this.tryDash(id, normalize(toTarget.x + outward.x, toTarget.y + outward.y))
      }
    })
  }

  syncBodies(now: number) {
    this.players.forEach((rt, id) => {
      const p = this.gameState.players[id]
      if (!p || !rt.inWorld) return
      const body = rt.body

      // Point the car where it's actually travelling — the whole game is readable from heading.
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (speed > 0.4) {
        const heading = Math.atan2(body.velocity.y, body.velocity.x)
        Body.setAngle(body, approachAngle(body.angle, heading, 0.3))
      }

      p.x = body.position.x
      p.y = body.position.y
      p.angle = body.angle
      p.vx = body.velocity.x
      p.vy = body.velocity.y
      p.dashing = now < rt.dashUntil
      p.dashCharge = now >= rt.dashReadyAt ? 1 : 1 - (rt.dashReadyAt - now) / DASH_COOLDOWN

      if (p.eliminated) {
        const { x, y } = body.position
        if (x < -80 || x > 880 || y < -80 || y > 880) {
          World.remove(this.engine.world, body)
        }
      }
    })
  }

  checkEliminations(now: number) {
    // Resolve the furthest-out car first, so a shared tick is never settled by
    // whoever happened to join the room earliest.
    const ordered = [...this.players.entries()].sort((a, b) => {
      const da = Math.hypot(
        b[1].body.position.x - this.gameState.centerX,
        b[1].body.position.y - this.gameState.centerY
      )
      const db = Math.hypot(
        a[1].body.position.x - this.gameState.centerX,
        a[1].body.position.y - this.gameState.centerY
      )
      return da - db
    })

    ordered.forEach(([id, rt]) => {
      const p = this.gameState.players[id]
      if (!p || p.eliminated || !rt.inWorld) return

      const dist = Math.hypot(
        rt.body.position.x - this.gameState.centerX,
        rt.body.position.y - this.gameState.centerY
      )

      if (dist <= this.gameState.arenaRadius) {
        rt.outsideProgress = 0
        p.outOfBounds = false
        p.recovery = 1
        return
      }

      // The further out you were thrown, the faster the window closes — so how
      // hard you were hit decides survival, rather than your reaction time alone.
      const grace = this.gameState.suddenDeath ? SUDDEN_DEATH_GRACE : OUT_OF_BOUNDS_GRACE
      const outside = dist - this.gameState.arenaRadius
      rt.outsideProgress += ((1000 / 60) / grace) * (1 + outside / 50)
      p.outOfBounds = true
      p.recovery = Math.max(0, 1 - rt.outsideProgress)
      if (rt.outsideProgress < 1) return

      p.eliminated = true
      p.outOfBounds = false
      p.recovery = 0
      this.eliminationOrder.push(id)

      // Credit the knockout to whoever last connected with them.
      let byName: string | undefined
      let byId: string | undefined
      let byX: number | undefined
      let byY: number | undefined
      const hit = rt.lastHitBy
      if (
        hit &&
        now - hit.at < KILL_CREDIT_WINDOW &&
        hit.id !== id &&
        hit.launch >= KILL_CREDIT_MIN_LAUNCH
      ) {
        const killer = this.gameState.players[hit.id]
        if (killer && !killer.eliminated) {
          killer.kills++
          killer.totalKills++
          byName = killer.name
          byId = hit.id
          byX = killer.x
          byY = killer.y
          p.eliminatedBy = hit.id
        }
      }

      // Anyone this car knocked out earlier gets paid when it goes out itself.
      for (const other of Object.values(this.gameState.players)) {
        if (other.eliminatedBy === id) other.revenge++
      }

      rt.body.collisionFilter = { group: -1, category: 0, mask: 0 }
      Body.setVelocity(rt.body, {
        x: rt.body.velocity.x * 1.4,
        y: rt.body.velocity.y * 1.4,
      })
      Body.setAngularVelocity(rt.body, (Math.random() - 0.5) * 0.9)

      this.pushEvent({
        type: 'elim',
        x: rt.body.position.x,
        y: rt.body.position.y,
        playerId: id,
        name: p.name,
        byName,
        byBonus: byName ? KILL_BONUS : undefined,
        byId,
        byX,
        byY,
        final: this.activeCount() <= 1,
      })
    })
  }

  activeCount(): number {
    let n = 0
    for (const p of Object.values(this.gameState.players)) {
      if (!p.eliminated) n++
    }
    return n
  }

  finishRound() {
    if (this.gameLoop) clearInterval(this.gameLoop)
    this.gameLoop = null
    this.roundEndingAt = 0

    // Survivors are ranked by how well they held the middle, never by join order.
    const survivors = Object.keys(this.gameState.players)
      .filter((id) => !this.gameState.players[id].eliminated)
      .sort((a, b) => {
        const pa = this.gameState.players[a]
        const pb = this.gameState.players[b]
        const cx = this.gameState.centerX
        const cy = this.gameState.centerY
        return Math.hypot(pb.x - cx, pb.y - cy) - Math.hypot(pa.x - cx, pa.y - cy)
      })

    // Placement points: first car out scores 1, last car standing scores the most.
    const placement = [...this.eliminationOrder, ...survivors].filter(
      (id) => this.gameState.players[id]
    )
    this.gameState.roundSurvivor =
      survivors[survivors.length - 1] ?? placement[placement.length - 1]

    const isFinalRound = this.gameState.round >= this.gameState.totalRounds
    placement.forEach((id, index) => {
      const p = this.gameState.players[id]
      // Placement is scored out of 10 regardless of lobby size, so a knockout is
      // worth the same slice of a round whether there are three cars or sixteen.
      const placementPoints = Math.max(1, Math.round(((index + 1) / placement.length) * 10))
      const calledIt = p.prediction && p.prediction === this.gameState.roundSurvivor
      p.roundPoints =
        placementPoints +
        p.kills * KILL_BONUS +
        p.revenge * REVENGE_BONUS +
        (calledIt ? SPECTATOR_BONUS : 0)
      if (isFinalRound) p.roundPoints = Math.round(p.roundPoints * FINAL_ROUND_MULTIPLIER)
      p.score += p.roundPoints
    })

    if (isFinalRound) {
      // Same tie-break the client's table uses, so the crown never contradicts it.
      const ranked = Object.values(this.gameState.players).sort(
        (a, b) => b.score - a.score || b.totalKills - a.totalKills
      )
      this.gameState.champion = ranked[0]?.id
      this.gameState.ultimateLoser = ranked[ranked.length - 1]?.id
      this.gameState.status = 'finished'
      this.broadcastGameState()
      return
    }

    this.gameState.status = 'roundEnd'
    this.broadcastGameState()

    if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer)
    this.nextRoundTimer = setTimeout(() => {
      this.nextRoundTimer = null
      if (this.gameState.status === 'roundEnd') this.startNextRound()
    }, 3500)
  }

  resetToLobby() {
    if (this.gameLoop) clearInterval(this.gameLoop)
    if (this.countdownTimer) clearInterval(this.countdownTimer)
    if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer)
    this.gameLoop = null
    this.countdownTimer = null
    this.nextRoundTimer = null

    World.clear(this.engine.world, false)

    this.gameState.status = 'waiting'
    this.gameState.timeRemaining = ROUND_TIME
    this.gameState.suddenDeath = false
    this.gameState.countdown = 0
    this.gameState.arenaRadius = START_RADIUS
    this.gameState.round = 0
    this.gameState.champion = undefined
    this.gameState.ultimateLoser = undefined
    this.gameState.roundSurvivor = undefined
    this.eliminationOrder = []
    this.roundEndingAt = 0

    for (const [id, rt] of this.players) {
      const body = this.makeCar(CENTER_X, CENTER_Y)
      World.add(this.engine.world, body)
      rt.body = body
      rt.inWorld = true
      rt.dashUntil = 0
      rt.dashReadyAt = 0
      rt.lastHitBy = undefined
      rt.outsideProgress = 0
      const name = this.gameState.players[id]?.name ?? 'Player'
      this.gameState.players[id] = this.blankPlayer(id, name, rt.isBot)
    }

    this.broadcastGameState()
  }

  addBot() {
    const botNames = ['Turbo', 'Crash', 'Blaze', 'Nitro', 'Spark', 'Drift', 'Flash', 'Storm']
    const taken = new Set(Object.values(this.gameState.players).map((p) => p.name))
    const available = botNames.filter((n) => !taken.has(`${n} [BOT]`))
    const botName = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : `Bot${this.players.size}`
    const botId = `bot-${Math.random().toString(36).substring(2, 7)}`

    const body = this.makeCar(CENTER_X, CENTER_Y)
    World.add(this.engine.world, body)

    this.players.set(botId, {
      socket: null,
      body,
      isBot: true,
      inWorld: true,
      keys: { w: false, a: false, s: false, d: false },
      dir: { x: 0, y: 0 },
      steer: { x: 0, y: 0 },
      dashUntil: 0,
      dashReadyAt: 0,
      dashDir: { x: 1, y: 0 },
      botAim: { x: 0, y: 0 },
      regroupUntil: 0,
      botSkill: 0.55 + Math.random() * 0.4,
      outsideProgress: 0,
    })

    this.gameState.players[botId] = this.blankPlayer(botId, `${botName} [BOT]`, true)
    this.broadcastGameState()
  }

  broadcastGameState() {
    this.gameState.hostId = this.hostId()
    this.room.broadcast(JSON.stringify({ type: 'gameState', gameState: this.gameState }), [])
  }

  onClose(conn: Party.Connection) {
    const rt = this.players.get(conn.id)
    if (rt) World.remove(this.engine.world, rt.body)
    this.players.delete(conn.id)
    delete this.gameState.players[conn.id]

    const humans = [...this.players.values()].filter((p) => !p.isBot)
    if (humans.length === 0) {
      if (this.gameLoop) clearInterval(this.gameLoop)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer)
      this.gameLoop = null
      this.countdownTimer = null
      this.nextRoundTimer = null

      for (const [id, p] of this.players) {
        World.remove(this.engine.world, p.body)
        this.players.delete(id)
        delete this.gameState.players[id]
      }

      this.gameState.status = 'waiting'
      this.gameState.round = 0
      this.gameState.arenaRadius = START_RADIUS
      this.gameState.timeRemaining = ROUND_TIME
      this.gameState.suddenDeath = false
      this.gameState.events = []
      return
    }

    // A disconnect can leave one car alone in a live round.
    if (this.gameState.status === 'playing' && this.activeCount() <= 1 && this.roundEndingAt === 0) {
      this.roundEndingAt = Date.now()
    }
    this.broadcastGameState()
  }
}
