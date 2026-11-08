import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { SPECIMEN, equationLabel, sheetRadii } from "./specimen.ts"

describe("sheet radii", () => {
  it("matches both corners to the outer radius", () => {
    const radii = sheetRadii(36, 0)
    assert.equal(radii.card, 36)
    assert.equal(radii.inner, 36)
    assert.equal(equationLabel(36, 0), "36 / 36")
  })

  it("sets the inner radius to outer − padding − border", () => {
    const radii = sheetRadii(36, 1)
    assert.equal(radii.formula, 25)
    assert.equal(radii.inner, 25)
    assert.equal(equationLabel(36, 1), "36 − 10 − 1 = 25")
  })

  it("keeps the gap while the outer radius changes", () => {
    assert.equal(sheetRadii(48, 1).inner, 37)
    assert.equal(sheetRadii(28, 1).inner, 17)
  })

  it("clamps a vanished corner to 0 and a too-round inner corner to a pill", () => {
    const zero = sheetRadii(0, 1)
    assert.equal(zero.card, 0)
    assert.equal(zero.inner, 0)
    assert.equal(zero.square, true)

    const cap = Math.min(SPECIMEN.width, SPECIMEN.height) / 2
    const pill = sheetRadii(cap, 0)
    const innerCap = Math.min(pill.innerW, pill.innerH) / 2
    assert.equal(pill.card, cap)
    assert.equal(pill.inner, innerCap)
    assert.equal(pill.pill, true)
    assert.ok(pill.inner < pill.card)
  })
})
