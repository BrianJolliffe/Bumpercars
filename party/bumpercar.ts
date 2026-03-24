import type * as Party from 'partykit/server'
import * as Matter from 'matter-js'

const { Engine, World, Bodies, Body, Events } = Matter

interface Player {
  id: string
  name: string
  x: number
  y: number
  angle: number
  vx: number
  vy: number
  eliminated: boolean
}

interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'roundEnd' | 'finished'
  players: Record<string, Player>
  winner?: string
  timeRemaining: number
  countdown: number
  arenaRadius: number
  tournamentRound: number
  totalRounds: number
  promotedPlayers: string[]
  roundWinner?: string
  tournamentLoser?: string
}

export default class BumperCarParty implements Party.Server {
  engine: Matter.Engine
  gameState: GameState
  players: Map<string, { socket: Party.Connection | null; body: Matter.Body; isBot: boolean }>
  lastUpdateTime: number
  gameLoop: ReturnType<typeof setInterval> | null = null
  botInterval: ReturnType<typeof setInterval> | null = null

  constructor(public room: Party.Room) {
    this.engine = Engine.create()
    this.engine.gravity.y = 0
    this.engine.gravity.x = 0

    this.gameState = {
      status: 'waiting',
      players: {},
      timeRemaining: 30,
      countdown: 0,
      arenaRadius: 300,
      tournamentRound: 0,
      totalRounds: 0,
      promotedPlayers: [],
      roundWinner: undefined,
      tournamentLoser: undefined,
    }

    this.players = new Map()
    this.lastUpdateTime = Date.now()

    // On collision: hitter slows down, target gets launched
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA
        const b = pair.bodyB
        if (a.label === 'car' && b.label === 'car') {
          const speedA = Math.hypot(a.velocity.x, a.velocity.y)
          const speedB = Math.hypot(b.velocity.x, b.velocity.y)
          const hitter = speedA > speedB ? a : b
          const target = hitter === a ? b : a

          // Slow down the hitter
          Body.setVelocity(hitter, {
            x: hitter.velocity.x * 0.4,
            y: hitter.velocity.y * 0.4,
          })

          // Launch the target — boost their post-collision velocity
          Body.setVelocity(target, {
            x: target.velocity.x * 3,
            y: target.velocity.y * 3,
          })
        }
      }
    })
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = conn.id
    const url = new URL(ctx.request.url)
    const playerName = url.searchParams.get('name') || `Player ${this.players.size + 1}`

    // Spawn inside arena at a random angle, within 80% of the radius
    const spawnAngle = Math.random() * Math.PI * 2
    const spawnDist = Math.random() * this.gameState.arenaRadius * 0.8
    const spawnX = 400 + Math.cos(spawnAngle) * spawnDist
    const spawnY = 400 + Math.sin(spawnAngle) * spawnDist
    const car = Bodies.circle(spawnX, spawnY, 24, {
      friction: 0.05,
      frictionAir: 0.05,
      restitution: 0.95,
      label: 'car',
    })

    World.add(this.engine.world, car)

    this.players.set(playerId, { socket: conn, body: car, isBot: false })
    this.gameState.players[playerId] = {
      id: playerId,
      name: playerName,
      x: car.position.x,
      y: car.position.y,
      angle: car.angle,
      vx: 0,
      vy: 0,
      eliminated: false,
    }


    // Send initial state to new player
    conn.send(
      JSON.stringify({
        type: 'init',
        playerId,
        gameState: this.gameState,
      })
    )

    // Broadcast updated player list to all
    this.broadcastGameState()
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message)

      if (data.type === 'addBot') {
        if (this.gameState.status === 'waiting') {
          this.addBot()
        }
      }

      if (data.type === 'startGame') {
        if (this.players.size >= 2 && this.gameState.status === 'waiting') {
          this.startTournament()
        }
      }

      if (data.type === 'restartGame') {
        if (this.gameState.status === 'finished') {
          this.restartGame()
        }
      }

      if (data.type === 'input' && this.gameState.status === 'playing') {
        const player = this.players.get(sender.id)
        if (player && !this.gameState.players[sender.id]?.eliminated) {
          // Apply forces based on input
          const force = 0.00225
          if (data.keys.w) Body.applyForce(player.body, player.body.position, { x: 0, y: -force })
          if (data.keys.s) Body.applyForce(player.body, player.body.position, { x: 0, y: force })
          if (data.keys.a) Body.applyForce(player.body, player.body.position, { x: -force, y: 0 })
          if (data.keys.d) Body.applyForce(player.body, player.body.position, { x: force, y: 0 })
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', e)
    }
  }

  startTournament() {
    const totalPlayers = this.players.size
    // Number of rounds = totalPlayers - 1 (each round removes 1 winner until final 1v1)
    this.gameState.totalRounds = totalPlayers - 1
    this.gameState.tournamentRound = 0
    this.gameState.promotedPlayers = []
    this.gameState.tournamentLoser = undefined
    this.gameState.roundWinner = undefined
    this.startNextRound()
  }

  startNextRound() {
    this.gameState.tournamentRound++
    this.gameState.roundWinner = undefined

    // Clear physics world
    World.clear(this.engine.world, false)

    // Get players still in the tournament (not promoted)
    const activeTournamentPlayers = [...this.players.entries()].filter(
      ([id]) => !this.gameState.promotedPlayers.includes(id)
    )

    // Respawn only active tournament players
    for (const [id, playerData] of activeTournamentPlayers) {
      const spawnAngle = Math.random() * Math.PI * 2
      const spawnDist = Math.random() * this.gameState.arenaRadius * 0.8
      const spawnX = 400 + Math.cos(spawnAngle) * spawnDist
      const spawnY = 400 + Math.sin(spawnAngle) * spawnDist
      const car = Bodies.circle(spawnX, spawnY, 24, {
        friction: 0.05,
        frictionAir: 0.05,
        restitution: 0.95,
        label: 'car',
      })
      World.add(this.engine.world, car)
      playerData.body = car

      this.gameState.players[id] = {
        id,
        name: this.gameState.players[id].name,
        x: car.position.x,
        y: car.position.y,
        angle: car.angle,
        vx: 0,
        vy: 0,
        eliminated: false,
      }
    }

    // Mark promoted players as eliminated so they don't render in the arena
    for (const id of this.gameState.promotedPlayers) {
      if (this.gameState.players[id]) {
        this.gameState.players[id].eliminated = true
      }
    }

    this.gameState.arenaRadius = 300
    this.startCountdown()
  }

  restartGame() {
    if (this.gameLoop) clearInterval(this.gameLoop)
    this.stopBotAI()

    // Clear physics world
    World.clear(this.engine.world, false)

    // Reset game state
    this.gameState.status = 'waiting'
    this.gameState.timeRemaining = 30
    this.gameState.countdown = 0
    this.gameState.arenaRadius = 300
    this.gameState.winner = undefined
    this.gameState.tournamentRound = 0
    this.gameState.totalRounds = 0
    this.gameState.promotedPlayers = []
    this.gameState.roundWinner = undefined
    this.gameState.tournamentLoser = undefined

    // Respawn all existing players with new physics bodies
    for (const [id, playerData] of this.players) {
      const spawnAngle = Math.random() * Math.PI * 2
      const spawnDist = Math.random() * this.gameState.arenaRadius * 0.8
      const spawnX = 400 + Math.cos(spawnAngle) * spawnDist
      const spawnY = 400 + Math.sin(spawnAngle) * spawnDist
      const car = Bodies.circle(spawnX, spawnY, 24, {
        friction: 0.05,
        frictionAir: 0.05,
        restitution: 0.95,
        label: 'car',
      })
      World.add(this.engine.world, car)
      playerData.body = car

      this.gameState.players[id] = {
        id,
        name: this.gameState.players[id].name,
        x: car.position.x,
        y: car.position.y,
        angle: car.angle,
        vx: 0,
        vy: 0,
        eliminated: false,
      }
    }

    this.broadcastGameState()
  }

  addBot() {
    const botId = `bot-${Math.random().toString(36).substring(2, 6)}`
    const botNames = ['Turbo', 'Crash', 'Blaze', 'Nitro', 'Spark', 'Drift', 'Flash', 'Storm']
    const botName = botNames[Math.floor(Math.random() * botNames.length)]

    const spawnAngle = Math.random() * Math.PI * 2
    const spawnDist = Math.random() * this.gameState.arenaRadius * 0.8
    const spawnX = 400 + Math.cos(spawnAngle) * spawnDist
    const spawnY = 400 + Math.sin(spawnAngle) * spawnDist
    const car = Bodies.circle(spawnX, spawnY, 24, {
      friction: 0.05,
      frictionAir: 0.05,
      restitution: 0.95,
      label: 'car',
    })

    World.add(this.engine.world, car)
    this.players.set(botId, { socket: null, body: car, isBot: true })
    this.gameState.players[botId] = {
      id: botId,
      name: `${botName} [BOT]`,
      x: car.position.x,
      y: car.position.y,
      angle: car.angle,
      vx: 0,
      vy: 0,
      eliminated: false,
    }

    this.broadcastGameState()
  }

  startBotAI() {
    if (this.botInterval) clearInterval(this.botInterval)

    this.botInterval = setInterval(() => {
      if (this.gameState.status !== 'playing') return

      this.players.forEach((playerData, playerId) => {
        if (!playerData.isBot || this.gameState.players[playerId]?.eliminated) return

        const centerX = 400
        const centerY = 400
        const pos = playerData.body.position
        const distToCenter = Math.hypot(pos.x - centerX, pos.y - centerY)
        const force = 0.003

        // Find nearest alive non-bot player to chase
        let nearestDist = Infinity
        let targetX = centerX
        let targetY = centerY
        let hasTarget = false

        this.players.forEach((otherData, otherId) => {
          if (otherId === playerId || this.gameState.players[otherId]?.eliminated) return
          const ox = otherData.body.position.x
          const oy = otherData.body.position.y
          const d = Math.hypot(ox - pos.x, oy - pos.y)
          if (d < nearestDist) {
            nearestDist = d
            targetX = ox
            targetY = oy
            hasTarget = true
          }
        })

        let fx = 0
        let fy = 0

        if (distToCenter > this.gameState.arenaRadius * 0.7) {
          // Danger zone — rush back to center
          const toCenterX = centerX - pos.x
          const toCenterY = centerY - pos.y
          const d = Math.hypot(toCenterX, toCenterY)
          fx = (toCenterX / d) * force * 1.5
          fy = (toCenterY / d) * force * 1.5
        } else if (hasTarget && Math.random() > 0.4) {
          // Chase nearest player (60% of the time, miss the rest)
          const dx = targetX - pos.x
          const dy = targetY - pos.y
          const d = Math.hypot(dx, dy)
          fx = (dx / d) * force
          fy = (dy / d) * force
          // Lots of randomness — they're bad drivers
          fx += (Math.random() - 0.5) * force * 1.5
          fy += (Math.random() - 0.5) * force * 1.5
        } else {
          // Wander aimlessly
          fx = (Math.random() - 0.5) * force
          fy = (Math.random() - 0.5) * force
        }

        Body.applyForce(playerData.body, pos, { x: fx, y: fy })
      })
    }, 1000 / 60)
  }

  stopBotAI() {
    if (this.botInterval) {
      clearInterval(this.botInterval)
      this.botInterval = null
    }
  }

  startCountdown() {
    this.gameState.status = 'countdown'
    this.gameState.countdown = 3
    this.broadcastGameState()

    const countdownInterval = setInterval(() => {
      this.gameState.countdown--
      this.broadcastGameState()

      if (this.gameState.countdown <= 0) {
        clearInterval(countdownInterval)
        this.startGame()
      }
    }, 1000)
  }

  startGame() {
    this.gameState.status = 'playing'
    this.gameState.timeRemaining = 30
    this.broadcastGameState()
    this.startBotAI()

    // Clear old game loop
    if (this.gameLoop) clearInterval(this.gameLoop)

    let frameCount = 0

    // Start game loop at 60fps
    this.gameLoop = setInterval(() => {
      frameCount++

      // Update time and arena size every tick
      this.gameState.timeRemaining = Math.max(0, 30 - frameCount / 60)
      const elapsed = frameCount / 60
      this.gameState.arenaRadius = Math.max(80, 300 - elapsed * 7)

      // Run physics
      this.updatePhysics()

      // Check elimination every tick
      const centerX = 400
      const centerY = 400
      let activePlayers = 0
      let lastActiveId = ''

      this.players.forEach((playerData, playerId) => {
        if (this.gameState.players[playerId].eliminated) {
          return
        }

        const dist = Math.hypot(playerData.body.position.x - centerX, playerData.body.position.y - centerY)

        if (dist > this.gameState.arenaRadius) {
          this.gameState.players[playerId].eliminated = true
          // Remove physics body so they can't collide with alive players or re-enter
          World.remove(this.engine.world, playerData.body)
        }

        if (!this.gameState.players[playerId].eliminated) {
          activePlayers++
          lastActiveId = playerId
        }
      })

      // End round if time is up or only 1 player left
      if (this.gameState.timeRemaining <= 0 || activePlayers <= 1) {
        this.endRound(lastActiveId, activePlayers)
        clearInterval(this.gameLoop!)
        return
      }

      // Broadcast at ~20fps (every 3rd frame) instead of every frame
      if (frameCount % 3 === 0) {
        this.broadcastGameState()
      }
    }, 1000 / 60)
  }

  updatePhysics() {
    Engine.update(this.engine)

    // Sync Matter.js body positions into game state
    this.players.forEach((playerData, playerId) => {
      const body = playerData.body
      if (this.gameState.players[playerId]) {
        this.gameState.players[playerId].x = body.position.x
        this.gameState.players[playerId].y = body.position.y
        this.gameState.players[playerId].angle = body.angle
        this.gameState.players[playerId].vx = body.velocity.x
        this.gameState.players[playerId].vy = body.velocity.y
      }
    })
  }

  endRound(lastActiveId: string, activePlayers: number) {
    this.stopBotAI()
    if (this.gameLoop) clearInterval(this.gameLoop)

    // Find the round winner (last non-eliminated player among active tournament players)
    const activeInRound = Object.entries(this.gameState.players).filter(
      ([id, p]) => !p.eliminated && !this.gameState.promotedPlayers.includes(id)
    )

    let roundWinnerId: string | undefined

    if (activeInRound.length === 1) {
      roundWinnerId = activeInRound[0][0]
    } else if (activeInRound.length === 0 && lastActiveId) {
      // Edge case: everyone eliminated at once, pick the last one tracked
      roundWinnerId = lastActiveId
    } else if (activeInRound.length > 1) {
      // Time ran out with multiple alive — pick the one closest to center
      let bestDist = Infinity
      for (const [id] of activeInRound) {
        const p = this.gameState.players[id]
        const dist = Math.hypot(p.x - 400, p.y - 400)
        if (dist < bestDist) {
          bestDist = dist
          roundWinnerId = id
        }
      }
    }

    if (!roundWinnerId) return

    // How many players are still in the tournament (not yet promoted)?
    const remainingInTournament = [...this.players.keys()].filter(
      (id) => !this.gameState.promotedPlayers.includes(id)
    )

    // Check if this was the final round (only 2 players were competing)
    if (remainingInTournament.length <= 2) {
      // This is the final round! The winner is promoted, the other is the LOSER
      const loserId = remainingInTournament.find((id) => id !== roundWinnerId)
      this.gameState.promotedPlayers.push(roundWinnerId)
      this.gameState.roundWinner = roundWinnerId
      this.gameState.tournamentLoser = loserId
      this.gameState.status = 'finished'
      this.broadcastGameState()
    } else {
      // More rounds to go — promote the winner and start next round after a pause
      this.gameState.promotedPlayers.push(roundWinnerId)
      this.gameState.roundWinner = roundWinnerId
      this.gameState.status = 'roundEnd'
      this.broadcastGameState()

      // Auto-start next round after 4 seconds
      setTimeout(() => {
        this.startNextRound()
      }, 4000)
    }
  }

  broadcastGameState() {
    const message = JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
    })

    this.room.broadcast(message, [])
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id)
    delete this.gameState.players[conn.id]

    // Check if only bots remain
    const humanPlayers = [...this.players.values()].filter((p) => !p.isBot)
    if (humanPlayers.length === 0) {
      if (this.gameLoop) clearInterval(this.gameLoop)
      this.stopBotAI()
      // Remove all bots too
      for (const [id, p] of this.players) {
        if (p.isBot) {
          World.remove(this.engine.world, p.body)
          this.players.delete(id)
          delete this.gameState.players[id]
        }
      }
      this.gameState.status = 'waiting'
      this.gameState.timeRemaining = 30
      this.gameState.tournamentRound = 0
      this.gameState.totalRounds = 0
      this.gameState.promotedPlayers = []
    }
  }
}
