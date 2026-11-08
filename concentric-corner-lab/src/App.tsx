import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react"
import { flushSync } from "react-dom"
import { cornerArc, cornerCenters } from "./radius.ts"
import { filmAt, type CursorKind } from "./film-timeline.ts"
import { SPECIMEN, equationLabel, radiusLimit, sheetRadii } from "./specimen.ts"

declare global {
  interface Window {
    __setFilmTime?: (time: number) => void
  }
}

type Mode = "matched" | "concentric"

type Visual = {
  outer: number
  concentric: number
  guides: number
}

const MAX = radiusLimit()

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function readLive() {
  const params = new URLSearchParams(window.location.search)
  const radius = params.get("radius")
  const outer = radius !== null && Number.isFinite(Number(radius)) ? Number(radius) : 36
  const mode: Mode = params.get("mode") === "concentric" ? "concentric" : "matched"
  return { outer, mode }
}

function paint(root: HTMLElement, visual: Visual) {
  const radii = sheetRadii(visual.outer, visual.concentric)
  root.style.setProperty("--r-outer", radii.card.toFixed(2))
  root.style.setProperty("--r-inner", radii.inner.toFixed(2))
  root.style.setProperty("--guides", visual.guides.toFixed(3))
  root.dataset.mode = visual.concentric >= 0.5 ? "concentric" : "matched"
  root.dataset.outer = radii.card.toFixed(2)
  root.dataset.inner = radii.inner.toFixed(2)

  const equation = root.querySelector(".equation")
  if (equation) equation.textContent = equationLabel(visual.outer, visual.concentric)

  const guides = root.querySelector<SVGSVGElement>(".guides")
  if (guides) {
    const centers = cornerCenters(
      {
        cardWidth: SPECIMEN.width,
        cardHeight: SPECIMEN.height,
        padding: SPECIMEN.padding,
        border: SPECIMEN.border,
      },
      { card: radii.card, panel: radii.inner, button: 0 },
    )
    guides.querySelector("[data-arc='outer']")?.setAttribute("d", cornerArc(centers.card.x, centers.card.y, radii.card))
    guides.querySelector("[data-arc='inner']")?.setAttribute("d", cornerArc(centers.panel.x, centers.panel.y, radii.inner))
  }

  const grip = root.querySelector<HTMLButtonElement>(".grip")
  if (grip) {
    grip.setAttribute("aria-valuenow", String(Math.round(radii.card)))
    grip.setAttribute("aria-valuetext", `${Math.round(radii.card)} pixels`)
  }

  const line = root.querySelector<SVGLineElement>(".leader line")
  const label = root.querySelector<HTMLElement>(".equation")
  if (line && label) {
    const origin = root.getBoundingClientRect()
    const labelBox = label.getBoundingClientRect()
    const gripX = SPECIMEN.width - radii.card
    const along = Math.min(18, Math.max(8, radii.card * 0.45))
    const rise = Math.sqrt(Math.max(0, radii.card * radii.card - along * along))
    const x1 = gripX + along
    const y1 = SPECIMEN.height - radii.card + rise
    const x2 = labelBox.left - origin.left + Math.min(16, labelBox.width / 2)
    const y2 = labelBox.top - origin.top + 1
    line.setAttribute("x1", x1.toFixed(1))
    line.setAttribute("y1", y1.toFixed(1))
    line.setAttribute("x2", x2.toFixed(1))
    line.setAttribute("y2", y2.toFixed(1))
  }
}

function Study({
  mode,
  rootRef,
  onGripDown,
  onGripKey,
  onMode,
  instantMode,
}: {
  mode: Mode
  rootRef?: RefObject<HTMLDivElement | null>
  onGripDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripKey?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onMode?: (mode: Mode, instant: boolean) => void
  instantMode?: boolean
}) {
  return (
    <div className="study" ref={rootRef}>
      <div className="specimen">
        <div className="outer">
          <div className="inner" />
        </div>
        <svg className="guides" viewBox={`0 0 ${SPECIMEN.width} ${SPECIMEN.height}`} aria-hidden="true">
          <path data-arc="outer" />
          <path data-arc="inner" />
        </svg>
        <button
          type="button"
          className="grip"
          data-spot="grip"
          role="slider"
          aria-label="Outer radius"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={36}
          onPointerDown={onGripDown}
          onKeyDown={onGripKey}
        />
      </div>
      <div className="row">
        <div className="segment" role="radiogroup" aria-label="Corner relationship">
          <button
            type="button"
            role="radio"
            data-mode="matched"
            aria-checked={mode === "matched"}
            tabIndex={mode === "matched" ? 0 : -1}
            onClick={() => onMode?.("matched", false)}
            onKeyDown={(event) => onSegmentKey(event, onMode, instantMode)}
          >
            Matched
          </button>
          <button
            type="button"
            role="radio"
            data-mode="concentric"
            data-spot="concentric"
            aria-checked={mode === "concentric"}
            tabIndex={mode === "concentric" ? 0 : -1}
            onClick={() => onMode?.("concentric", false)}
            onKeyDown={(event) => onSegmentKey(event, onMode, instantMode)}
          >
            Concentric
          </button>
        </div>
        <p className="equation" />
      </div>
      <svg className="leader" aria-hidden="true">
        <line />
      </svg>
    </div>
  )
}

function onSegmentKey(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  onMode: ((mode: Mode, instant: boolean) => void) | undefined,
  instantMode: boolean | undefined,
) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
  event.preventDefault()
  const next: Mode = event.key === "ArrowRight" ? "concentric" : "matched"
  onMode?.(next, instantMode !== false)
  const group = event.currentTarget.parentElement
  const target = group?.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)
  target?.focus()
}

export function App() {
  const reduced = useReducedMotion()
  const initial = readLive()
  const [outer, setOuter] = useState(initial.outer)
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [guides, setGuides] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const visual = useRef<Visual>({
    outer: initial.outer,
    concentric: initial.mode === "concentric" ? 1 : 0,
    guides: 0,
  })
  const drag = useRef<{ pointerId: number; x: number; origin: number; latest: number; raf: number } | null>(null)

  const apply = (next: Partial<Visual>, instant = false) => {
    visual.current = { ...visual.current, ...next }
    const root = rootRef.current
    if (!root) return
    if (instant || reduced) root.dataset.instant = "true"
    paint(root, visual.current)
    if (instant || reduced) {
      requestAnimationFrame(() => {
        if (rootRef.current && !drag.current) rootRef.current.dataset.instant = "false"
      })
    }
  }

  useLayoutEffect(() => {
    if (drag.current) {
      visual.current.guides = guides
      if (rootRef.current) paint(rootRef.current, visual.current)
      return
    }
    const instant = reduced || rootRef.current?.dataset.instant === "true"
    apply({
      outer,
      concentric: mode === "concentric" ? 1 : 0,
      guides,
    }, instant)
  })

  useEffect(() => {
    const stop = () => {
      if (!drag.current) return
      if (drag.current.raf) cancelAnimationFrame(drag.current.raf)
      const latest = drag.current.latest
      drag.current = null
      rootRef.current?.removeAttribute("data-dragging")
      setGuides(0)
      setOuter(latest)
    }
    window.addEventListener("blur", stop)
    return () => window.removeEventListener("blur", stop)
  }, [])

  const onGripDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const node = event.currentTarget
    const root = rootRef.current
    if (!root) return
    node.setPointerCapture(event.pointerId)
    const current = parseFloat(getComputedStyle(root.querySelector(".outer") as Element).borderTopLeftRadius)
    const origin = Number.isFinite(current) ? current : visual.current.outer
    drag.current = { pointerId: event.pointerId, x: event.clientX, origin, latest: origin, raf: 0 }
    root.dataset.dragging = "true"
    visual.current.outer = origin
    visual.current.guides = 1
    setGuides(1)
    paint(root, visual.current)

    const move = (pointer: PointerEvent) => {
      const session = drag.current
      if (!session || pointer.pointerId !== session.pointerId) return
      session.latest = Math.min(MAX, Math.max(0, session.origin - (pointer.clientX - session.x)))
      if (session.raf) return
      session.raf = requestAnimationFrame(() => {
        const active = drag.current
        if (!active) return
        active.raf = 0
        visual.current.outer = active.latest
        visual.current.guides = 1
        if (rootRef.current) paint(rootRef.current, visual.current)
      })
    }
    const up = (pointer: PointerEvent) => {
      const session = drag.current
      if (!session || pointer.pointerId !== session.pointerId) return
      node.removeEventListener("pointermove", move)
      node.removeEventListener("pointerup", up)
      node.removeEventListener("pointercancel", up)
      node.removeEventListener("lostpointercapture", up)
      if (session.raf) cancelAnimationFrame(session.raf)
      const latest = session.latest
      drag.current = null
      root.dataset.dragging = "false"
      setGuides(0)
      setOuter(latest)
    }
    node.addEventListener("pointermove", move)
    node.addEventListener("pointerup", up)
    node.addEventListener("pointercancel", up)
    node.addEventListener("lostpointercapture", up)
  }

  const onGripKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : event.key === "Home"
            ? -MAX
            : event.key === "End"
              ? MAX
              : null
    if (delta === null) return
    event.preventDefault()
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? MAX : Math.min(MAX, Math.max(0, visual.current.outer + delta))
    visual.current.outer = next
    rootRef.current?.setAttribute("data-instant", "true")
    setOuter(next)
  }

  const onMode = (next: Mode, instant: boolean) => {
    if (instant || reduced) rootRef.current?.setAttribute("data-instant", "true")
    setMode(next)
    setGuides(next === "matched" ? 1 : 1)
    window.setTimeout(() => setGuides(0), reduced || instant ? 0 : 220)
  }

  return (
    <div className="page" data-reduced={reduced}>
      <h1 className="sr">Concentric corner lab</h1>
      <Study mode={mode} rootRef={rootRef} onGripDown={onGripDown} onGripKey={onGripKey} onMode={onMode} instantMode />
    </div>
  )
}

function ArrowCursor() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M4 2.5 16.2 10.2 9.4 11.4 7.2 17.6Z" fill="#202020" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function ResizeCursor() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <path
        d="M4 11h14M4 11 7.2 8.2M4 11 7.2 13.8M18 11l-3.2-2.8M18 11l-3.2 2.8"
        fill="none"
        stroke="#202020"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Film({ time }: { time: number }) {
  const frame = filmAt(time)
  const stageRef = useRef<HTMLDivElement>(null)
  const studyRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const study = studyRef.current
    const stage = stageRef.current
    const cursor = cursorRef.current
    if (!study || !stage || !cursor) return
    paint(study, { outer: frame.outer, concentric: frame.concentric, guides: frame.guides })
    const pressed = study.querySelector<HTMLButtonElement>("[data-spot='concentric']")
    if (pressed) pressed.dataset.pressed = String(frame.pressed && frame.to === "concentric")

    const origin = stage.getBoundingClientRect()
    const spot = (name: string) => {
      const el = stage.querySelector(`[data-spot="${name}"]`)
      if (!el) return { x: 80, y: 80 }
      const rect = el.getBoundingClientRect()
      const ax = name === "concentric" ? 0.82 : 0.5
      const ay = name === "concentric" ? 0.62 : 0.5
      return { x: rect.left - origin.left + rect.width * ax, y: rect.top - origin.top + rect.height * ay }
    }
    const from = spot(frame.from)
    const to = spot(frame.to)
    const x = from.x + (to.x - from.x) * frame.travel
    const y = from.y + (to.y - from.y) * frame.travel
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
    cursor.dataset.kind = frame.cursor
  })

  return (
    <div className="film" ref={stageRef} data-pressed={frame.pressed ? frame.to : "none"}>
      <Study mode={frame.concentric >= 0.5 ? "concentric" : "matched"} rootRef={studyRef} />
      <span className="spot-park" data-spot="park" />
      <div className="film-cursor" ref={cursorRef} data-kind={frame.cursor as CursorKind} aria-hidden="true">
        {frame.cursor === "arrow" ? <ArrowCursor /> : <ResizeCursor />}
      </div>
    </div>
  )
}

export function FilmRoot() {
  const reduced = useReducedMotion()
  const params = new URLSearchParams(window.location.search)
  const initial = Number(params.get("t") || 0)
  const [time, setTime] = useState(Number.isFinite(initial) ? initial : 0)

  useEffect(() => {
    window.__setFilmTime = (next: number) => {
      flushSync(() => setTime(next))
    }
    document.documentElement.dataset.filmReady = "true"
  }, [])

  return <Film time={reduced ? 11000 : time} />
}
