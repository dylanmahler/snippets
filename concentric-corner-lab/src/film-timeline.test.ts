import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { FILM_MS, OPENING, PAYOFF, filmAt } from "./film-timeline.ts"

describe("film timeline", () => {
  it("opens and ends on the same frame", () => {
    const open = filmAt(0)
    const end = filmAt(FILM_MS)
    assert.equal(open.outer, OPENING.outer)
    assert.equal(open.padding, OPENING.padding)
    assert.equal(open.guides, 0)
    assert.equal(open.naiveMix, 0)
    assert.equal(end.outer, open.outer)
    assert.equal(end.padding, open.padding)
    assert.equal(end.guides, 0)
    assert.equal(end.naiveMix, 0)
    assert.equal(end.from, "park")
    assert.equal(end.to, "park")
  })

  it("holds the payoff for two seconds with the gap corrected", () => {
    const payoff = filmAt(8400)
    assert.equal(payoff.outer, PAYOFF.outer)
    assert.equal(payoff.padding, PAYOFF.padding)
    assert.equal(payoff.border, PAYOFF.border)
    assert.equal(payoff.guides, 1)
    assert.equal(payoff.naiveMix, 0)
    assert.equal(filmAt(7500).outer, PAYOFF.outer)
    assert.equal(filmAt(9400).padding, PAYOFF.padding)
  })

  it("tracks the radius drag without leaving the grip", () => {
    const early = filmAt(1800)
    const late = filmAt(3000)
    assert.equal(early.from, "radius")
    assert.equal(early.to, "radius")
    assert.equal(early.pressed, true)
    assert.ok(early.outer > 40 && early.outer < 56)
    assert.ok(late.outer > early.outer)
    assert.equal(late.guides, 1)
  })

  it("shows naive only between the compare presses", () => {
    assert.equal(filmAt(6000).naiveMix, 0)
    assert.equal(filmAt(6600).naiveMix, 1)
    assert.equal(filmAt(7200).naiveMix, 0)
  })
})
