export const BUTTON_HEIGHT = 36

export const LIMITS = {
  outer: { min: 0, max: 72 },
  padding: { min: 0, max: 20 },
  border: { min: 0, max: 8 },
  focusOffset: { min: 0, max: 8 },
  focusWidth: { min: 1, max: 4 },
} as const

export type DeriveInput = {
  outer: number
  padding: number
  border: number
  focusOffset: number
  focusWidth: number
  /** 0 = concentric formula, 1 = same radius on every level. */
  naiveMix: number
  /** 0 = button is a pill, 1 = button radius is derived from the panel. */
  depthMix: number
  cardWidth: number
  cardHeight: number
  buttonWidth: number
  buttonHeight: number
}

export type Derived = {
  card: number
  panel: number
  button: number
  /** Concentric panel radius before the naive blend and size clamp. */
  panelFormula: number
  /** Concentric button radius before pill clamp, depth blend, and naive blend. */
  buttonFormula: number
  /** Stroke centerline. The ring sits outside the button. */
  ringCenterline: number
  /** Outer border-radius of the ring's border box. */
  ringOuter: number
  square: boolean
  pill: boolean
}

export type Point = { x: number; y: number }

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Uniform border-radius, capped the way CSS caps it: half the shorter side. */
export function usedRadius(specified: number, width: number, height: number) {
  if (!(width > 0) || !(height > 0)) return 0
  const cap = Math.min(width, height) / 2
  return Math.min(Math.max(0, specified), cap)
}

export function derive(input: DeriveInput): Derived {
  const card = usedRadius(input.outer, input.cardWidth, input.cardHeight)
  const panelWidth = Math.max(0, input.cardWidth - 2 * (input.padding + input.border))
  const panelHeight = Math.max(0, input.cardHeight - 2 * (input.padding + input.border))

  const panelFormula = Math.max(0, card - input.padding - input.border)
  const panelSpecified = lerp(panelFormula, input.outer, input.naiveMix)
  const panel = usedRadius(panelSpecified, panelWidth, panelHeight)

  const buttonFormula = Math.max(0, panel - input.padding - input.border)
  const depthSpecified = lerp(input.buttonHeight / 2, buttonFormula, input.depthMix)
  const buttonSpecified = lerp(depthSpecified, input.outer, input.naiveMix)
  const button = usedRadius(buttonSpecified, input.buttonWidth, input.buttonHeight)

  const pillCap = Math.min(input.buttonWidth, input.buttonHeight) / 2
  const pill =
    input.naiveMix < 0.5 &&
    input.depthMix > 0.5 &&
    buttonFormula > pillCap + 0.4 &&
    button >= pillCap - 0.4

  const square =
    input.naiveMix < 0.05 &&
    (panelFormula <= 0.05 || (input.depthMix > 0.5 && buttonFormula <= 0.05))

  return {
    card,
    panel,
    button,
    panelFormula,
    buttonFormula,
    ringCenterline: button + input.focusOffset + input.focusWidth / 2,
    ringOuter: button + input.focusOffset + input.focusWidth,
    square,
    pill,
  }
}

/** Bottom-right corner centers. Equal centers mean the corners are concentric. */
export function cornerCenters(
  input: Pick<DeriveInput, "cardWidth" | "cardHeight" | "padding" | "border">,
  radii: Pick<Derived, "card" | "panel" | "button">,
) {
  const inset = input.padding + input.border
  const panelRight = input.cardWidth - inset
  const panelBottom = input.cardHeight - inset
  const buttonRight = panelRight - inset
  const buttonBottom = panelBottom - inset

  return {
    card: { x: input.cardWidth - radii.card, y: input.cardHeight - radii.card },
    panel: { x: panelRight - radii.panel, y: panelBottom - radii.panel },
    button: { x: buttonRight - radii.button, y: buttonBottom - radii.button },
    cardCorner: { x: input.cardWidth, y: input.cardHeight },
    panelCorner: { x: panelRight, y: panelBottom },
    buttonCorner: { x: buttonRight, y: buttonBottom },
  }
}

/** Bottom-right quarter arc. Empty when the radius is too small to draw. */
export function cornerArc(cx: number, cy: number, radius: number) {
  if (radius < 0.5) return ""
  const n = (value: number) => (Math.round(value * 100) / 100).toString()
  const x1 = n(cx)
  const y1 = n(cy + radius)
  const x2 = n(cx + radius)
  const y2 = n(cy)
  return `M ${x1} ${y1} A ${n(radius)} ${n(radius)} 0 0 0 ${x2} ${y2}`
}

export function squareMark(x: number, y: number, size = 8) {
  const n = (value: number) => (Math.round(value * 100) / 100).toString()
  return `M ${n(x - size)} ${n(y)} L ${n(x)} ${n(y)} L ${n(x)} ${n(y - size)}`
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
