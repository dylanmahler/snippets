import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { motion } from "motion/react"
import { SEEDS } from "./data.ts"
import { useClock, useReduced } from "./hooks.ts"
import { Feed } from "./feed.tsx"
import { Board } from "./board.tsx"
import { Brief } from "./brief.tsx"
import {
  STATUS_LABEL,
  draftRequest,
  project,
  springFor,
  type RequestDef,
  type Status,
} from "./model.ts"

const CONCEPTS = [
  { id: "feed", label: "Public feed" },
  { id: "board", label: "Brief board" },
  { id: "brief", label: "Living brief" },
] as const

type Concept = (typeof CONCEPTS)[number]["id"]

export function App() {
  const reduced = useReduced()
  const [concept, setConcept] = useState<Concept>("feed")
  const holdAt = concept === "feed" ? 18 : concept === "board" ? 24 : null
  const clock = useClock(holdAt)
  const [drafts, setDrafts] = useState<RequestDef[]>([])
  const [live, setLive] = useState("")
  const seen = useRef(new Map<string, Status>())
  const tabs = useRef<Partial<Record<Concept, HTMLButtonElement>>>({})

  const requests = useMemo(
    () => [...drafts, ...SEEDS].map((def) => project(def, clock)),
    [drafts, clock],
  )

  useEffect(() => {
    const messages: string[] = []
    for (const request of requests) {
      const previous = seen.current.get(request.id)
      if (previous && previous !== request.status) {
        messages.push(`${request.title} is now ${STATUS_LABEL[request.status].toLowerCase()}.`)
      }
      seen.current.set(request.id, request.status)
    }
    if (messages.length > 0) setLive(messages.join(" "))
  }, [requests])

  const onTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = CONCEPTS.findIndex((item) => item.id === concept)
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? CONCEPTS[(index + 1) % CONCEPTS.length]
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? CONCEPTS[(index - 1 + CONCEPTS.length) % CONCEPTS.length]
          : event.key === "Home"
            ? CONCEPTS[0]
            : event.key === "End"
              ? CONCEPTS[CONCEPTS.length - 1]
              : null
    if (!next) return
    event.preventDefault()
    setConcept(next.id)
    tabs.current[next.id]?.focus()
  }

  return (
    <div className="app" data-reduced={reduced || undefined}>
      <header className="topbar">
      <h1 className="mark">Orchestrator</h1>
      <div className="switcher" role="tablist" aria-label="Concepts" onKeyDown={onTabs}>
        {CONCEPTS.map((item) => {
          const selected = item.id === concept
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabs.current[item.id] = node
              }}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setConcept(item.id)}
            >
              {selected && (
                <motion.span layoutId="segment" className="segment" transition={springFor(reduced)} />
              )}
              <span className="segment-label">{item.label}</span>
            </button>
          )
        })}
      </div>
      </header>
      <p className="sr" aria-live="polite">
        {live}
      </p>
      <main className="stage" id={`panel-${concept}`} role="tabpanel" aria-labelledby={`tab-${concept}`} data-concept={concept}>
        {concept === "feed" && (
          <Feed
            requests={requests}
            reduced={reduced}
            onCreate={(title) => setDrafts((current) => [draftRequest(title, clock), ...current])}
          />
        )}
        {concept === "board" && <Board requests={requests} reduced={reduced} />}
        {concept === "brief" && <Brief requests={requests} reduced={reduced} />}
      </main>
    </div>
  )
}
