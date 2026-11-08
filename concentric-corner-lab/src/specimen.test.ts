import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { SPECIMEN, equationLabel, sheetRadii } from "./specimen.ts"

describe("sheet radii", () => {
  it("matches both corners to the outer radius", () => {
    const radii = sheetRadii(48, 0)
    assert.equal(radii.card, 48)
    assert.equal(radii.inner, 48)
    assert.equal(equationLabel(48, 0), "48 / 48")
  })

  it("sets the inner radius to outer − padding − border", () => {
    const radii = sheetRadii(48, 1)
    assert.equal(radii.formula, 23)
    assert.equal(radii.inner, 23)
    assert.equal(equationLabel(48, 1), "48 − 24 − 1 = 23")
  })

  it("keeps a 25px gap while the outer radius changes", () => {
    assert.equal(sheetRadii(64, 1).inner, 39)
    assert.equal(sheetRadii(36, 1).inner, 11)
    assert.equal(sheetRadii(64, 1).card - sheetRadii(64, 1).inner, 25)
    assert.equal(sheetRadii(36, 1).card - sheetRadii(36, 1).inner, 25)
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
