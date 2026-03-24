'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PartySocket from 'partysocket'
import { GameCanvas } from '@/components/game-canvas'
import { Button } from '@/components/ui/button'

interface GameState {
  status: 'waiting' | 'playing' | 'finished'
  players: Record<string, { id: string; name: string; x: number; y: number; angle: number; eliminated: boolean }>
  winner?: string
  timeRemaining: number
  arenaRadius: number
}

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
    if (!playerName || playerId) return

    // Connect to PartyKit server
    const socket = new PartySocket({
      host: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      room: resolvedParams.roomId,
      party: 'bumpercar',
    })

    socket.onopen = () => {
      console.log('[v0] Connected to PartyKit')
    }

    socket.onmessage = (event) => {
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

    socket.onerror = (error) => {
      console.error('[v0] WebSocket error:', error)
    }

    socketRef.current = socket

    return () => {
      socket.close()
    }
  }, [playerName, playerId, resolvedParams.roomId])

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
      {gameState.status === 'waiting' && <LobbyView gameState={gameState} roomCode={roomCode} playerName={playerName} />}
      {gameState.status === 'playing' && (
        <GameView gameState={gameState} playerId={playerId} playerName={playerName} />
      )}
      {gameState.status === 'finished' && <WinnerView gameState={gameState} playerId={playerId} />}
    </main>
  )
}

function LobbyView({
  gameState,
  roomCode,
  playerName,
}: {
  gameState: GameState
  roomCode: string
  playerName: string
}) {
  const playerCount = Object.keys(gameState.players).length

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-5xl font-bold text-white mb-2 text-center">BUMPER CAR</h1>
      <p className="text-center text-amber-400 text-xl font-semibold mb-12">WAITING FOR PLAYERS</p>

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
                <p className="text-slate-400 text-xs">{player.id}</p>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - playerCount) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-900 rounded p-3 border border-dashed border-slate-600">
                <p className="text-slate-500 font-semibold">Empty Slot</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded p-4 border border-slate-600">
          <p className="text-slate-300 text-sm">
            {playerCount === 1
              ? 'Waiting for more players to join...'
              : `Ready! Game will start when all players are ready or after timeout.`}
          </p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-slate-400 text-sm">Share room code to invite friends</p>
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">BATTLE</h2>
          <p className="text-amber-400 font-mono">Players: {activePlayers.length}/16</p>
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
          <p className="text-white font-bold">{currentPlayer?.eliminated ? 'ELIMINATED' : 'ACTIVE'}</p>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-slate-400 text-xs">Your Name</p>
          <p className="text-white font-bold truncate">{playerName}</p>
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

function WinnerView({
  gameState,
  playerId,
}: {
  gameState: GameState
  playerId: string
}) {
  const isWinner = gameState.winner === playerId
  const winnerName = gameState.players[gameState.winner!]?.name || 'Unknown'

  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <div className="mb-8">
        {isWinner ? (
          <>
            <h1 className="text-6xl font-bold text-amber-400 mb-4">VICTORY!</h1>
            <p className="text-3xl font-bold text-white mb-2">You Won!</p>
          </>
        ) : (
          <>
            <h1 className="text-6xl font-bold text-white mb-4">GAME OVER</h1>
            <p className="text-3xl font-bold text-amber-400">{winnerName} Wins!</p>
          </>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur mb-8">
        <div className="mb-6">
          <p className="text-slate-400 text-sm mb-4">FINAL STANDINGS</p>
          <div className="space-y-2">
            {Object.values(gameState.players)
              .sort((a, b) => (a.eliminated ? 1 : -1))
              .map((player, idx) => (
                <div key={player.id} className="flex justify-between items-center bg-slate-900 rounded p-3">
                  <span className="text-white font-semibold">
                    {idx + 1}. {player.name}
                  </span>
                  <span className={player.eliminated ? 'text-red-400' : 'text-green-400'}>
                    {player.eliminated ? 'ELIMINATED' : 'ACTIVE'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <Button
        onClick={() => window.location.href = '/'}
        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-8 py-3 rounded-lg"
      >
        PLAY AGAIN
      </Button>
    </div>
  )
}
