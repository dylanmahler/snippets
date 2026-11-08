import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { motion, useSpring } from "motion/react"
import {
  OUTPUT_LABEL,
  REVEAL,
  STEP_LABEL,
  type Agent,
  type OutputView,
  type Person,
  type StepView,
} from "./model.ts"

type Face = Pick<Person, "name" | "initials" | "tone">

export function Avatar({ person, size = 28 }: { person: Face; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: person.tone,
        fontSize: size <= 20 ? 9 : 11,
      }}
      aria-hidden="true"
    >
      {person.initials}
    </span>
  )
}

export function Bloom() {
  return (
    <span className="bloom" aria-hidden="true">
      <span className="bloom-rotor" />
    </span>
  )
}

export function Chip({ agent, live }: { agent: Agent | Person; live: boolean }) {
  return (
    <span className="chip" data-live={live || undefined}>
      {live && <Bloom />}
      <Avatar person={agent} size={20} />
      <span>{agent.name}</span>
    </span>
  )
}

export function Outputs({ outputs }: { outputs: OutputView[] }) {
  if (outputs.length === 0) {
    return <p className="empty">June hasn’t sent anything back yet.</p>
  }
  return (
    <div className="outputs">
      {outputs.map((output) => (
        <article key={output.id} className="output">
          <p className="kicker">{OUTPUT_LABEL[output.kind]}</p>
          <h3>{output.title}</h3>
          <p>{output.body}</p>
        </article>
      ))}
    </div>
  )
}

export function BlockNote({ note }: { note?: string }) {
  if (!note) return null
  return <p className="block-note">{note}</p>
}

export function Bars({ label }: { label: string }) {
  return (
    <div className="bars" role="status" aria-label={label}>
      <span />
      <span />
    </div>
  )
}

export function Stream({
  open,
  reduced,
  children,
}: {
  open: boolean
  reduced: boolean
  children: ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const jumped = useRef(false)
  const height = useSpring(0, REVEAL)

  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const apply = (next: number) => {
      const immediate = reduced || !jumped.current
      if (immediate) height.jump(next)
      else height.set(next)
      jumped.current = true
    }
    apply(open ? Math.ceil(inner.getBoundingClientRect().height) : 0)
    if (reduced) return
    const observer = new ResizeObserver(() => {
      const next = open ? Math.ceil(inner.getBoundingClientRect().height) : 0
      if (Math.abs(next - height.get()) < 2) return
      height.set(next)
    })
    observer.observe(inner)
    return () => observer.disconnect()
  }, [height, open, reduced])

  return (
    <motion.div
      className="stream"
      style={{ height: reduced ? (open ? "auto" : 0) : height, overflow: "hidden" }}
    >
      <div ref={innerRef} inert={!open} aria-hidden={!open}>
        {children}
      </div>
    </motion.div>
  )
}

function StepRow({ step }: { step: StepView }) {
  const [open, setOpen] = useState(false)
  const hasChildren = step.children.length > 0
  const live = step.status === "working"
  const face = (
    <>
      <span className="step-avatar">
        {live && <Bloom />}
        <Avatar person={step.agent} size={28} />
      </span>
      <span className="step-copy">
        <span className="step-agent">{step.agent.name}</span>
        <span className="step-summary">{step.summary}</span>
      </span>
      {hasChildren && <span className="step-more" aria-hidden="true" />}
      <span className="step-state">{STEP_LABEL[step.status]}</span>
    </>
  )

  return (
    <li className="step" data-status={step.status}>
      {hasChildren ? (
        <button
          type="button"
          className="step-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {face}
        </button>
      ) : (
        <div className="step-toggle">{face}</div>
      )}
      {hasChildren && open && (
        <ol className="steps steps-nested">
          {step.children.map((child) => (
            <StepRow key={child.id} step={child} />
          ))}
        </ol>
      )}
    </li>
  )
}

export function StepTree({ steps }: { steps: StepView[] }) {
  if (steps.length === 0) {
    return <p className="empty">June hasn’t assigned this yet.</p>
  }
  return (
    <ol className="steps">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </ol>
  )
}
