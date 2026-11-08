import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FILM_MS, filmAt } from "./film-timeline.ts"
import { sheetRadii } from "./specimen.ts"

describe("film timeline", () => {
  it("opens on the matched error", () => {
    const open = filmAt(400)
    const radii = sheetRadii(open.outer, open.concentric)
    assert.equal(open.outer, 36)
    assert.equal(open.concentric, 0)
    assert.equal(radii.inner, 36)
    assert.equal(open.guides, 0)
  })

  it("grows the outer corner while the inner wrongly follows", () => {
    const mid = filmAt(2600)
    assert.equal(mid.concentric, 0)
    assert.equal(mid.from, "grip")
    assert.ok(mid.outer > 36 && mid.outer < 48)
    assert.equal(sheetRadii(mid.outer, 0).inner, sheetRadii(mid.outer, 0).card)
    assert.equal(filmAt(3200).outer, 48)
  })

  it("corrects only the inner radius", () => {
    const done = filmAt(4500)
    assert.equal(done.outer, 48)
    assert.equal(done.concentric, 1)
    assert.equal(sheetRadii(48, 1).inner, 37)
    const during = filmAt(3750)
    assert.equal(during.outer, 48)
    assert.ok(during.concentric > 0 && during.concentric < 1)
  })

  it("tracks the inner radius with a constant gap and then holds", () => {
    const mid = filmAt(6200)
    assert.equal(mid.concentric, 1)
    assert.ok(mid.outer < 48 && mid.outer > 28)
    const radii = sheetRadii(mid.outer, 1)
    assert.equal(radii.inner, radii.formula)
    assert.equal(radii.card - radii.inner, 11)

    const hold = filmAt(11000)
    const end = filmAt(FILM_MS)
    assert.equal(hold.outer, 28)
    assert.equal(hold.concentric, 1)
    assert.equal(hold.guides, 0)
    assert.equal(sheetRadii(28, 1).inner, 17)
    assert.equal(end.outer, hold.outer)
    assert.equal(end.concentric, hold.concentric)
    assert.notEqual(end.outer, filmAt(0).outer)
  })
})