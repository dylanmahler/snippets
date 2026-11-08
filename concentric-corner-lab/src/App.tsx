import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react"
import { flushSync } from "react-dom"
import { cornerArc, cornerCenters } from "./radius.ts"
import { filmAt, type CursorKind } from "./film-timeline.ts"
import { SPECIMEN, equationLabel, radiusLimit, sheetRadii } from "./specimen.ts"

const ARC = 1 - Math.SQRT1_2

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
  const outer = radius !== null && Number.isFinite(Number(radius)) ? Number(radius) : 48
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

  const specimen = root.querySelector(".specimen")
  const label = root.querySelector<HTMLElement>(".equation")
  const line = root.querySelector<SVGLineElement>(".leader line")
  if (specimen && label && line) {
    const origin = root.getBoundingClientRect()
    const box = specimen.getBoundingClientRect()
    const inset = SPECIMEN.padding + SPECIMEN.border
    const right = SPECIMEN.width - inset
    const bottom = SPECIMEN.height - inset
    const radius = radii.inner
    const scaleX = box.width / SPECIMEN.width
    const scaleY = box.height / SPECIMEN.height
    const x = box.left - origin.left + (right - radius + radius * Math.SQRT1_2) * scaleX
    const y = box.top - origin.top + (bottom - radius + radius * Math.SQRT1_2) * scaleY
    const outside = box.right - origin.left + 12
    label.textContent = equationLabel(visual.outer, visual.concentric)
    label.style.left = `${outside}px`
    label.style.top = `${y - 9}px`
    line.setAttribute("x1", x.toFixed(1))
    line.setAttribute("y1", y.toFixed(1))
    line.setAttribute("x2", (outside - 4).toFixed(1))
    line.setAttribute("y2", y.toFixed(1))
  }

  const segment = root.querySelector<HTMLElement>(".segment")
  const thumb = root.querySelector<HTMLElement>(".thumb")
  const matched = root.querySelector<HTMLElement>("[data-mode='matched']")
  const concentric = root.querySelector<HTMLElement>("[data-mode='concentric']")
  if (segment && thumb && matched && concentric) {
    const amount = Math.min(1, Math.max(0, visual.concentric))
    const left = matched.offsetLeft + (concentric.offsetLeft - matched.offsetLeft) * amount
    const width = matched.offsetWidth + (concentric.offsetWidth - matched.offsetWidth) * amount
    thumb.style.width = `${width}px`
    thumb.style.transform = `translate3d(${left}px, 0, 0)`
  }
}

function Study({
  mode,
  className,
  rootRef,
  onGripDown,
  onGripKey,
  onMode,
  instantMode,
  children,
}: {
  mode: Mode
  className: string
  rootRef?: RefObject<HTMLDivElement | null>
  onGripDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onGripKey?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onMode?: (mode: Mode, instant: boolean) => void
  instantMode?: boolean
  children?: ReactNode
}) {
  return (
    <div className={className} ref={rootRef}>
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
          aria-valuenow={48}
          onPointerDown={onGripDown}
          onKeyDown={onGripKey}
        />
        <span className="spot-park" data-spot="park" />
      </div>
      <svg className="leader" aria-hidden="true">
        <line />
      </svg>
      <p className="equation" />
      <div className="segment" role="radiogroup" aria-label="Corner relationship">
        <span className="thumb" aria-hidden="true" />
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
      {children}
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
  const drag = useRef<{ pointerId: number; x: number; y: number; origin: number; latest: number; raf: number } | null>(null)

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
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin, latest: origin, raf: 0 }
    root.dataset.dragging = "true"
    visual.current.outer = origin
    visual.current.guides = visual.current.concentric >= 0.5 ? 0.4 : 0
    setGuides(visual.current.guides)
    paint(root, visual.current)

    const move = (pointer: PointerEvent) => {
      const session = drag.current
      if (!session || pointer.pointerId !== session.pointerId) return
      const along = pointer.clientX - session.x + (pointer.clientY - session.y)
      session.latest = Math.min(MAX, Math.max(0, session.origin - along / (2 * ARC)))
      if (session.raf) return
      session.raf = requestAnimationFrame(() => {
        const active = drag.current
        if (!active) return
        active.raf = 0
        visual.current.outer = active.latest
        visual.current.guides = visual.current.concentric >= 0.5 ? 0.4 : 0
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
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowRight" || event.key === "ArrowDown"
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
    if (next === "concentric" && !instant && !reduced) {
      setGuides(0.4)
      window.setTimeout(() => setGuides(0), 340)
    } else {
      setGuides(0)
    }
  }

  return (
    <Study
      className="page stage"
      mode={mode}
      rootRef={rootRef}
      onGripDown={onGripDown}
      onGripKey={onGripKey}
      onMode={onMode}
      instantMode
    >
      <h1 className="sr">Concentric corner lab</h1>
    </Study>
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
  const cursorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const stage = stageRef.current
    const cursor = cursorRef.current
    if (!stage || !cursor) return
    paint(stage, { outer: frame.outer, concentric: frame.concentric, guides: frame.guides })
    const pressed = stage.querySelector<HTMLButtonElement>("[data-spot='concentric']")
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
    <Study className="film stage" mode={frame.concentric >= 0.5 ? "concentric" : "matched"} rootRef={stageRef}>
      <div className="film-cursor" ref={cursorRef} data-kind={frame.cursor as CursorKind} aria-hidden="true" data-pressed={frame.pressed ? frame.to : "none"}>
        {frame.cursor === "arrow" ? <ArrowCursor /> : <ResizeCursor />}
      </div>
    </Study>
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
