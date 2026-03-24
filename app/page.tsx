'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const createRoom = () => {
    if (!playerName.trim()) return

    setLoading(true)
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase()
    const encoded = btoa(JSON.stringify({ playerName, roomId: newRoomId }))
    router.push(`/game/${newRoomId}?player=${encoded}`)
  }

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) return

    setLoading(true)
    const encoded = btoa(JSON.stringify({ playerName, roomId: roomId.toUpperCase() }))
    router.push(`/game/${roomId.toUpperCase()}?player=${encoded}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-2 tracking-tighter">BUMPER CAR</h1>
          <p className="text-xl text-amber-400 font-semibold">BATTLE ROYALE</p>
          <p className="text-sm text-slate-400 mt-4">Up to 16 Players • Tournament Mode • Find the Ultimate Loser</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-200 mb-2">PLAYER NAME</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
            />
          </div>

          <div className="space-y-4 mb-8">
            <Button
              onClick={createRoom}
              disabled={!playerName.trim() || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-12 rounded-lg"
            >
              {loading ? 'CREATING...' : 'CREATE GAME'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/50 text-slate-400">OR</span>
              </div>
            </div>
          </div>

          {/* Join Game Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">ROOM ID</label>
            <Input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            />

            <Button
              onClick={joinRoom}
              disabled={!playerName.trim() || !roomId.trim() || loading}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold h-12 rounded-lg"
            >
              {loading ? 'JOINING...' : 'JOIN GAME'}
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-800/30 rounded p-4">
            <p className="text-amber-400 text-lg font-bold">16</p>
            <p className="text-slate-400 text-xs">Max Players</p>
          </div>
          <div className="bg-slate-800/30 rounded p-4">
            <p className="text-amber-400 text-lg font-bold">N-1</p>
            <p className="text-slate-400 text-xs">Rounds</p>
          </div>
          <div className="bg-slate-800/30 rounded p-4">
            <p className="text-red-400 text-lg font-bold">1</p>
            <p className="text-slate-400 text-xs">Loser</p>
          </div>
        </div>
      </div>
    </main>
  )
}
