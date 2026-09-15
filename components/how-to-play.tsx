export function HowToPlay() {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
      <h3 className="text-lg font-bold text-white mb-4">HOW TO PLAY</h3>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-amber-400 font-semibold mb-1">Drive</p>
            <p className="text-slate-300">
              <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">WASD</span> or{' '}
              <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">Arrows</span> — or drag the
              on-screen stick on a phone. Cars carry their momentum and take a beat to turn, so commit to a line and
              think about your angle of attack.
            </p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">Dash</p>
            <p className="text-slate-300">
              <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">SPACE</span> fires a burst
              of speed, aimed where you&apos;re steering. A dashing car hits far harder and takes far less. Every car
              wears an orange ring showing its dash — so you can see exactly who just burned theirs.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-amber-400 font-semibold mb-1">Score</p>
            <p className="text-slate-300">
              The longer you survive the more points you take, but a knockout is worth{' '}
              <span className="font-semibold text-amber-400">+5</span> — hunting beats hiding. If whoever knocked you
              out goes out too, that&apos;s <span className="font-semibold text-amber-400">+3</span> revenge.
            </p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">The floor moves</p>
            <p className="text-slate-300">
              The ring shrinks <em>and</em> wanders, so there is no safe spot to park. Pillars turn up from round 2 on.
              Knocked out? Call who you think survives for <span className="font-semibold text-amber-400">+2</span>.
              Last comes <span className="font-semibold text-red-400">sudden death</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
