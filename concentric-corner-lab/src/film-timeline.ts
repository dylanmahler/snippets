import { lerp } from "./radius.ts"

export const FILM_MS = 12000

export type Spot = "park" | "grip" | "concentric"
export type CursorKind = "arrow" | "nw"

export type FilmFrame = {
  outer: number
  padding: 24
  border: 1
  concentric: number
  guides: number
  from: Spot
  to: Spot
  travel: number
  pressed: boolean
  cursor: CursorKind
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function span(time: number, start: number, end: number) {
  if (time <= start) return 0
  if (time >= end) return 1
  return (time - start) / (end - start)
}

function bezier(amount: number, x1: number, y1: number, x2: number, y2: number) {
  const t = clamp01(amount)
  let guess = t
  for (let i = 0; i < 6; i += 1) {
    const x = sample(guess, x1, x2)
    const dx = derivative(guess, x1, x2)
    if (Math.abs(dx) < 1e-6) break
    guess = Math.min(1, Math.max(0, guess - (x - t) / dx))
  }
  return sample(guess, y1, y2)
}

function sample(t: number, p1: number, p2: number) {
  const u = 1 - t
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t
}

function derivative(t: number, p1: number, p2: number) {
  const u = 1 - t
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2)
}

/** Cursor travel. The radius value stays glued to the grip. */
export function easeTravel(amount: number) {
  return bezier(amount, 0.45, 0, 0.1, 1)
}

/** Product correction. No overshoot. */
export function easeOut(amount: number) {
  return bezier(amount, 0.23, 1, 0.32, 1)
}

function frame(partial: Partial<FilmFrame> & Pick<FilmFrame, "outer" | "concentric" | "from">): FilmFrame {
  return {
    padding: 24,
    border: 1,
    guides: 0,
    to: partial.from,
    travel: 1,
    pressed: false,
    cursor: "arrow",
    ...partial,
  }
}

export function filmAt(time: number): FilmFrame {
  const t = Math.min(FILM_MS, Math.max(0, time))

  if (t < 1500) {
    return frame({ outer: 48, concentric: 0, from: "park" })
  }
  if (t < 1750) {
    return frame({
      outer: 48,
      concentric: 0,
      from: "park",
      to: "grip",
      travel: easeTravel(span(t, 1500, 1750)),
      cursor: "nw",
    })
  }
  if (t < 3400) {
    return frame({
      outer: lerp(48, 64, easeTravel(span(t, 1750, 3400))),
      concentric: 0,
      from: "grip",
      pressed: true,
      cursor: "nw",
    })
  }
  if (t < 3680) {
    return frame({
      outer: 64,
      concentric: 0,
      from: "grip",
      to: "concentric",
      travel: easeTravel(span(t, 3400, 3680)),
    })
  }
  if (t < 3840) {
    return frame({ outer: 64, concentric: 0, from: "concentric", pressed: true })
  }
  if (t < 5000) {
    const concentric = easeOut(span(t, 3840, 4060))
    return frame({
      outer: 64,
      concentric,
      guides: concentric * 0.4,
      from: "concentric",
    })
  }
  if (t < 5250) {
    return frame({
      outer: 64,
      concentric: 1,
      guides: 0.4,
      from: "concentric",
      to: "grip",
      travel: easeTravel(span(t, 5000, 5250)),
      cursor: "nw",
    })
  }
  if (t < 7000) {
    return frame({
      outer: lerp(64, 36, easeTravel(span(t, 5250, 7000))),
      concentric: 1,
      guides: 0.4,
      from: "grip",
      pressed: true,
      cursor: "nw",
    })
  }
  if (t < 10000) {
    return frame({
      outer: 36,
      concentric: 1,
      guides: 0.4 * (1 - span(t, 7000, 7120)),
      from: "grip",
      to: "park",
      travel: easeTravel(span(t, 7000, 7400)),
    })
  }
  return frame({ outer: 36, concentric: 1, guides: 0, from: "park" })
}
