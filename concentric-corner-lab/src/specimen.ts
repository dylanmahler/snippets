import { lerp, usedRadius } from "./radius.ts"

export const SPECIMEN = {
  width: 344,
  height: 252,
  padding: 10,
  border: 1,
} as const

export function radiusLimit(width = SPECIMEN.width, height = SPECIMEN.height) {
  return Math.min(width, height) / 2
}

export function sheetRadii(
  outer: number,
  concentric: number,
  box: { width: number; height: number; padding: number; border: number } = SPECIMEN,
) {
  const card = usedRadius(outer, box.width, box.height)
  const innerW = Math.max(0, box.width - 2 * (box.padding + box.border))
  const innerH = Math.max(0, box.height - 2 * (box.padding + box.border))
  const formula = Math.max(0, card - box.padding - box.border)
  const amount = Math.min(1, Math.max(0, concentric))
  const specified = lerp(card, formula, amount)
  const inner = usedRadius(specified, innerW, innerH)
  return { card, inner, formula, innerW, innerH, square: formula <= 0.05, pill: specified > Math.min(innerW, innerH) / 2 + 0.4 }
}

export function equationLabel(outer: number, concentric: number, box = SPECIMEN) {
  const { card, inner } = sheetRadii(outer, concentric, box)
  const n = (value: number) => String(Math.round(value))
  if (concentric >= 0.5) return `${n(card)} − ${box.padding} − ${box.border} = ${n(inner)}`
  return `${n(card)} / ${n(inner)}`
}
