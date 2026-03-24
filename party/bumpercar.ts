import type * as Party from 'partykit/server'
import * as Matter from 'matter-js'

const { Engine, World, Bodies, Events, Body } = Matter

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
  status: 'waiting' | 'playing' | 'finished'
  players: Record<string, Player>
  winner?: string
  timeRemaining: number
  arenaRadius: number
}

export default class BumperCarParty implements Party.Server {
  engine: Matter.Engine
  gameState: GameState
  players: Map<string, { socket: Party.Connection; body: Matter.Body }>
  lastUpdateTime: number
  gameLoop: NodeJS.Timer | null = null

  constructor(public room: Party.Room) {
    this.engine = Engine.create()
    this.engine.gravity.y = 0
    this.engine.gravity.x = 0

    this.gameState = {
      status: 'waiting',
      players: {},
      timeRemaining: 30,
      arenaRadius: 300,
    }

    this.players = new Map()
    this.lastUpdateTime = Date.now()

    // Create walls for the circular arena
    this.createArena()
  }

  createArena() {
    const centerX = 400
    const centerY = 400
    const radius = this.gameState.arenaRadius

    // Create circular boundary using segments
    const segments = 32
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2
      const angle2 = ((i + 1) / segments) * Math.PI * 2

      const x1 = centerX + Math.cos(angle1) * radius
      const y1 = centerY + Math.sin(angle1) * radius
      const x2 = centerX + Math.cos(angle2) * radius
      const y2 = centerY + Math.sin(angle2) * radius

      const wall = Bodies.rectangle(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        Math.hypot(x2 - x1, y2 - y1),
        20,
        { angle: Math.atan2(y2 - y1, x2 - x1), isStatic: true }
      )
      World.add(this.engine.world, wall)
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = conn.id
    const playerName = `Player ${this.players.size + 1}`

    // Create car body (circle for simplicity)
    const car = Bodies.circle(200 + Math.random() * 400, 200 + Math.random() * 400, 15, {
      friction: 0.01,
      restitution: 0.9,
      label: 'car',
    })

    World.add(this.engine.world, car)

    this.players.set(playerId, { socket: conn, body: car })
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

    // Start game if we have enough players
    if (this.players.size === 1) {
      this.broadcastGameState()
    }

    if (this.players.size >= 2 && this.gameState.status === 'waiting') {
      this.startGame()
    }

    // Send initial state to new player
    conn.send(
      JSON.stringify({
        type: 'init',
        playerId,
        gameState: this.gameState,
      })
    )
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message)

      if (data.type === 'input') {
        const player = this.players.get(sender.id)
        if (player) {
          // Apply forces based on input
          const force = 0.01
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

  startGame() {
    this.gameState.status = 'playing'
    this.gameState.timeRemaining = 30
    this.broadcastGameState()

    // Clear old game loop
    if (this.gameLoop) clearInterval(this.gameLoop)

    let frameCount = 0

    // Start game loop at 60fps
    this.gameLoop = setInterval(() => {
      frameCount++
      this.updatePhysics()

      // Update game state every 30 frames (2x per second)
      if (frameCount % 30 === 0) {
        this.gameState.timeRemaining = Math.max(0, 30 - frameCount / 60)
        
        // Shrink arena gradually
        const elapsed = frameCount / 60
        this.gameState.arenaRadius = Math.max(80, 300 - elapsed * 7)

        // Check if players are outside arena
        const centerX = 400
        const centerY = 400
        let activePlayers = 0

        this.players.forEach((playerData, playerId) => {
          const dist = Math.hypot(playerData.body.position.x - centerX, playerData.body.position.y - centerY)
          const wasEliminated = this.gameState.players[playerId].eliminated
          
          if (dist > this.gameState.arenaRadius && !wasEliminated) {
            this.gameState.players[playerId].eliminated = true
          }

          if (!this.gameState.players[playerId].eliminated) {
            activePlayers++
          }
        })

        // End game if time is up or only 1 player left
        if (this.gameState.timeRemaining <= 0 || activePlayers <= 1) {
          this.endGame()
          clearInterval(this.gameLoop!)
        } else {
          this.broadcastGameState()
        }
      }
    }, 1000 / 60)
  }

  updatePhysics() {
    Engine.update(this.engine)

    // Update game state with latest positions
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

    this.broadcastGameState()
  }

  endGame() {
    this.gameState.status = 'finished'

    // Find winner (last non-eliminated player or the one standing if game ended by time)
    const activePlayers = Object.entries(this.gameState.players).filter(([_, p]) => !p.eliminated)

    if (activePlayers.length === 1) {
      this.gameState.winner = activePlayers[0][0]
    }

    if (this.gameLoop) clearInterval(this.gameLoop)
    this.broadcastGameState()
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

    if (this.players.size === 0) {
      if (this.gameLoop) clearInterval(this.gameLoop)
      this.gameState.status = 'waiting'
      this.gameState.timeRemaining = 30
    }
  }
}
