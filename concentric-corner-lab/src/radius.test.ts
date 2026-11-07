import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BUTTON_HEIGHT,
  cornerArc,
  cornerCenters,
  derive,
  distance,
  usedRadius,
  type DeriveInput,
} from "./radius.ts"

const card = {
  cardWidth: 520,
  cardHeight: 360,
  buttonWidth: 140,
  buttonHeight: BUTTON_HEIGHT,
}

function input(over: Partial<DeriveInput> = {}): DeriveInput {
  return {
    outer: 40,
    padding: 12,
    border: 2,
    focusOffset: 3,
    focusWidth: 2,
    naiveMix: 0,
    depthMix: 1,
    ...card,
    ...over,
  }
}

describe("derive", () => {
  it("subtracts padding and border at each level", () => {
    const d = derive(input())
    assert.equal(d.card, 40)
    assert.equal(d.panel, 26)
    assert.equal(d.button, 12)
    assert.equal(d.square, false)
    assert.equal(d.pill, false)
  })

  it("puts the focus ring centerline outside the button", () => {
    const d = derive(input())
    assert.equal(d.ringCenterline, 12 + 3 + 2 / 2)
    assert.equal(d.ringOuter, 12 + 3 + 2)
  })

  it("floors an inner radius at 0 when the gap exceeds the outer radius", () => {
    const d = derive(input({ outer: 10, padding: 16, border: 6 }))
    assert.equal(d.panel, 0)
    assert.equal(d.button, 0)
    assert.equal(d.square, true)
  })

  it("clamps a derived button to half its height", () => {
    const d = derive(input({ outer: 72, padding: 4, border: 1 }))
    assert.equal(d.buttonFormula, 62)
    assert.equal(d.button, BUTTON_HEIGHT / 2)
    assert.equal(d.pill, true)
  })

  it("uses height / 2 for the button at depth 2", () => {
    const d = derive(input({ depthMix: 0 }))
    assert.equal(d.panel, 26)
    assert.equal(d.button, BUTTON_HEIGHT / 2)
    assert.equal(d.pill, false)
  })

  it("naive mode specifies the outer radius on every level", () => {
    const d = derive(input({ naiveMix: 1 }))
    assert.equal(d.panel, 40)
    assert.equal(d.button, BUTTON_HEIGHT / 2)
  })

  it("caps a uniform radius at half the shorter side", () => {
    assert.equal(usedRadius(80, 100, 36), 18)
    assert.equal(usedRadius(-4, 100, 36), 0)
    assert.equal(usedRadius(8, 0, 36), 0)
  })
})

describe("corner centers", () => {
  it("shares one center when the formula is unclamped", () => {
    const i = input()
    const d = derive(i)
    const c = cornerCenters(i, d)
    assert.ok(distance(c.card, c.panel) < 0.001)
    assert.ok(distance(c.card, c.button) < 0.001)
  })

  it("splits centers in naive mode", () => {
    const i = input({ naiveMix: 1 })
    const d = derive(i)
    const c = cornerCenters(i, d)
    assert.ok(distance(c.card, c.panel) > 5)
    assert.ok(distance(c.card, c.button) > 5)
  })

  it("splits centers when the inner corner goes square", () => {
    const i = input({ outer: 18, padding: 12, border: 8 })
    const d = derive(i)
    assert.equal(d.button, 0)
    const c = cornerCenters(i, d)
    assert.ok(distance(c.card, c.button) > 1)
  })

  it("splits centers when the button clamps to a pill", () => {
    const i = input({ outer: 72, padding: 4, border: 1 })
    const d = derive(i)
    const c = cornerCenters(i, d)
    assert.ok(distance(c.card, c.button) > 1)
  })

  it("keeps card and panel together at depth 2, and lets the pill leave", () => {
    const i = input({ depthMix: 0 })
    const d = derive(i)
    const c = cornerCenters(i, d)
    assert.ok(distance(c.card, c.panel) < 0.001)
    assert.ok(distance(c.card, c.button) > 1)
  })

  it("matches centers across the slider range whenever the button is not clamped", () => {
    for (const outer of [0, 8, 16, 28, 40, 56, 72]) {
      for (const padding of [0, 4, 12, 20]) {
        for (const border of [0, 1, 2, 8]) {
          const i = input({ outer, padding, border })
          const d = derive(i)
          if (Math.abs(d.panel - (d.card - padding - border)) > 0.01) continue
          if (Math.abs(d.button - (d.panel - padding - border)) > 0.01) continue
          const c = cornerCenters(i, d)
          assert.ok(
            distance(c.card, c.button) < 0.001,
            `centers split at outer ${outer}, padding ${padding}, border ${border}`,
          )
        }
      }
    }
  })
})

describe("corner arc", () => {
  it("draws the bottom-right quarter and skips a square corner", () => {
    assert.equal(cornerArc(10, 20, 0), "")
    assert.equal(cornerArc(10, 20, 4), "M 10 24 A 4 4 0 0 0 14 20")
  })
})

describe("contrast", () => {
  it("keeps text pairs at WCAG AA", () => {
    const pairs: Array<[string, string, number]> = [
      ["#1c1714", "#fffcf8", 4.5],
      ["#1c1714", "#f3eadf", 4.5],
      ["#3d362f", "#e7e1d7", 4.5],
      ["#514840", "#fffcf8", 4.5],
      ["#3d362f", "#fffcf8", 4.5],
      ["#f4faf7", "#0f5e4a", 4.5],
      ["#f4faf7", "#146b54", 4.5],
      ["#f4faf7", "#0c4d3c", 4.5],
      ["#514840", "#e6ded3", 4.5],
      ["#0f5e4a", "#fffcf8", 3],
    ]
    for (const [fg, bg, min] of pairs) {
      const ratio = contrast(fg, bg)
      assert.ok(ratio >= min, `${fg} on ${bg} is ${ratio.toFixed(2)}, need ${min}`)
    }
  })
})

function contrast(fg: string, bg: string) {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

function luminance(hex: string) {
  const value = hex.replace("#", "")
  const channels = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
