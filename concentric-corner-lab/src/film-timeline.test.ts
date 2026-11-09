import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FILM_MS, filmAt } from "./film-timeline.ts"
import { sheetRadii } from "./specimen.ts"

describe("film timeline", () => {
  it("opens on a matched corner whose gap thickens", () => {
    const open = filmAt(400)
    const radii = sheetRadii(open.outer, open.concentric)
    assert.equal(open.outer, 48)
    assert.equal(open.concentric, 0)
    assert.equal(radii.inner, 48)
    assert.equal(open.guides, 0)
  })

  it("grows the outer corner while the inner wrongly follows", () => {
    const mid = filmAt(2600)
    assert.equal(mid.concentric, 0)
    assert.equal(mid.from, "grip")
    assert.ok(mid.outer > 48 && mid.outer < 64)
    assert.equal(sheetRadii(mid.outer, 0).inner, sheetRadii(mid.outer, 0).card)
    assert.equal(filmAt(3400).outer, 64)
  })

  it("corrects only the inner radius", () => {
    const done = filmAt(4500)
    assert.equal(done.outer, 64)
    assert.equal(done.concentric, 1)
    assert.equal(sheetRadii(64, 1).inner, 51)
    const during = filmAt(3950)
    assert.equal(during.outer, 64)
    assert.ok(during.concentric > 0 && during.concentric < 1)
  })

  it("tracks the inner radius with a constant gap and then holds", () => {
    const mid = filmAt(6200)
    assert.equal(mid.concentric, 1)
    assert.ok(mid.outer < 64 && mid.outer > 48)
    const radii = sheetRadii(mid.outer, 1)
    assert.equal(radii.inner, radii.formula)
    assert.equal(radii.card - radii.inner, 13)

    const hold = filmAt(11000)
    const end = filmAt(FILM_MS)
    assert.equal(hold.outer, 48)
    assert.equal(hold.concentric, 1)
    assert.equal(hold.guides, 0)
    assert.equal(sheetRadii(48, 1).inner, 35)
    assert.equal(end.outer, hold.outer)
    assert.equal(end.concentric, hold.concentric)
    assert.equal(filmAt(0).concentric, 0)
  })
})