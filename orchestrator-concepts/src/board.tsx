import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import {
  AGENTS,
  COLUMNS,
  STATUS_LABEL,
  springFor,
  watchLine,
  type RequestView,
} from "./model.ts"
import { Avatar, BlockNote, Bloom, Outputs, StepTree, Stream } from "./ui.tsx"

export function Board({ requests, reduced }: { requests: RequestView[]; reduced: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = requests.find((request) => request.id === openId) ?? null
  const placed = COLUMNS.flatMap((column, index) =>
    requests
      .filter((request) => request.status === column.id)
      .map((request, row) => ({ request, column: index + 1, row: row + 2 })),
  )

  return (
    <div className="board-wrap">
      <div className="board">
        {COLUMNS.map((column, index) => {
          const items = requests.filter((request) => request.status === column.id)
          return (
            <header
              key={column.id}
              className="column-head"
              style={{ gridColumn: index + 1, gridRow: 1 }}
            >
              <span className="dot" data-status={column.id} />
              <h2 id={`col-${column.id}`}>{column.label}</h2>
              <span className="count">{items.length}</span>
            </header>
          )
        })}
        {COLUMNS.map((column, index) => {
          const count = requests.filter((request) => request.status === column.id).length
          if (count > 0) return null
          return (
            <p
              key={`${column.id}-empty`}
              className="column-empty"
              style={{ gridColumn: index + 1, gridRow: 2 }}
            >
              {column.empty}
            </p>
          )
        })}
        {placed.map(({ request, column, row }) => (
          <Card
            key={request.id}
            request={request}
            reduced={reduced}
            column={column}
            row={row}
            open={openId === request.id}
            onOpen={() => setOpenId(request.id)}
          />
        ))}
      </div>
      {open && (
        <Sheet
          request={open}
          reduced={reduced}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

function Card({
  request,
  reduced,
  column,
  row,
  open,
  onOpen,
}: {
  request: RequestView
  reduced: boolean
  column: number
  row: number
  open: boolean
  onOpen: () => void
}) {
  const working = request.status === "working"
  return (
    <motion.div
      layout="position"
      className="bcard-wrap"
      initial={false}
      transition={springFor(reduced)}
      style={{ gridColumn: column, gridRow: row }}
    >
      {working && <Bloom />}
      <button
        type="button"
        className="bcard"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="brief-sheet"
        onClick={onOpen}
      >
        <span className="bcard-top">
          <span className="kicker">{request.area}</span>
          <span className="due">Due {request.due}</span>
        </span>
        <span className="bcard-title">{request.title}</span>
        <span className="assignee">
          <Avatar person={AGENTS.june} size={22} />
          <span>June</span>
        </span>
        <span className="glance">{watchLine(request)}</span>
        <span className="sr">{STATUS_LABEL[request.status]}</span>
      </button>
    </motion.div>
  )
}

function Sheet({
  request,
  reduced,
  onClose,
}: {
  request: RequestView
  reduced: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [stepsOpen, setStepsOpen] = useState(false)
  const titleId = "sheet-title"

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const previously = document.activeElement as HTMLElement | null
    const selector = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const items = () => [...node.querySelectorAll<HTMLElement>(selector)]
    items()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab") return
      const list = items()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previously?.focus()
    }
  }, [request.id])

  return (
    <>
      <button type="button" className="scrim" aria-label="Close brief" onClick={onClose} />
      <motion.div
        id="brief-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springFor(reduced)}
      >
        <header className="sheet-head">
          <div>
            <p className="kicker">
              {request.area} · Due {request.due}
            </p>
            <h2 id={titleId}>{request.title}</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            <span aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-body">
          <div className="people">
            <PersonRow label="Asked" people={[request.requester]} />
            <PersonRow label="On it" people={[AGENTS.june]} />
            {request.watchers.length > 0 && <PersonRow label="Watching" people={[...request.watchers]} />}
          </div>
          <p className="brief-text">{request.brief}</p>
          <BlockNote note={request.note} />
          <Outputs outputs={request.outputs} />
          <div className="disclosure">
            <button
              type="button"
              className="disclosure-toggle"
              aria-expanded={stepsOpen}
              onClick={() => setStepsOpen((value) => !value)}
            >
              How June is handling it
            </button>
            <Stream open={stepsOpen} reduced={reduced}>
              <div className="disclosure-body">
                <StepTree steps={request.steps} />
              </div>
            </Stream>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function PersonRow({
  label,
  people,
}: {
  label: string
  people: { name: string; initials: string; tone: string }[]
}) {
  return (
    <div className="person-row">
      <span className="person-label">{label}</span>
      <span className="person-faces">
        {people.map((person) => (
          <span key={person.name} className="person">
            <Avatar person={person} size={22} />
            {person.name}
          </span>
        ))}
      </span>
    </div>
  )
}
