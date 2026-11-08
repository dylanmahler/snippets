export type Status = "queued" | "working" | "needs-review" | "done" | "blocked"
export type StepStatus = "waiting" | "working" | "done" | "blocked"
export type Area = "Audiences" | "Campaigns" | "Creative" | "Reporting"
export type OutputKind = "audience" | "email" | "ads" | "report"

export type Person = {
  name: string
  initials: string
  tone: string
}

export type Agent = {
  id: string
  name: string
  initials: string
  tone: string
}

export const AGENTS = {
  june: { id: "june", name: "June", initials: "JU", tone: "#efe2cf" },
  audience: { id: "audience", name: "Audience builder", initials: "AB", tone: "#e4ecd6" },
  copy: { id: "copy", name: "Copywriter", initials: "CO", tone: "#f6dfeb" },
  brand: { id: "brand", name: "Brand check", initials: "BR", tone: "#f3e6d4" },
  activation: { id: "activation", name: "Activation", initials: "AC", tone: "#e7e4f2" },
} as const satisfies Record<string, Agent>

export type AgentId = keyof typeof AGENTS

export type StepDef = {
  id: string
  agent: AgentId
  summary: string
  show: number
  work: readonly [number, number]
  block?: number
  children?: readonly StepDef[]
}

export type OutputDef = {
  id: string
  kind: OutputKind
  title: string
  body: string
  show: number
}

export type SectionDef = {
  id: string
  label: string
  agent: AgentId
  show: number
  work: readonly [number, number]
  block?: number
  body: string
  stepIds: readonly string[]
}

export type RequestDef = {
  id: string
  title: string
  ask: string
  requester: Person
  watchers: readonly Person[]
  area: Area
  due: string
  brief: string
  offset: number
  length: number
  queuedUntil: number
  reviewAt?: number
  doneAt?: number
  note?: string
  steps: readonly StepDef[]
  outputs: readonly OutputDef[]
  sections: readonly SectionDef[]
}

export type StepView = {
  id: string
  agent: Agent
  summary: string
  status: StepStatus
  children: StepView[]
}

export type OutputView = {
  id: string
  kind: OutputKind
  title: string
  body: string
}

export type SectionView = {
  id: string
  label: string
  agent: Agent
  phase: StepStatus
  body: string | null
  steps: StepView[]
}

export type RequestView = {
  id: string
  title: string
  ask: string
  requester: Person
  watchers: readonly Person[]
  area: Area
  due: string
  brief: string
  status: Status
  done: number
  total: number
  note?: string
  line: string
  tail: string
  outputs: OutputView[]
  steps: StepView[]
  sections: SectionView[]
}

export const ALEX: Person = { name: "Alex Rivera", initials: "AR", tone: "#f6e3d4" }

export const OUTPUT_LABEL: Record<OutputKind, string> = {
  audience: "Audience",
  email: "Email",
  ads: "Ads",
  report: "Report",
}

export const STATUS_LABEL: Record<Status, string> = {
  queued: "Queued",
  working: "Working",
  "needs-review": "Needs review",
  done: "Done",
  blocked: "Blocked",
}

export const STEP_LABEL: Record<StepStatus, string> = {
  waiting: "Waiting",
  working: "Working",
  done: "Done",
  blocked: "Blocked",
}

export const COLUMNS: { id: Status; label: string; empty: string }[] = [
  { id: "queued", label: "Queued", empty: "Nothing waiting." },
  { id: "working", label: "Working", empty: "June is free." },
  { id: "needs-review", label: "Needs review", empty: "Nothing to review." },
  { id: "done", label: "Done", empty: "Nothing finished." },
  { id: "blocked", label: "Blocked", empty: "Nothing is stuck." },
]

const span = (start: number, end: number): readonly [number, number] => [start, end]

export function localTick(def: RequestDef, clock: number) {
  return Math.max(0, Math.min(def.length, clock + def.offset))
}

export function stepStatus(step: StepDef, tick: number): StepStatus {
  if (step.block !== undefined && tick >= step.block) return "blocked"
  if (tick < step.work[0]) return "waiting"
  if (tick < step.work[1]) return "working"
  return "done"
}

function visibleSteps(steps: readonly StepDef[], tick: number): StepView[] {
  const out: StepView[] = []
  for (const step of steps) {
    if (tick < step.show) continue
    out.push({
      id: step.id,
      agent: AGENTS[step.agent],
      summary: step.summary,
      status: stepStatus(step, tick),
      children: step.children ? visibleSteps(step.children, tick) : [],
    })
  }
  return out
}

function countDone(steps: readonly StepDef[], tick: number) {
  return steps.filter((step) => stepStatus(step, tick) === "done").length
}

function anyBlocked(steps: readonly StepDef[], tick: number): boolean {
  for (const step of steps) {
    if (stepStatus(step, tick) === "blocked") return true
    if (step.children && anyBlocked(step.children, tick)) return true
  }
  return false
}

export function requestStatus(def: RequestDef, tick: number): Status {
  if (anyBlocked(def.steps, tick)) return "blocked"
  if (def.doneAt !== undefined && tick >= def.doneAt) return "done"
  if (def.reviewAt !== undefined && tick >= def.reviewAt) return "needs-review"
  if (tick < def.queuedUntil) return "queued"
  return "working"
}

function flattenVisible(nodes: StepView[], into: Map<string, StepView>) {
  for (const node of nodes) {
    into.set(node.id, node)
    flattenVisible(node.children, into)
  }
}

function findStep(steps: readonly StepDef[], id: string): StepDef | undefined {
  for (const step of steps) {
    if (step.id === id) return step
    if (step.children) {
      const found = findStep(step.children, id)
      if (found) return found
    }
  }
  return undefined
}

function sectionPhase(section: SectionDef, tick: number): StepStatus {
  if (section.block !== undefined && tick >= section.block) return "blocked"
  if (tick < section.work[0]) return "waiting"
  if (tick < section.work[1]) return "working"
  return "done"
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name
}

export function tailFor(status: Status, done: number, total: number) {
  if (status === "blocked") return "paused"
  if (status === "queued") return "waiting"
  return `${done} of ${total} done`
}

export function watchLine(view: Pick<RequestView, "requester" | "watchers">) {
  const asked = `${firstName(view.requester.name)} asked`
  if (view.watchers.length === 0) return asked
  const names = view.watchers.map((person) => firstName(person.name))
  const watching =
    names.length === 1
      ? `${names[0]} watching`
      : `${names[0]} and ${names[1]} watching`
  return `${asked} · ${watching}`
}

export function project(def: RequestDef, clock: number): RequestView {
  const tick = localTick(def, clock)
  const status = requestStatus(def, tick)
  const done = countDone(def.steps, tick)
  const total = def.steps.length
  const tail = tailFor(status, done, total)
  const steps = visibleSteps(def.steps, tick)
  const byId = new Map<string, StepView>()
  flattenVisible(steps, byId)

  return {
    id: def.id,
    title: def.title,
    ask: def.ask,
    requester: def.requester,
    watchers: def.watchers,
    area: def.area,
    due: def.due,
    brief: def.brief,
    status,
    done,
    total,
    note: status === "blocked" ? def.note : undefined,
    line: `${firstName(def.requester.name)} asked for ${def.ask}, ${tail}`,
    tail,
    outputs: def.outputs
      .filter((output) => tick >= output.show)
      .map(({ id, kind, title, body }) => ({ id, kind, title, body })),
    steps,
    sections: def.sections.map((section) => ({
      id: section.id,
      label: section.label,
      agent: AGENTS[section.agent],
      phase: sectionPhase(section, tick),
      body: tick >= section.show ? section.body : null,
      steps: section.stepIds.flatMap((id) => {
        const visible = byId.get(id)
        if (visible) return [visible]
        const raw = findStep(def.steps, id)
        if (!raw || tick < raw.show) return []
        return [
          {
            id: raw.id,
            agent: AGENTS[raw.agent],
            summary: raw.summary,
            status: stepStatus(raw, tick),
            children: [],
          },
        ]
      }),
    })),
  }
}

export function inferArea(text: string): Area {
  const value = text.toLowerCase()
  if (/(report|readout|performance|roas|spend|numbers)/.test(value)) return "Reporting"
  if (/(audience|segment|list|lookalike|subscriber)/.test(value)) return "Audiences"
  if (/(subject|headline|copy|lookbook|creative|caption|\bad\b)/.test(value)) return "Creative"
  return "Campaigns"
}

let draftSeq = 0

export function draftRequest(title: string, clock: number): RequestDef {
  const trimmed = title.trim().replace(/\s+/g, " ")
  const ask = trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
  const area = inferArea(trimmed)
  const specialist: AgentId =
    area === "Audiences" ? "audience" : area === "Reporting" ? "activation" : area === "Creative" ? "copy" : "copy"
  const kind: OutputKind =
    area === "Audiences" ? "audience" : area === "Reporting" ? "report" : area === "Creative" ? "email" : "email"
  const outputBody =
    kind === "audience"
      ? `People who fit “${trimmed}”. Recent buyers stay in, repeat returners are out, and the file is small enough for a Friday test.`
      : kind === "report"
        ? `A first read on “${trimmed}”. Spend, return, and whether it deserves another week. Still a draft for the Monday standup.`
        : `A first pass at “${trimmed}”. Short, warm, and no fake deadline. Ready for a brand read.`

  return {
    id: `draft-${++draftSeq}`,
    title: trimmed,
    ask,
    requester: ALEX,
    watchers: [],
    area,
    due: "Nov 20",
    brief: `Take “${trimmed}” from a note to something the team can review. Keep it specific, and leave the last call with the person who asked.`,
    offset: -clock,
    length: 10,
    queuedUntil: 1,
    reviewAt: 8,
    steps: [
      {
        id: `${draftSeq}-read`,
        agent: "june",
        summary: `Read the note and handed “${trimmed}” to the right person.`,
        show: 1,
        work: span(1, 2),
      },
      {
        id: `${draftSeq}-make`,
        agent: specialist,
        summary:
          kind === "audience"
            ? `Drafted a test audience for “${trimmed}”.`
            : kind === "report"
              ? `Pulled a plain-language read of “${trimmed}”.`
              : `Wrote a first pass of “${trimmed}”.`,
        show: 2,
        work: span(2, 6),
      },
      {
        id: `${draftSeq}-brand`,
        agent: "brand",
        summary: "Checked the tone. No countdown language, no internal names.",
        show: 6,
        work: span(6, 8),
      },
    ],
    outputs: [
      {
        id: `${draftSeq}-out`,
        kind,
        title: trimmed,
        body: outputBody,
        show: 6,
      },
    ],
    sections: [
      {
        id: "work",
        label: kind === "audience" ? "Audience" : kind === "report" ? "Readout" : "Message",
        agent: specialist,
        show: 6,
        work: span(2, 6),
        body: outputBody,
        stepIds: [`${draftSeq}-make`],
      },
      {
        id: "check",
        label: "Brand",
        agent: "brand",
        show: 8,
        work: span(6, 8),
        body: "Tone is clear. No countdown, no internal names, and the ask is one sentence.",
        stepIds: [`${draftSeq}-brand`],
      },
    ],
  }
}

export const MOVE = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.8 }
export const REVEAL = { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.8 }

export function springFor(reduced: boolean) {
  return reduced ? { duration: 0 } : MOVE
}
