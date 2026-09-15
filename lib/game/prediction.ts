/**
 * Local input prediction for your own car.
 *
 * Everything else is drawn slightly in the past so contact lines up, but
 * applying that same delay to your own steering makes the dash feel like it
 * fires late. This runs the same integration the server runs, from your live
 * key state, and continuously pulls itself back toward the server's truth — so
 * input is immediate while authority still rests with the server.
 *
 * The constants mirror party/bumpercar.ts and Matter's integrator exactly:
 * per 1/60s step, `v = v * (1 - frictionAir) + force / mass * dt^2`.
 */

const CAR_RADIUS = 22
const DENSITY = 0.001
const MOVE_FORCE = 0.0024
const FRICTION_AIR = 0.055
const STEP_MS = 1000 / 60
const STEER_RATE = 0.2
const DASH_SPEED = 7

const MASS = Math.PI * CAR_RADIUS * CAR_RADIUS * DENSITY
const ACCEL_PER_STEP = (MOVE_FORCE / MASS) * STEP_MS * STEP_MS

/** Gentle correction normally; a hard snap when a collision throws us off. */
const MIN_BLEND = 0.12
const SNAP_ERROR = 70
/** Beyond this the prediction is worthless — adopt the server outright. */
const TELEPORT_ERROR = 220

export interface ServerCar {
  x: number
  y: number
  vx: number
  vy: number
}

export class LocalPredictor {
  private x = 0
  private y = 0
  private vx = 0
  private vy = 0
  private steerX = 0
  private steerY = 0
  private primed = false

  reset() {
    this.primed = false
    this.steerX = 0
    this.steerY = 0
  }

  /**
   * Apply the dash locally the instant the key is pressed. Without this the
   * game's primary attack visibly fires a round-trip late.
   */
  dash(dir: { x: number; y: number }) {
    if (!this.primed) return
    let { x, y } = dir
    const len = Math.hypot(x, y)
    if (len < 0.05) {
      const speed = Math.hypot(this.vx, this.vy)
      if (speed < 0.05) return
      x = this.vx / speed
      y = this.vy / speed
    } else {
      x /= len
      y /= len
    }
    this.vx += x * DASH_SPEED
    this.vy += y * DASH_SPEED
  }

  /**
   * Advance the prediction by `dtMs` of real time and reconcile against the
   * newest server state. Returns where the local car should be drawn.
   */
  step(server: ServerCar, dir: { x: number; y: number }, dtMs: number): { x: number; y: number } {
    if (!this.primed) {
      this.adopt(server)
      this.primed = true
      return { x: this.x, y: this.y }
    }

    let dx = dir.x
    let dy = dir.y
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }

    const steps = Math.max(0, Math.min(6, dtMs / STEP_MS))
    const whole = Math.floor(steps)
    for (let i = 0; i < whole; i++) this.integrate(dx, dy, 1)
    const remainder = steps - whole
    if (remainder > 0) this.integrate(dx, dy, remainder)


    const errX = server.x - this.x
    const errY = server.y - this.y
    const error = Math.hypot(errX, errY)

    if (error > TELEPORT_ERROR) {
      this.adopt(server)
      return { x: this.x, y: this.y }
    }

    // Scale the correction with the error so a bump reconciles fast and ordinary
    // drift is eased away without visible rubber-banding.
    const blend = Math.max(MIN_BLEND, Math.min(1, error / SNAP_ERROR))
    this.x += errX * blend
    this.y += errY * blend
    this.vx += (server.vx - this.vx) * blend
    this.vy += (server.vy - this.vy) * blend

    return { x: this.x, y: this.y }
  }

  private integrate(dx: number, dy: number, scale: number) {
    // Mirror the server's turning lag, or prediction and truth diverge on every turn.
    this.steerX += (dx - this.steerX) * STEER_RATE * scale
    this.steerY += (dy - this.steerY) * STEER_RATE * scale
    this.vx = this.vx * (1 - FRICTION_AIR * scale) + this.steerX * ACCEL_PER_STEP * scale
    this.vy = this.vy * (1 - FRICTION_AIR * scale) + this.steerY * ACCEL_PER_STEP * scale
    this.x += this.vx * scale
    this.y += this.vy * scale
  }

  private adopt(server: ServerCar) {
    this.x = server.x
    this.y = server.y
    this.vx = server.vx
    this.vy = server.vy
  }
}
