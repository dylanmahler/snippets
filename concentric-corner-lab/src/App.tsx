import { useEffect, useLayoutEffect, useRef, useState } from "react"

declare global {
  interface Window {
    __setFilmTime?: (time: number) => void
  }
}
import { flushSync } from "react-dom"
import { LIMITS, clamp } from "./radius"
import { filmAt } from "./film-timeline"
import {
  CornerCard,
  Grip,
  measureBox,
  paintStudy,
  type Box,
  type Values,
} from "./study"

type DragKind = "outer" | "padding" | "border"

type LabState = {
  outer: number
  padding: number
  border: number
  naive: boolean
  depth: 2 | 3
  focusOffset: number
  focusWidth: number
  showGuides: boolean
}

const INITIAL: LabState = {
  outer: 40,
  padding: 12,
  border: 2,
  naive: false,
  depth: 3,
  focusOffset: 3,
  focusWidth: 2,
  showGuides: false,
}

const FALLBACK: Box = { w: 560, h: 220, buttonW: 128, buttonH: 36 }

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function readQuery(): Partial<LabState> {
  const params = new URLSearchParams(window.location.search)
  const next: Partial<LabState> = {}
  const radius = params.get("radius")
  const pad = params.get("pad")
  if (radius !== null && Number.isFinite(Number(radius))) next.outer = Number(radius)
  if (pad !== null && Number.isFinite(Number(pad))) next.padding = Number(pad)
  if (params.get("guides") === "1") next.showGuides = true
  if (params.get("naive") === "1") next.naive = true
  return next
}

function stepValue(current: number, key: string, min: number, max: number) {
  const delta =
    key === "ArrowRight" || key === "ArrowUp"
      ? 1
      : key === "ArrowLeft" || key === "ArrowDown"
        ? -1
        : key === "PageUp"
          ? 8
          : key === "PageDown"
            ? -8
            : key === "Home"
              ? min - current
              : key === "End"
                ? max - current
                : null
  if (delta === null) return null
  return clamp(current + delta, min, max)
}

type Session = {
  kind: DragKind
  pointerId: number
  x: number
  y: number
  origin: number
  latest: number
  raf: number
}

export function App() {
  const reduced = useReducedMotion()
  const [state, setState] = useState<LabState>({ ...INITIAL, ...readQuery() })
  const [tray, setTray] = useState(false)
  const [more, setMore] = useState(false)
  const [handles, setHandles] = useState(false)
  const [drag, setDrag] = useState<DragKind | null>(null)
  const [focused, setFocused] = useState(false)

  const stateRef = useRef(state)
  const boxRef = useRef<Box>(FALLBACK)
  const dragRef = useRef<Session | null>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const badgeRef = useRef<HTMLParagraphElement>(null)
  const adjustRef = useRef<HTMLButtonElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  stateRef.current = state

  const valuesOf = (current: LabState, dragging: DragKind | null): Values => ({
    outer: current.outer,
    padding: current.padding,
    border: current.border,
    naive: current.naive,
    depth: current.depth,
    focusOffset: current.focusOffset,
    focusWidth: current.focusWidth,
    guides: dragging || current.showGuides ? 1 : 0,
  })

  const paint = () => {
    const shell = shellRef.current
    if (!shell) return
    const dragging = dragRef.current?.kind ?? null
    paintStudy(
      shell,
      shell.querySelector(".guides"),
      badgeRef.current,
      valuesOf(stateRef.current, dragging),
      boxRef.current,
    )
  }

  const measure = () => {
    const shell = shellRef.current
    const button = buttonRef.current
    if (!shell || !button) return
    const next = measureBox(shell, button)
    if (next.w < 20) return
    const prev = boxRef.current
    const changed =
      Math.abs(prev.w - next.w) > 0.5 ||
      Math.abs(prev.h - next.h) > 0.5 ||
      Math.abs(prev.buttonW - next.buttonW) > 0.5 ||
      Math.abs(prev.buttonH - next.buttonH) > 0.5
    if (!changed) return
    boxRef.current = next
    paint()
  }

  useLayoutEffect(() => {
    measure()
    paint()
    const shell = shellRef.current
    if (!shell) return
    const observer = new ResizeObserver(() => measure())
    observer.observe(shell)
    return () => observer.disconnect()
  })

  const commit = (partial: Partial<LabState>) => {
    const next = { ...stateRef.current, ...partial }
    stateRef.current = next
    setState(next)
  }

  const endDrag = () => {
    const session = dragRef.current
    if (!session) return
    if (session.raf) cancelAnimationFrame(session.raf)
    const kind = session.kind
    const latest = session.latest
    dragRef.current = null
    setDrag(null)
    commit({ [kind]: latest })
  }

  useEffect(() => {
    const stop = () => endDrag()
    window.addEventListener("blur", stop)
    return () => window.removeEventListener("blur", stop)
  })

  const onGripDown = (kind: DragKind) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) endDrag()
    event.preventDefault()
    const node = event.currentTarget
    node.setPointerCapture(event.pointerId)
    const origin = stateRef.current[kind]
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin,
      latest: origin,
      raf: 0,
    }
    setDrag(kind)
    const move = (pointer: PointerEvent) => {
      const session = dragRef.current
      if (!session || pointer.pointerId !== session.pointerId) return
      const delta = kind === "padding" ? pointer.clientY - session.y : pointer.clientX - session.x
      const limit = LIMITS[kind]
      session.latest = clamp(session.origin + delta, limit.min, limit.max)
      if (session.raf) return
      session.raf = requestAnimationFrame(() => {
        const active = dragRef.current
        if (!active) return
        active.raf = 0
        stateRef.current = { ...stateRef.current, [active.kind]: active.latest }
        paint()
        measure()
      })
    }
    const up = (pointer: PointerEvent) => {
      const session = dragRef.current
      if (!session || pointer.pointerId !== session.pointerId) return
      node.removeEventListener("pointermove", move)
      node.removeEventListener("pointerup", up)
      node.removeEventListener("pointercancel", up)
      node.removeEventListener("lostpointercapture", up)
      endDrag()
    }
    node.addEventListener("pointermove", move)
    node.addEventListener("pointerup", up)
    node.addEventListener("pointercancel", up)
    node.addEventListener("lostpointercapture", up)
  }

  const onGripKey = (kind: DragKind) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const limit = LIMITS[kind]
    const next = stepValue(stateRef.current[kind], event.key, limit.min, limit.max)
    if (next === null) return
    event.preventDefault()
    commit({ [kind]: next })
  }

  useEffect(() => {
    if (!tray) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (trayRef.current?.contains(target)) return
      if (adjustRef.current?.contains(target)) return
      setMore(false)
      setTray(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (more) {
        setMore(false)
        return
      }
      setTray(false)
      adjustRef.current?.focus()
    }
    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [tray, more])

  const onFrameClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    if ((event.target as HTMLElement).closest("button, a, input")) return
    setHandles((value) => !value)
  }

  return (
    <div className="lab" data-reduced={reduced} data-drag={drag ?? "none"}>
      <h1 className="sr">Concentric corner lab</h1>
      <main className="stage" onClick={onFrameClick}>
        <CornerCard
          badgeRef={badgeRef}
          shellRef={shellRef}
          buttonRef={buttonRef}
          hot={drag !== null || focused}
          handles={handles}
          onApproveFocus={setFocused}
        >
          <Grip
            kind="outer"
            spot="radius"
            label="Outer radius"
            value={state.outer}
            min={LIMITS.outer.min}
            max={LIMITS.outer.max}
            onPointerDown={onGripDown("outer")}
            onKeyDown={onGripKey("outer")}
          />
          <Grip
            kind="padding"
            spot="pad"
            label="Padding"
            value={state.padding}
            min={LIMITS.padding.min}
            max={LIMITS.padding.max}
            onPointerDown={onGripDown("padding")}
            onKeyDown={onGripKey("padding")}
          />
          <Grip
            kind="border"
            label="Border width"
            value={state.border}
            min={LIMITS.border.min}
            max={LIMITS.border.max}
            onPointerDown={onGripDown("border")}
            onKeyDown={onGripKey("border")}
          />
        </CornerCard>
        <div className="tools">
          <div className="dock">
            <button
              type="button"
              className="tool"
              ref={adjustRef}
              aria-expanded={tray}
              aria-controls="adjust-tray"
              onClick={() => setTray((open) => !open)}
            >
              Adjust
            </button>
            <div
              className="tray"
              id="adjust-tray"
              ref={trayRef}
              role="dialog"
              aria-label="Adjust"
              data-open={tray}
              inert={!tray}
            >
              <Slider
                id="outer-radius"
                label="Radius"
                value={state.outer}
                min={LIMITS.outer.min}
                max={LIMITS.outer.max}
                onChange={(outer) => commit({ outer })}
              />
              <Slider
                id="padding"
                label="Padding"
                value={state.padding}
                min={LIMITS.padding.min}
                max={LIMITS.padding.max}
                onChange={(padding) => commit({ padding })}
              />
              <Slider
                id="border"
                label="Border"
                value={state.border}
                min={LIMITS.border.min}
                max={LIMITS.border.max}
                onChange={(border) => commit({ border })}
              />
              <button
                type="button"
                className="more-toggle"
                aria-expanded={more}
                onClick={() => setMore((open) => !open)}
              >
                More
              </button>
              <div className="more" data-open={more} inert={!more}>
                <div className="more-inner">
                  <Slider
                    id="focus-offset"
                    label="Focus offset"
                    value={state.focusOffset}
                    min={LIMITS.focusOffset.min}
                    max={LIMITS.focusOffset.max}
                    onChange={(focusOffset) => commit({ focusOffset })}
                  />
                  <Slider
                    id="focus-width"
                    label="Focus width"
                    value={state.focusWidth}
                    min={LIMITS.focusWidth.min}
                    max={LIMITS.focusWidth.max}
                    onChange={(focusWidth) => commit({ focusWidth })}
                  />
                  <div className="depths" role="radiogroup" aria-label="Nesting depth">
                    {([2, 3] as const).map((depth) => (
                      <button
                        key={depth}
                        type="button"
                        role="radio"
                        aria-checked={state.depth === depth}
                        tabIndex={state.depth === depth ? 0 : -1}
                        onClick={() => commit({ depth })}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                          event.preventDefault()
                          commit({ depth: event.key === "ArrowRight" ? 3 : 2 })
                        }}
                      >
                        {depth} levels
                      </button>
                    ))}
                  </div>
                  <p className="formula">
                    button = min(height / 2, panel − padding − border)
                  </p>
                  <p className="credit">
                    Inspired by{" "}
                    <a href="https://x.com/maybepratikk/status/2118614980635603062">@maybepratikk</a>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="reset"
                onClick={() => commit({ ...INITIAL })}
              >
                Reset
              </button>
            </div>
          </div>
          <button
            type="button"
            className="tool"
            aria-pressed={state.showGuides}
            onClick={() => commit({ showGuides: !state.showGuides })}
          >
            Guides
          </button>
          <button
            type="button"
            className="tool"
            data-spot="compare"
            aria-pressed={state.naive}
            onClick={() => commit({ naive: !state.naive })}
          >
            Compare
          </button>
        </div>
      </main>
    </div>
  )
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="slider">
      <div className="slider-top">
        <label htmlFor={id}>{label}</label>
        <span className="slider-value">{Math.round(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        aria-valuetext={`${Math.round(value)} pixels`}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

export function Film({ time }: { time: number }) {
  const frame = filmAt(time)
  const stageRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const badgeRef = useRef<HTMLParagraphElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<Box>(FALLBACK)

  const values: Values = {
    outer: frame.outer,
    padding: frame.padding,
    border: frame.border,
    naive: frame.naiveMix > 0.5,
    depth: 3,
    focusOffset: 3,
    focusWidth: 2,
    guides: frame.guides,
  }

  useLayoutEffect(() => {
    const shell = shellRef.current
    const button = buttonRef.current
    const stage = stageRef.current
    if (!shell || !button || !stage) return
    boxRef.current = measureBox(shell, button)
    paintStudy(shell, shell.querySelector(".guides"), badgeRef.current, values, boxRef.current)
    const origin = stage.getBoundingClientRect()
    const spot = (name: string) => {
      const el = stage.querySelector(`[data-spot="${name}"]`)
      if (!el) return { x: 40, y: 40 }
      const rect = el.getBoundingClientRect()
      return {
        x: rect.left - origin.left + rect.width * (name === "compare" || name === "reset" ? 0.82 : 0.5),
        y: rect.top - origin.top + rect.height * 0.62,
      }
    }
    const from = spot(frame.from)
    const to = spot(frame.to)
    const x = from.x + (to.x - from.x) * frame.travel
    const y = from.y + (to.y - from.y) * frame.travel
    const cursor = cursorRef.current
    if (!cursor) return
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
    cursor.dataset.kind = frame.cursor
    cursor.dataset.pressed = String(frame.pressed)
  })

  return (
    <div className="film" ref={stageRef} data-pressed={frame.pressed ? frame.to : "none"}>
      <div className="stage">
        <CornerCard
          badgeRef={badgeRef}
          shellRef={shellRef}
          buttonRef={buttonRef}
          hot={frame.pressed && (frame.to === "radius" || frame.to === "pad")}
          handles={false}
        >
          <Grip kind="outer" spot="radius" label="Outer radius" value={frame.outer} min={0} max={72} />
          <Grip kind="padding" spot="pad" label="Padding" value={frame.padding} min={0} max={20} />
          <span className="spot-park" data-spot="park" />
        </CornerCard>
        <div className="tools">
          <button type="button" className="tool" data-spot="compare" aria-pressed={frame.naiveMix > 0.5}>
            Compare
          </button>
          <button type="button" className="text-button" data-spot="reset">
            Reset
          </button>
        </div>
      </div>
      <div className="film-cursor" ref={cursorRef} data-kind={frame.cursor} aria-hidden="true">
        {frame.cursor === "arrow" ? <ArrowCursor /> : <ResizeCursor axis={frame.cursor} />}
      </div>
    </div>
  )
}

function ArrowCursor() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="cursor-arrow">
      <path
        d="M4 2.5 16.2 10.2 9.4 11.4 7.2 17.6Z"
        fill="#1c1c1e"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ResizeCursor({ axis }: { axis: "ew" | "ns" }) {
  const rotate = axis === "ns" ? 90 : 0
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${rotate}deg)` }}>
      <path
        d="M4 11h14M4 11 7.2 8.2M4 11 7.2 13.8M18 11l-3.2-2.8M18 11l-3.2 2.8"
        fill="none"
        stroke="#1c1c1e"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  return <Film time={reduced ? 8400 : time} />
}
