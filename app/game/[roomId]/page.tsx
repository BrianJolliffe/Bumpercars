'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PartySocket from 'partysocket'
import { GameCanvas } from '@/components/game-canvas'
import { Button } from '@/components/ui/button'
import { GameState } from '@/lib/game/types'

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [roomCode, setRoomCode] = useState<string>(resolvedParams.roomId)
  const socketRef = useRef<PartySocket | null>(null)
  const keysRef = useRef({ w: false, a: false, s: false, d: false })

  useEffect(() => {
    // Decode player info from URL
    try {
      const playerData = searchParams.get('player')
      if (playerData) {
        const decoded = JSON.parse(atob(playerData))
        setPlayerName(decoded.playerName)
      }
    } catch (e) {
      console.error('Failed to decode player data')
    }
  }, [searchParams])

  useEffect(() => {
    if (!playerName) return

    // Connect to PartyKit server
    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999',
      room: resolvedParams.roomId,
      party: 'bumpercar',
      query: { name: playerName },
    })

    socket.onopen = () => {
      console.log('[v0] Connected to PartyKit')
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'init') {
          setPlayerId(data.playerId)
          setGameState(data.gameState)
          setRoomCode(resolvedParams.roomId)
        } else if (data.type === 'gameState') {
          setGameState(data.gameState)
        }
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    socket.onerror = (error: Event) => {
      console.error('[v0] WebSocket error:', error)
    }

    socketRef.current = socket

    return () => {
      socket.close()
    }
  }, [playerName, resolvedParams.roomId])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') {
        keysRef.current.w = true
        e.preventDefault()
      }
      if (key === 'a' || key === 'arrowleft') {
        keysRef.current.a = true
        e.preventDefault()
      }
      if (key === 's' || key === 'arrowdown') {
        keysRef.current.s = true
        e.preventDefault()
      }
      if (key === 'd' || key === 'arrowright') {
        keysRef.current.d = true
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') keysRef.current.w = false
      if (key === 'a' || key === 'arrowleft') keysRef.current.a = false
      if (key === 's' || key === 'arrowdown') keysRef.current.s = false
      if (key === 'd' || key === 'arrowright') keysRef.current.d = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Send input to server every frame
  useEffect(() => {
    if (!socketRef.current || !playerId) return

    const interval = setInterval(() => {
      socketRef.current?.send(
        JSON.stringify({
          type: 'input',
          keys: keysRef.current,
        })
      )
    }, 1000 / 60)

    return () => clearInterval(interval)
  }, [playerId])

  if (!gameState) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-200 text-lg">Connecting to game...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {gameState.status === 'waiting' && <LobbyView gameState={gameState} roomCode={roomCode} playerName={playerName} socketRef={socketRef} />}
      {(gameState.status === 'countdown' || gameState.status === 'playing') && (
        <GameView gameState={gameState} playerId={playerId} playerName={playerName} />
      )}
      {gameState.status === 'countdown' && <CountdownOverlay countdown={gameState.countdown} round={gameState.tournamentRound} totalRounds={gameState.totalRounds} />}
      {gameState.status === 'roundEnd' && <RoundEndOverlay gameState={gameState} playerId={playerId} />}
      {gameState.status === 'finished' && <LoserView gameState={gameState} playerId={playerId} socketRef={socketRef} />}
    </main>
  )
}

function LobbyView({
  gameState,
  roomCode,
  playerName,
  socketRef,
}: {
  gameState: GameState
  roomCode: string
  playerName: string
  socketRef: React.RefObject<PartySocket | null>
}) {
  const playerCount = Object.keys(gameState.players).length
  const canStart = playerCount >= 2

  const handleStartGame = () => {
    socketRef.current?.send(JSON.stringify({ type: 'startGame' }))
  }

  const handleAddBot = () => {
    socketRef.current?.send(JSON.stringify({ type: 'addBot' }))
  }

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-5xl font-bold text-white mb-2 text-center">BUMPER CAR</h1>
      <p className="text-center text-amber-400 text-xl font-semibold mb-2">BATTLE ROYALE</p>
      <p className="text-center text-slate-500 text-sm mb-12">Tournament Mode — Last one standing each round is safe. Final loser takes the L.</p>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur mb-8">
        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-2">ROOM CODE</p>
          <p className="text-3xl font-bold text-amber-400 font-mono">{roomCode}</p>
        </div>

        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-4">PLAYERS JOINED ({playerCount}/16)</p>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {Object.values(gameState.players).map((player) => (
              <div key={player.id} className="bg-slate-900 rounded p-3 border border-slate-700">
                <p className="text-white font-semibold">{player.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAddBot}
            disabled={playerCount >= 16}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold h-10 rounded-lg disabled:opacity-50"
          >
            ADD BOT
          </Button>
          <Button
            onClick={handleStartGame}
            disabled={!canStart}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-12 rounded-lg disabled:opacity-50"
          >
            {canStart ? 'START TOURNAMENT' : 'NEED AT LEAST 2 PLAYERS'}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-slate-400 text-sm">Share room code to invite friends</p>
      </div>
    </div>
  )
}

function CountdownOverlay({ countdown, round, totalRounds }: { countdown: number; round: number; totalRounds: number }) {
  const isFinal = round === totalRounds

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-2 drop-shadow-lg">
          {isFinal ? 'FINAL ROUND' : `ROUND ${round} of ${totalRounds}`}
        </p>
        <p className="text-slate-300 text-2xl font-semibold mb-4 drop-shadow-lg">GET READY</p>
        <p className="text-9xl font-black text-amber-400 animate-pulse drop-shadow-[0_0_40px_rgba(251,191,36,0.5)]">
          {countdown > 0 ? countdown : 'GO!'}
        </p>
      </div>
    </div>
  )
}

function GameView({
  gameState,
  playerId,
  playerName,
}: {
  gameState: GameState
  playerId: string
  playerName: string
}) {
  const currentPlayer = gameState.players[playerId]
  const activePlayers = Object.values(gameState.players).filter((p) => !p.eliminated)
  const isFinal = gameState.tournamentRound === gameState.totalRounds
  const isPromoted = gameState.promotedPlayers.includes(playerId)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {isFinal ? 'FINAL ROUND' : `ROUND ${gameState.tournamentRound}`}
          </h2>
          <p className="text-amber-400 font-mono">
            {activePlayers.length} fighting • {gameState.promotedPlayers.length} safe
          </p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-bold text-amber-400 font-mono">{gameState.timeRemaining.toFixed(1)}s</p>
          <p className="text-slate-400 text-sm">Remaining</p>
        </div>
      </div>

      <GameCanvas gameState={gameState} playerId={playerId} />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-slate-400 text-xs">Status</p>
          <p className={`font-bold ${isPromoted ? 'text-green-400' : currentPlayer?.eliminated ? 'text-red-400' : 'text-white'}`}>
            {isPromoted ? 'SAFE' : currentPlayer?.eliminated ? 'ELIMINATED' : 'FIGHTING'}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-slate-400 text-xs">Round</p>
          <p className="text-white font-bold">{gameState.tournamentRound} / {gameState.totalRounds}</p>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-slate-400 text-xs">Players Left</p>
          <p className="text-white font-bold text-lg">{activePlayers.length}</p>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-slate-400 text-xs">Controls</p>
          <p className="text-white font-bold text-sm">WASD / Arrows</p>
        </div>
      </div>
    </div>
  )
}

function RoundEndOverlay({ gameState, playerId }: { gameState: GameState; playerId: string }) {
  const roundWinnerName = gameState.roundWinner ? gameState.players[gameState.roundWinner]?.name : 'Unknown'
  const isYouTheWinner = gameState.roundWinner === playerId
  const remainingCount = Object.keys(gameState.players).length - gameState.promotedPlayers.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="text-center max-w-lg px-4">
        <p className="text-6xl mb-4">{isYouTheWinner ? '🛡️' : '⚔️'}</p>

        <h2 className="text-4xl font-black text-amber-400 mb-2">ROUND {gameState.tournamentRound} COMPLETE</h2>

        <div className="bg-slate-800/60 border border-amber-500/30 rounded-xl p-6 mb-6">
          <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Survivor</p>
          <p className="text-3xl font-black text-green-400">
            {roundWinnerName}
            {isYouTheWinner && <span className="text-lg text-slate-400 ml-2">(you!)</span>}
          </p>
          <p className="text-slate-500 text-sm mt-2">is now safe from elimination</p>
        </div>

        <p className="text-slate-400 text-lg">
          <span className="text-amber-400 font-bold">{remainingCount}</span> players remain — next round starting...
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LoserView({
  gameState,
  playerId,
  socketRef,
}: {
  gameState: GameState
  playerId: string
  socketRef: React.RefObject<PartySocket | null>
}) {
  const loserId = gameState.tournamentLoser
  const loserName = loserId ? gameState.players[loserId]?.name : 'Unknown'
  const isYouTheLoser = loserId === playerId
  const totalPlayers = Object.keys(gameState.players).length
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sad particle effect — falling grey/red particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number; y: number; vx: number; vy: number
      size: number; color: string; rotation: number; rotationSpeed: number
      life: number; shape: 'rect' | 'circle'
    }> = []

    const colors = isYouTheLoser
      ? ['#ef4444', '#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#374151']
      : ['#fbbf24', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4']

    // Initial burst
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = isYouTheLoser ? 1 + Math.random() * 4 : 2 + Math.random() * 8
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.3,
        vx: Math.cos(angle) * speed,
        vy: isYouTheLoser ? Math.abs(Math.sin(angle) * speed) : Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      })
    }

    let frameId: number
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Spawn continuous particles from top
      if (particles.length < 300) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 3,
            size: 3 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            life: 1,
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
          })
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.vy += 0.08
        p.y += p.vy
        p.vx *= 0.99
        p.rotation += p.rotationSpeed
        p.life -= 0.002

        if (p.y > canvas.height + 20 || p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = Math.min(1, p.life * 2)
        ctx.fillStyle = p.color

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [isYouTheLoser])

  // Build standings: promoted players in reverse order (first promoted = best), then the loser last
  const standings = [
    ...gameState.promotedPlayers.map((id) => ({
      id,
      name: gameState.players[id]?.name || 'Unknown',
      status: 'safe' as const,
    })),
    ...(loserId ? [{
      id: loserId,
      name: loserName,
      status: 'loser' as const,
    }] : []),
  ]

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Radial glow background */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] ${
          isYouTheLoser ? 'bg-red-500/20' : 'bg-amber-500/20'
        }`} />
      </div>

      <div className="relative z-20 max-w-2xl w-full mx-auto text-center px-4">
        {/* Big loser reveal */}
        <div className="mb-6">
          <span className="text-8xl">{isYouTheLoser ? '💀' : '🏆'}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-5xl font-black text-slate-400 mb-3 tracking-tight uppercase">Tournament Over</h1>
          <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-8 mb-4">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">THE ULTIMATE LOSER</p>
            <p className="text-6xl font-black text-red-400 animate-pulse">
              {loserName}
            </p>
            {isYouTheLoser && (
              <p className="text-red-300/60 text-lg mt-2">That&apos;s you. Better luck next time.</p>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Survived {gameState.totalRounds - 1} rounds... then lost the final 1v1
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 mb-10">
          <div className="text-center">
            <p className="text-3xl font-black text-amber-400">{totalPlayers}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Players</p>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-black text-amber-400">{gameState.totalRounds}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Rounds</p>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-black text-red-400">1</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Loser</p>
          </div>
        </div>

        {/* Final standings */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm mb-8">
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Tournament Standings</p>
          <div className="space-y-2">
            {standings.map((entry, idx) => {
              const isLoserEntry = entry.status === 'loser'
              const isYou = entry.id === playerId
              const rank = idx + 1
              return (
                <div
                  key={entry.id}
                  className={`flex justify-between items-center rounded-lg p-3 transition-all ${
                    isLoserEntry
                      ? 'bg-red-500/10 border border-red-500/30'
                      : rank === 1
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black w-8 ${
                      isLoserEntry ? 'text-red-400' : rank === 1 ? 'text-amber-400' : 'text-slate-600'
                    }`}>
                      #{rank}
                    </span>
                    <span className={`font-semibold ${
                      isLoserEntry ? 'text-red-300' : rank === 1 ? 'text-amber-300' : 'text-slate-400'
                    }`}>
                      {entry.name}
                      {isYou && <span className="text-xs ml-2 text-slate-500">(you)</span>}
                    </span>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isLoserEntry ? 'text-red-400' : rank === 1 ? 'text-amber-400' : 'text-green-400/60'
                  }`}>
                    {isLoserEntry ? 'LOSER' : rank === 1 ? 'CHAMPION' : 'SAFE'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => socketRef.current?.send(JSON.stringify({ type: 'restartGame' }))}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-12 py-4 rounded-xl text-lg transition-all hover:scale-105"
          >
            REMATCH
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105"
          >
            NEW GAME
          </Button>
        </div>
      </div>
    </div>
  )
}
