/**
 * Tiny Web Audio synth — every sound is generated, so there are no assets to load.
 * Browsers block audio until a user gesture, so `unlockAudio` is called from the
 * first click and everything before that is a silent no-op.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)
  }
  return ctx
}

export function unlockAudio() {
  const c = ensure()
  if (c && c.state === 'suspended') void c.resume()
}

export function setMuted(value: boolean) {
  muted = value
  if (master) master.gain.value = value ? 0 : 0.35
}

export function isMuted() {
  return muted
}

function tone(opts: {
  freq: number
  endFreq?: number
  duration: number
  type?: OscillatorType
  gain?: number
  delay?: number
}) {
  const c = ensure()
  if (!c || !master || muted) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + opts.duration)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.duration + 0.02)
}

function noise(duration: number, gain: number, filterFreq: number, sweepTo?: number) {
  const c = ensure()
  if (!c || !master || muted) return
  const t0 = c.currentTime
  const frames = Math.floor(c.sampleRate * duration)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(filterFreq, t0)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t0)
}

/** Metallic thud; heavier hits are lower and louder. */
export function playHit(power: number, dashed: boolean) {
  const p = Math.max(0.08, Math.min(1, power))
  // Squared so light contact stays background texture and real hits punch.
  const loudness = p * p
  tone({
    freq: 220 - p * 90,
    endFreq: 60,
    duration: 0.09 + p * 0.12,
    type: 'square',
    gain: 0.05 + loudness * 0.32,
  })
  noise(0.06 + p * 0.08, 0.04 + loudness * 0.3, 1400 + p * 1800, 300)
  if (dashed) tone({ freq: 900, endFreq: 300, duration: 0.14, type: 'sawtooth', gain: 0.16 })
}

export function playDash() {
  tone({ freq: 320, endFreq: 1100, duration: 0.18, type: 'sawtooth', gain: 0.16 })
  noise(0.16, 0.16, 900, 3000)
}

export function playElimination(isFinal: boolean) {
  tone({ freq: 160, endFreq: 40, duration: isFinal ? 0.6 : 0.35, type: 'triangle', gain: 0.34 })
  noise(isFinal ? 0.5 : 0.3, 0.34, 2200, 120)
  if (isFinal) tone({ freq: 90, endFreq: 30, duration: 0.7, type: 'sine', gain: 0.28, delay: 0.05 })
}

export function playCountdownBeep() {
  tone({ freq: 660, duration: 0.12, type: 'square', gain: 0.2 })
}

export function playGo() {
  tone({ freq: 880, duration: 0.18, type: 'square', gain: 0.26 })
  tone({ freq: 1320, duration: 0.24, type: 'square', gain: 0.2, delay: 0.06 })
}

/** Rising two-note sting when you survive a round. */
export function playRoundWin() {
  tone({ freq: 523, duration: 0.16, type: 'triangle', gain: 0.26 })
  tone({ freq: 784, duration: 0.28, type: 'triangle', gain: 0.24, delay: 0.14 })
}

export function playFanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => tone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.24, delay: i * 0.11 }))
}

export function playSadTrombone() {
  const notes = [392, 370, 349, 330]
  notes.forEach((f, i) => tone({ freq: f, duration: 0.34, type: 'sawtooth', gain: 0.18, delay: i * 0.16 }))
}

/** Warning pip as the arena tightens. */
export function playShrinkWarning() {
  tone({ freq: 300, endFreq: 180, duration: 0.22, type: 'triangle', gain: 0.16 })
}
