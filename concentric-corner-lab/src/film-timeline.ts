export const FILM_MS = 12000

export const OPENING = { outer: 40, padding: 12, border: 2 }
export const PAYOFF = { outer: 56, padding: 20, border: 2 }

export type Spot = "park" | "radius" | "pad" | "compare" | "reset"
export type CursorKind = "arrow" | "ew" | "ns"

export type FilmFrame = {
  outer: number
  padding: number
  border: number
  naiveMix: number
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

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

/** cubic-bezier(0.45, 0, 0.1, 1). Presentation travel only. */
export function easeTravel(amount: number) {
  const t = clamp01(amount)
  let guess = t
  for (let i = 0; i < 6; i += 1) {
    const x = sampleBezier(guess, 0.45, 0.1)
    const dx = sampleBezierDerivative(guess, 0.45, 0.1)
    if (Math.abs(dx) < 1e-6) break
    guess = Math.min(1, Math.max(0, guess - (x - t) / dx))
  }
  return sampleBezier(guess, 0, 1)
}

function sampleBezier(t: number, p1: number, p2: number) {
  const u = 1 - t
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t
}

function sampleBezierDerivative(t: number, p1: number, p2: number) {
  const u = 1 - t
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2)
}

function hold(
  partial: Partial<FilmFrame> & Pick<FilmFrame, "outer" | "padding" | "from">,
): FilmFrame {
  return {
    border: 2,
    naiveMix: 0,
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

  if (t < 1000) {
    return hold({ outer: 40, padding: 12, from: "park" })
  }
  if (t < 1400) {
    return hold({
      outer: 40,
      padding: 12,
      from: "park",
      to: "radius",
      travel: easeTravel(span(t, 1000, 1400)),
      cursor: "ew",
    })
  }
  if (t < 1560) {
    return hold({ outer: 40, padding: 12, from: "radius", pressed: true, cursor: "ew" })
  }
  if (t < 3160) {
    const u = easeTravel(span(t, 1560, 3160))
    return hold({
      outer: lerp(40, 56, u),
      padding: 12,
      guides: t < 1680 ? span(t, 1560, 1680) : 1,
      from: "radius",
      pressed: true,
      cursor: "ew",
    })
  }
  if (t < 3560) {
    return hold({ outer: 56, padding: 12, guides: 1, from: "radius", cursor: "ew" })
  }
  if (t < 3960) {
    return hold({
      outer: 56,
      padding: 12,
      guides: 1,
      from: "radius",
      to: "pad",
      travel: easeTravel(span(t, 3560, 3960)),
      cursor: "ns",
    })
  }
  if (t < 4120) {
    return hold({ outer: 56, padding: 12, guides: 1, from: "pad", pressed: true, cursor: "ns" })
  }
  if (t < 5320) {
    const u = easeTravel(span(t, 4120, 5320))
    return hold({
      outer: 56,
      padding: lerp(12, 20, u),
      guides: 1,
      from: "pad",
      pressed: true,
      cursor: "ns",
    })
  }
  if (t < 5720) {
    return hold({ outer: 56, padding: 20, guides: 1, from: "pad", cursor: "ns" })
  }
  if (t < 6120) {
    return hold({
      outer: 56,
      padding: 20,
      guides: 1,
      from: "pad",
      to: "compare",
      travel: easeTravel(span(t, 5720, 6120)),
    })
  }
  if (t < 6280) {
    return hold({
      outer: 56,
      padding: 20,
      guides: 1,
      naiveMix: span(t, 6200, 6280),
      from: "compare",
      pressed: true,
    })
  }
  if (t < 6880) {
    return hold({ outer: 56, padding: 20, guides: 1, naiveMix: 1, from: "compare" })
  }
  if (t < 7040) {
    return hold({
      outer: 56,
      padding: 20,
      guides: 1,
      naiveMix: 1 - span(t, 6960, 7040),
      from: "compare",
      pressed: true,
    })
  }
  if (t < 7440) {
    return hold({
      outer: 56,
      padding: 20,
      guides: 1,
      from: "compare",
      to: "park",
      travel: easeTravel(span(t, 7040, 7440)),
    })
  }
  if (t < 9440) {
    return hold({ outer: 56, padding: 20, guides: 1, from: "park" })
  }
  if (t < 9840) {
    return hold({
      outer: 56,
      padding: 20,
      guides: 1,
      from: "park",
      to: "reset",
      travel: easeTravel(span(t, 9440, 9840)),
    })
  }
  if (t < 10000) {
    return hold({ outer: 56, padding: 20, guides: 1, from: "reset", pressed: true })
  }
  if (t < 10800) {
    const u = easeTravel(span(t, 10000, 10640))
    return hold({
      outer: lerp(56, 40, u),
      padding: lerp(20, 12, u),
      guides: 1 - u,
      from: "reset",
    })
  }
  if (t < 11600) {
    return hold({
      outer: 40,
      padding: 12,
      from: "reset",
      to: "park",
      travel: easeTravel(span(t, 10800, 11600)),
    })
  }
  return hold({ outer: 40, padding: 12, from: "park" })
}
