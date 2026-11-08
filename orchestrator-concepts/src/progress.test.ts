import assert from "node:assert/strict"
import { test } from "node:test"
import { SEEDS, projectAll } from "./data.ts"
import { draftRequest, inferArea, project } from "./model.ts"

function at(clock: number, id: string) {
  const view = projectAll(SEEDS, clock).find((request) => request.id === id)
  if (!view) throw new Error(`missing ${id}`)
  return view
}

test("the hero frame reads like a workspace feed", () => {
  const q4 = at(6, "q4")
  assert.equal(q4.line, "Maya asked for Q4 launch audiences, 3 of 4 done")
  assert.equal(q4.status, "working")
  assert.equal(q4.outputs.length, 2)
  assert.equal(q4.steps.length, 4)
  const seed = q4.steps.find((step) => step.id === "q4-seed")
  assert.equal(seed?.children.length, 2)
})

test("loyalty waits, then June picks it up", () => {
  assert.equal(at(6, "loyalty").status, "queued")
  assert.equal(at(6, "loyalty").steps.length, 0)
  assert.equal(at(22, "loyalty").status, "working")
  assert.equal(at(22, "loyalty").steps.length, 1)
})

test("the paid readout stays blocked", () => {
  assert.equal(at(0, "paid").status, "blocked")
  assert.equal(at(20, "paid").status, "blocked")
  assert.match(at(6, "paid").note ?? "", /billing admin/)
  assert.equal(at(6, "paid").line, "Elena asked for the weekly paid social readout, paused")
})

test("the holiday brief fills section by section", () => {
  const early = at(6, "holiday")
  const audience = early.sections.find((section) => section.id === "audience")
  const message = early.sections.find((section) => section.id === "message")
  const creative = early.sections.find((section) => section.id === "creative")
  assert.equal(audience?.phase, "done")
  assert.match(audience?.body ?? "", /Quiet fans/)
  assert.equal(message?.phase, "working")
  assert.equal(message?.body, null)
  assert.equal(creative?.phase, "waiting")
  const later = at(28, "holiday")
  assert.match(later.sections.find((section) => section.id === "message")?.body ?? "", /charcoal wool coat/)
})

test("every status is on the board at the hero frame", () => {
  const statuses = new Set(projectAll(SEEDS, 6).map((request) => request.status))
  for (const status of ["queued", "working", "needs-review", "done", "blocked"] as const) {
    assert.equal(statuses.has(status), true, status)
  }
})

test("a delegated note starts queued and then moves", () => {
  assert.equal(inferArea("lapsed subscriber list"), "Audiences")
  assert.equal(inferArea("weekly performance readout"), "Reporting")
  const draft = draftRequest("Lapsed subscriber list", 4)
  assert.equal(project(draft, 4).status, "queued")
  assert.equal(project(draft, 4).requester.name, "Alex Rivera")
  assert.equal(project(draft, 6).status, "working")
  assert.equal(project(draft, 12).status, "needs-review")
})
