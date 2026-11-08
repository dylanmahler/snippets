import { useState, type ReactNode } from "react"
import { STATUS_LABEL, type RequestView } from "./model.ts"
import { Bars, Chip, StepTree, Stream } from "./ui.tsx"

export function Brief({ requests, reduced }: { requests: RequestView[]; reduced: boolean }) {
  const [selectedId, setSelectedId] = useState("holiday")
  const selected = requests.find((request) => request.id === selectedId) ?? requests[0]

  return (
    <div className="living">
      <aside className="rail" aria-label="Active requests">
        <p className="kicker">In the workspace</p>
        <ul>
          {requests.map((request) => {
            const current = request.id === selected.id
            return (
              <li key={request.id}>
                <button
                  type="button"
                  className="rail-item"
                  aria-current={current ? "true" : undefined}
                  onClick={() => setSelectedId(request.id)}
                >
                  <span className="dot" data-status={request.status} />
                  <span className="rail-copy">
                    <span className="rail-title">{request.title}</span>
                    <span className="rail-meta">{STATUS_LABEL[request.status]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
      {selected && <Document request={selected} reduced={reduced} />}
    </div>
  )
}

function byline(request: RequestView) {
  const active = request.sections.find((section) => section.phase === "working")
  if (request.status === "blocked") return `${request.requester.name} asked · Paused`
  if (request.status === "done") return `${request.requester.name} asked · June finished`
  if (request.status === "needs-review") return `${request.requester.name} asked · Ready for a look`
  if (request.status === "queued") return `${request.requester.name} asked · Waiting on June`
  if (active) return `${request.requester.name} asked · ${active.agent.name} is on the ${active.label.toLowerCase()}`
  return `${request.requester.name} asked · June is on it`
}

function Document({ request, reduced }: { request: RequestView; reduced: boolean }) {
  return (
    <article className="doc" aria-labelledby="brief-title" data-status={request.status}>
      <header className="doc-head">
        <p className="kicker">
          {request.area} · Due {request.due}
        </p>
        <h2 id="brief-title">{request.title}</h2>
        <p className="lede">{request.brief}</p>
        <p className="byline">{byline(request)}</p>
      </header>
      {request.note && <p className="block-note">{request.note}</p>}
      <div className="sections">
        {request.sections.map((section) => (
          <SectionBlock key={section.id} requestId={request.id} section={section} reduced={reduced} note={request.note} />
        ))}
      </div>
    </article>
  )
}

function SectionBlock({
  requestId,
  section,
  reduced,
  note,
}: {
  requestId: string
  section: RequestView["sections"][number]
  reduced: boolean
  note?: string
}) {
  const [open, setOpen] = useState(false)
  const live = section.phase === "working"
  const showChip = section.phase === "working" || section.phase === "done" || section.phase === "blocked"
  const canShow = section.steps.length > 0

  let body: ReactNode
  if (section.phase === "blocked") {
    body = <p className="quiet">{note ?? "Paused before this was written."}</p>
  } else if (section.body) {
    body = <p className="prose fill-in">{section.body}</p>
  } else if (live) {
    body = <Bars label={`${section.agent.name} is writing the ${section.label.toLowerCase()}`} />
  } else {
    body = <p className="quiet">{section.agent.name} hasn’t started.</p>
  }

  return (
    <section className="section" aria-labelledby={`${requestId}-${section.id}`} data-phase={section.phase}>
      <header className="section-head">
        <h3 id={`${requestId}-${section.id}`}>{section.label}</h3>
        {showChip && <Chip agent={section.agent} live={live} />}
      </header>
      <Stream open reduced={reduced}>
        <div className="section-body">{body}</div>
      </Stream>
      <button
        type="button"
        className="show-how"
        aria-expanded={open}
        disabled={!canShow}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide how" : "Show how"}
      </button>
      <Stream open={open && canShow} reduced={reduced}>
        <div className="show-how-body">
          <StepTree steps={section.steps} />
        </div>
      </Stream>
    </section>
  )
}
