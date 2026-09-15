'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useSearchParams } from 'next/navigation'
import PartySocket from 'partysocket'
import { GameCanvas } from '@/components/game-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GameState, Player } from '@/lib/game/types'
import { getPlayerHex } from '@/lib/game/colors'
import { HowToPlay } from '@/components/how-to-play'
import {
  unlockAudio,
  setMuted,
  playCountdownBeep,
  playGo,
  playRoundWin,
  playFanfare,
  playSadTrombone,
} from '@/lib/game/audio'

/** Matches DASH_COOLDOWN in party/bumpercar.ts. */
const DASH_COOLDOWN_MS = 2000

function rankPlayers(players: Record<string, Player>): Player[] {
  return Object.values(players).sort((a, b) => b.score - a.score || b.totalKills - a.totalKills)
}

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [nameInput, setNameInput] = useState<string>('')
  const [needsName, setNeedsName] = useState(false)
  const [muted, setMutedState] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const socketRef = useRef<PartySocket | null>(null)
  const keysRef = useRef({ w: false, a: false, s: false, d: false })
  /** Steering vector actually sent to the server — analog on touch, unit on keys. */
  const dirRef = useRef({ x: 0, y: 0 })
  const dashNonceRef = useRef(0)
  const dashReadyAtRef = useRef(0)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    try {
      const playerData = searchParams.get('player')
      if (playerData) {
        setPlayerName(JSON.parse(atob(playerData)).playerName)
      } else {
        setNeedsName(true)
      }
    } catch {
      setNeedsName(true)
    }
  }, [searchParams])

  // Browsers keep audio muted until the player interacts with the page.
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!playerName) return

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999',
      room: resolvedParams.roomId,
      party: 'bumpercar',
      query: { name: playerName },
    })

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'init') {
          setPlayerId(data.playerId)
          setGameState(data.gameState)
        } else if (data.type === 'gameState') {
          setGameState(data.gameState)
        }
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    socketRef.current = socket
    return () => socket.close()
  }, [playerName, resolvedParams.roomId])

  const sendInput = () => {
    socketRef.current?.send(
      JSON.stringify({ type: 'input', keys: keysRef.current, dir: dirRef.current })
    )
  }

  /** Collapse the current key state into a unit steering vector, then push it. */
  const syncKeyDirection = () => {
    const x = (keysRef.current.d ? 1 : 0) - (keysRef.current.a ? 1 : 0)
    const y = (keysRef.current.s ? 1 : 0) - (keysRef.current.w ? 1 : 0)
    const len = Math.hypot(x, y)
    dirRef.current = len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
    sendInput()
  }

  const setTouchDirection = (x: number, y: number) => {
    dirRef.current = { x, y }
    sendInput()
  }

  const sendDash = () => {
    // Mirror the server's cooldown locally. Without this, mashing Space predicts
    // dashes the server rejects and the car rubber-bands on every press.
    const now = performance.now()
    if (now < dashReadyAtRef.current) return
    dashReadyAtRef.current = now + DASH_COOLDOWN_MS
    dashNonceRef.current++
    socketRef.current?.send(JSON.stringify({ type: 'dash' }))
  }

  const predictSurvivor = (id: string) =>
    socketRef.current?.send(JSON.stringify({ type: 'predictSurvivor', playerId: id }))

  useEffect(() => {
    const keyFor = (raw: string): 'w' | 'a' | 's' | 'd' | null => {
      const key = raw.toLowerCase()
      if (key === 'w' || key === 'arrowup') return 'w'
      if (key === 'a' || key === 'arrowleft') return 'a'
      if (key === 's' || key === 'arrowdown') return 's'
      if (key === 'd' || key === 'arrowright') return 'd'
      return null
    }

    const isTyping = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA'
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) sendDash()
        return
      }

      const k = keyFor(e.key)
      if (!k) return
      e.preventDefault()
      if (keysRef.current[k]) return
      keysRef.current[k] = true
      syncKeyDirection()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const k = keyFor(e.key)
      if (!k) return
      keysRef.current[k] = false
      syncKeyDirection()
    }

    // Losing focus mid-press would otherwise leave a key stuck down.
    const handleBlur = () => {
      keysRef.current = { w: false, a: false, s: false, d: false }
      syncKeyDirection()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Cheap keepalive so a dropped packet can't leave the server steering blind.
  useEffect(() => {
    if (!playerId) return
    const interval = setInterval(sendInput, 200)
    return () => clearInterval(interval)
  }, [playerId])

  const status = gameState?.status
  const countdown = gameState?.countdown
  useEffect(() => {
    if (status !== 'countdown' || countdown === undefined) return
    if (countdown > 0) playCountdownBeep()
    else playGo()
  }, [status, countdown])

  const survivor = gameState?.roundSurvivor
  useEffect(() => {
    if (status === 'roundEnd' && survivor && survivor === playerId) playRoundWin()
  }, [status, survivor, playerId])

  const champion = gameState?.champion
  const ultimateLoser = gameState?.ultimateLoser
  useEffect(() => {
    if (status !== 'finished') return
    if (ultimateLoser === playerId) playSadTrombone()
    else if (champion === playerId) playFanfare()
  }, [status, champion, ultimateLoser, playerId])

  const toggleMute = () => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }

  const muteButton = (
    <button
      onClick={toggleMute}
      className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"
    >
      {muted ? 'SOUND OFF' : 'SOUND ON'}
    </button>
  )

  if (needsName) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-white mb-2 text-center">BUMPER CAR</h1>
          <p className="text-center text-amber-400 font-semibold mb-8">JOINING ROOM {resolvedParams.roomId}</p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
            <label className="block text-sm font-semibold text-slate-200 mb-2">YOUR NAME</label>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  setPlayerName(nameInput.trim())
                  setNeedsName(false)
                }
              }}
            />
            <Button
              onClick={() => {
                if (nameInput.trim()) {
                  setPlayerName(nameInput.trim())
                  setNeedsName(false)
                }
              }}
              disabled={!nameInput.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-12 rounded-lg"
            >
              JOIN GAME
            </Button>
          </div>
        </div>
      </main>
    )
  }

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
      {gameState.status === 'waiting' && (
        <LobbyView
          gameState={gameState}
          roomCode={resolvedParams.roomId}
          socketRef={socketRef}
          isHost={gameState.hostId === playerId}
        />
      )}
      {(gameState.status === 'countdown' || gameState.status === 'playing') && (
        <GameView
          gameState={gameState}
          playerId={playerId}
          muteButton={muteButton}
          dirRef={dirRef}
          dashNonceRef={dashNonceRef}
          isTouch={isTouch}
          onPredict={predictSurvivor}
          onSteer={setTouchDirection}
          onDash={sendDash}
        />
      )}
      {gameState.status === 'countdown' && (
        <CountdownOverlay countdown={gameState.countdown} round={gameState.round} totalRounds={gameState.totalRounds} />
      )}
      {gameState.status === 'roundEnd' && <RoundEndOverlay gameState={gameState} playerId={playerId} />}
      {gameState.status === 'finished' && <FinishedView gameState={gameState} playerId={playerId} socketRef={socketRef} />}
    </main>
  )
}

function LobbyView({
  gameState,
  roomCode,
  socketRef,
  isHost,
}: {
  gameState: GameState
  roomCode: string
  socketRef: React.RefObject<PartySocket | null>
  isHost: boolean
}) {
  const players = Object.values(gameState.players)
  const canStart = players.length >= 2

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-5xl font-bold text-white mb-2 text-center">BUMPER CAR</h1>
      <p className="text-center text-amber-400 text-xl font-semibold mb-2">DEMOLITION LEAGUE</p>
      <p className="text-center text-slate-500 text-sm mb-12">
        {gameState.totalRounds} rounds. Everyone plays every round. Survive long, knock people out, and score points —
        lowest total is the Ultimate Loser.
      </p>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur mb-8">
        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-2">ROOM CODE</p>
          <p className="text-3xl font-bold text-amber-400 font-mono mb-3">{roomCode}</p>
          <Button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/game/${roomCode}`)}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm h-8 px-4 rounded"
          >
            COPY INVITE LINK
          </Button>
        </div>

        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-4">PLAYERS JOINED ({players.length}/16)</p>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-slate-900 rounded p-3 border border-slate-700"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: getPlayerHex(player.colorIndex) }}
                />
                <p className="text-white font-semibold truncate">{player.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => socketRef.current?.send(JSON.stringify({ type: 'addBot' }))}
            disabled={!isHost || players.length >= 16}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold h-10 rounded-lg disabled:opacity-50"
          >
            ADD BOT
          </Button>
          <Button
            onClick={() => socketRef.current?.send(JSON.stringify({ type: 'startGame' }))}
            disabled={!isHost || !canStart}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-12 rounded-lg disabled:opacity-50"
          >
            {!isHost ? 'WAITING FOR HOST' : canStart ? 'START LEAGUE' : 'NEED AT LEAST 2 PLAYERS'}
          </Button>
        </div>
      </div>

      <HowToPlay />
    </div>
  )
}

function CountdownOverlay({
  countdown,
  round,
  totalRounds,
}: {
  countdown: number
  round: number
  totalRounds: number
}) {
  const isFinal = round === totalRounds
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-2 drop-shadow-lg">
          {isFinal ? 'FINAL ROUND — 1.5\u00d7 POINTS' : `ROUND ${round} of ${totalRounds}`}
        </p>
        <p className="text-9xl font-black text-amber-400 animate-pulse drop-shadow-[0_0_40px_rgba(251,191,36,0.5)]">
          {countdown > 0 ? countdown : 'GO!'}
        </p>
      </div>
    </div>
  )
}

function Standings({
  gameState,
  playerId,
  showRoundPoints,
}: {
  gameState: GameState
  playerId: string
  showRoundPoints?: boolean
}) {
  const ranked = rankPlayers(gameState.players)

  return (
    <div className="space-y-1.5">
      {ranked.map((p, i) => {
        const isYou = p.id === playerId
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isYou ? 'bg-white/10 ring-1 ring-white/30' : 'bg-slate-900/60'
            } ${p.eliminated && !showRoundPoints ? 'opacity-45' : ''}`}
          >
            <span className="w-5 text-xs font-black text-slate-500">{i + 1}</span>
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: getPlayerHex(p.colorIndex) }}
            />
            <span className={`flex-1 truncate font-semibold ${isYou ? 'text-white' : 'text-slate-300'}`}>
              {p.name}
              {isYou && <span className="ml-1 text-xs text-slate-400">(you)</span>}
            </span>
            {showRoundPoints && p.roundPoints > 0 && (
              <span className="text-xs font-bold text-green-400">+{p.roundPoints}</span>
            )}
            {!showRoundPoints && p.eliminated && <span className="text-[10px] font-bold text-red-400">OUT</span>}
            {!showRoundPoints && !p.eliminated && p.kills > 0 && (
              <span className="text-[10px] font-bold text-amber-400">{p.kills} KO</span>
            )}
            <span className="w-8 text-right font-mono font-bold text-amber-400">{p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

function GameView({
  gameState,
  playerId,
  muteButton,
  dirRef,
  dashNonceRef,
  isTouch,
  onSteer,
  onDash,
  onPredict,
}: {
  gameState: GameState
  playerId: string
  muteButton: React.ReactNode
  dirRef: React.RefObject<{ x: number; y: number }>
  dashNonceRef: React.RefObject<number>
  isTouch: boolean
  onSteer: (x: number, y: number) => void
  onDash: () => void
  onPredict: (id: string) => void
}) {
  const me = gameState.players[playerId]
  const isFinal = gameState.round === gameState.totalRounds

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-white">
            {isFinal ? 'FINAL ROUND' : `ROUND ${gameState.round}`}
            <span className="text-sm font-semibold text-slate-500">of {gameState.totalRounds}</span>
            {isFinal && (
              <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-black text-slate-950">
                1.5&times; POINTS
              </span>
            )}
          </h2>
          <p className="whitespace-nowrap text-sm font-semibold text-slate-400">
            {me?.eliminated ? (
              <span className="text-red-400">You&apos;re out — watching for revenge</span>
            ) : isTouch ? (
              <span>Drag to drive · tap DASH to ram</span>
            ) : (
              <span>
                <span className="text-amber-400">WASD</span> drive · <span className="text-amber-400">SPACE</span> dash
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-3xl font-black text-amber-400">{me?.score ?? 0}</p>
            <p className="whitespace-nowrap text-xs uppercase tracking-widest text-slate-500">Your points</p>
          </div>
          {muteButton}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <GameCanvas gameState={gameState} playerId={playerId} dirRef={dirRef} dashNonceRef={dashNonceRef} />
        </div>
        <aside className="w-full shrink-0 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur lg:w-64">
          <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">League standings</p>
          <Standings gameState={gameState} playerId={playerId} />

          {me?.eliminated && gameState.status === 'playing' && (
            <SurvivorPicker gameState={gameState} me={me} onPredict={onPredict} />
          )}
        </aside>
      </div>

      {isTouch && !me?.eliminated && (
        <TouchControls
          onSteer={onSteer}
          onDash={onDash}
          dashReady={(me?.dashCharge ?? 0) >= 1}
        />
      )}
    </div>
  )
}

/**
 * Being knocked out used to mean staring at the screen with no stake in the
 * round. Calling the survivor is worth points, so you are still playing.
 */
function SurvivorPicker({
  gameState,
  me,
  onPredict,
}: {
  gameState: GameState
  me: Player
  onPredict: (id: string) => void
}) {
  const alive = Object.values(gameState.players).filter((p) => !p.eliminated)
  if (alive.length < 2) return null

  return (
    <div className="mt-4 border-t border-slate-700/60 pt-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">
        Call the survivor <span className="text-amber-400">+2</span>
      </p>
      <div className="space-y-1.5">
        {alive.map((p) => {
          const picked = me.prediction === p.id
          return (
            <button
              key={p.id}
              onClick={() => onPredict(p.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                picked
                  ? 'bg-amber-500/20 ring-1 ring-amber-400/60'
                  : 'bg-slate-900/60 hover:bg-slate-900'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getPlayerHex(p.colorIndex) }}
              />
              <span className={`truncate font-semibold ${picked ? 'text-amber-300' : 'text-slate-300'}`}>
                {p.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const STICK_RADIUS = 56

/**
 * The invite is a link, so plenty of players will open it on a phone. A
 * drag-anywhere stick plus a dash button makes the game playable for them —
 * and the stick is analog, so touch steering is finer than WASD, not coarser.
 */
function TouchControls({
  onSteer,
  onDash,
  dashReady,
}: {
  onSteer: (x: number, y: number) => void
  onDash: () => void
  dashReady: boolean
}) {
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null)

  const updateFrom = (clientX: number, clientY: number) => {
    const origin = originRef.current
    if (!origin) return
    const dx = clientX - origin.x
    const dy = clientY - origin.y
    const dist = Math.hypot(dx, dy)
    const clamped = dist > STICK_RADIUS ? STICK_RADIUS / dist : 1
    const kx = dx * clamped
    const ky = dy * clamped
    setKnob({ x: kx, y: ky })
    onSteer(kx / STICK_RADIUS, ky / STICK_RADIUS)
  }

  const release = () => {
    originRef.current = null
    setKnob(null)
    onSteer(0, 0)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex touch-none items-end justify-between p-6">
      <div
        className="relative h-36 w-36 touch-none rounded-full border-2 border-slate-600/70 bg-slate-900/60 backdrop-blur"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const rect = e.currentTarget.getBoundingClientRect()
          originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          updateFrom(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (originRef.current) updateFrom(e.clientX, e.clientY)
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-amber-500/80"
          style={{ transform: `translate(calc(-50% + ${knob?.x ?? 0}px), calc(-50% + ${knob?.y ?? 0}px))` }}
        />
      </div>

      <button
        onPointerDown={(e) => {
          e.preventDefault()
          onDash()
        }}
        className={`h-24 w-24 touch-none rounded-full border-2 text-sm font-black transition-colors ${
          dashReady
            ? 'border-orange-400 bg-orange-500/80 text-slate-950'
            : 'border-slate-700 bg-slate-800/70 text-slate-500'
        }`}
      >
        DASH
      </button>
    </div>
  )
}

function RoundEndOverlay({ gameState, playerId }: { gameState: GameState; playerId: string }) {
  const survivor = gameState.roundSurvivor ? gameState.players[gameState.roundSurvivor] : undefined
  const youSurvived = gameState.roundSurvivor === playerId
  const me = gameState.players[playerId]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-5xl">{youSurvived ? '🏁' : '💥'}</p>
        <h2 className="mb-1 text-3xl font-black text-amber-400">ROUND {gameState.round} DONE</h2>
        <p className="mb-5 text-slate-400">
          Last car standing: <span className="font-bold text-green-400">{survivor?.name ?? '—'}</span>
        </p>

        {me && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-slate-800/60 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">You scored</p>
            <p className="text-4xl font-black text-green-400">+{me.roundPoints}</p>
            <p className="mt-1 text-xs text-slate-500">
              {me.kills > 0 ? `${me.kills} knockout${me.kills > 1 ? 's' : ''} · ` : ''}
              {me.revenge > 0 ? `${me.revenge} revenge · ` : ''}
              {me.score} total
            </p>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">Standings</p>
          <Standings gameState={gameState} playerId={playerId} showRoundPoints />
        </div>

        <p className="text-sm text-slate-400">
          Round {gameState.round + 1} starting...
        </p>
      </div>
    </div>
  )
}

function FinishedView({
  gameState,
  playerId,
  socketRef,
}: {
  gameState: GameState
  playerId: string
  socketRef: React.RefObject<PartySocket | null>
}) {
  const champion = gameState.champion ? gameState.players[gameState.champion] : undefined
  const loser = gameState.ultimateLoser ? gameState.players[gameState.ultimateLoser] : undefined
  const youWon = gameState.champion === playerId
  const youLost = gameState.ultimateLoser === playerId

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <p className="mb-4 text-7xl">{youWon ? '🏆' : youLost ? '💀' : '🏁'}</p>
      <h1 className="mb-6 text-4xl font-black uppercase tracking-tight text-slate-300">League Over</h1>

      <div className="mb-4 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Champion</p>
        <p className="text-4xl font-black text-amber-400">{champion?.name ?? '—'}</p>
        <p className="mt-1 text-sm text-slate-500">{champion?.score ?? 0} points</p>
        {youWon && <p className="mt-2 text-amber-300/70">That&apos;s you. Undisputed.</p>}
      </div>

      <div className="mb-8 rounded-2xl border-2 border-red-500/40 bg-red-500/10 p-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">The Ultimate Loser</p>
        <p className="text-4xl font-black text-red-400">{loser?.name ?? '—'}</p>
        <p className="mt-1 text-sm text-slate-500">{loser?.score ?? 0} points</p>
        {youLost && <p className="mt-2 text-red-300/70">That&apos;s you. Better luck next time.</p>}
      </div>

      <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 text-left">
        <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">Final table</p>
        <Standings gameState={gameState} playerId={playerId} />
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={() => socketRef.current?.send(JSON.stringify({ type: 'restartGame' }))}
          disabled={gameState.hostId !== playerId}
          className="rounded-xl bg-amber-500 px-10 py-4 text-lg font-black text-slate-950 transition-all hover:scale-105 hover:bg-amber-400 disabled:opacity-50 disabled:hover:scale-100"
        >
          {gameState.hostId === playerId ? 'REMATCH' : 'HOST DECIDES'}
        </Button>
        <Button
          onClick={() => (window.location.href = '/')}
          className="rounded-xl bg-slate-700 px-8 py-4 text-lg font-bold text-white transition-all hover:scale-105 hover:bg-slate-600"
        >
          NEW GAME
        </Button>
      </div>
    </div>
  )
}
