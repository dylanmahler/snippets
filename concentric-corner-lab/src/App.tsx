import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react"
import { useSpring, type MotionValue } from "motion/react"
import {
  BUTTON_HEIGHT,
  LIMITS,
  clamp,
  cornerArc,
  cornerCenters,
  derive,
  distance,
  squareMark,
  type DeriveInput,
  type Point,
} from "./radius"

const SPRING = { stiffness: 320, damping: 28, mass: 0.7 }

type Depth = 2 | 3
type DragKind = "outer" | "padding" | "border"

type LabState = {
  outer: number
  padding: number
  border: number
  depth: Depth
  focusOffset: number
  focusWidth: number
  showGuides: boolean
  naive: boolean
}

type Box = {
  w: number
  h: number
  buttonW: number
  buttonH: number
}

const INITIAL: LabState = {
  outer: 40,
  padding: 12,
  border: 2,
  depth: 3,
  focusOffset: 3,
  focusWidth: 2,
  showGuides: true,
  naive: false,
}

const FALLBACK_BOX: Box = { w: 520, h: 268, buttonW: 140, buttonH: BUTTON_HEIGHT }

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useLayoutEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function toInput(state: LabState, box: Box, mix?: { naive: number; depth: number }): DeriveInput {
  return {
    outer: state.outer,
    padding: state.padding,
    border: state.border,
    focusOffset: state.focusOffset,
    focusWidth: state.focusWidth,
    naiveMix: mix ? mix.naive : state.naive ? 1 : 0,
    depthMix: mix ? mix.depth : state.depth === 3 ? 1 : 0,
    cardWidth: box.w,
    cardHeight: box.h,
    buttonWidth: box.buttonW,
    buttonHeight: box.buttonH,
  }
}

function formatPx(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
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

function cluster(points: Point[], epsilon = 1.25) {
  const groups: Point[][] = []
  for (const point of points) {
    const group = groups.find((entry) => distance(entry[0], point) < epsilon)
    if (group) group.push(point)
    else groups.push([point])
  }
  return groups
}

function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.4 8.3 6.35 11.15 12.6 4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardFace({
  interactive,
  approveRef,
  onApproveFocus,
}: {
  interactive: boolean
  approveRef?: RefObject<HTMLButtonElement | null>
  onApproveFocus?: (focused: boolean) => void
}) {
  return (
    <article className="card">
      <div className="panel">
        <div className="copy">
          <p className="kicker">Approval</p>
          <h2>Ship billing-api</h2>
          <p className="body">v2.4.1 is ready for production. Checks passed.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-quiet" disabled aria-label="Hold, needs a second reviewer">
            Hold
          </button>
          <button type="button" className="btn btn-line" tabIndex={interactive ? 0 : -1}>
            Revise
          </button>
        </div>
        <button
          type="button"
          className="btn btn-solid"
          ref={approveRef}
          tabIndex={interactive ? 0 : -1}
          onFocus={(event) => {
            onApproveFocus?.(event.currentTarget.matches(":focus-visible"))
          }}
          onBlur={() => onApproveFocus?.(false)}
        >
          <CheckIcon />
          <span>Approve</span>
        </button>
      </div>
    </article>
  )
}

function Guides({ svgRef }: { svgRef: RefObject<SVGSVGElement | null> }) {
  return (
    <svg ref={svgRef} className="guides" aria-hidden="true">
      {["card", "panel", "button", "ring"].map((name) => (
        <g key={name}>
          <path data-arc={`${name}-halo`} />
          <path data-arc={name} />
        </g>
      ))}
      <path data-arc="squares" />
      <line data-arc="link" />
      <circle data-arc="dot-a" r="3.5" />
      <circle data-arc="dot-b" r="3.5" />
      <circle data-arc="dot-c" r="3.5" />
    </svg>
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
        <span className="slider-value">{value}px</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={`${value} pixels`}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function Knob({
  kind,
  label,
  value,
  min,
  max,
  dragging,
  onPointerDown,
  onKeyDown,
}: {
  kind: DragKind
  label: string
  value: number
  min: number
  max: number
  dragging: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      className={`knob knob-${kind}`}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} pixels`}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className="knob-tip">{value}px</span>
    </button>
  )
}

function writeSpring(spring: MotionValue<number>, value: number, how: "jump" | "set") {
  if (how === "jump") spring.jump(value)
  else spring.set(value)
}

function drawGuides(svg: SVGSVGElement, input: DeriveInput, radii: ReturnType<typeof derive>) {
  svg.setAttribute("viewBox", `0 0 ${input.cardWidth} ${input.cardHeight}`)
  const centers = cornerCenters(input, radii)
  const arcs: Array<[string, Point, number]> = [
    ["card", centers.card, radii.card],
    ["panel", centers.panel, radii.panel],
    ["button", centers.button, radii.button],
    ["ring", centers.button, radii.ringCenterline],
  ]
  for (const [name, center, radius] of arcs) {
    const path = cornerArc(center.x, center.y, radius)
    svg.querySelector(`[data-arc="${name}"]`)?.setAttribute("d", path)
    svg.querySelector(`[data-arc="${name}-halo"]`)?.setAttribute("d", path)
  }

  const squares = [
    radii.card < 0.5 ? squareMark(centers.cardCorner.x, centers.cardCorner.y) : "",
    radii.panel < 0.5 ? squareMark(centers.panelCorner.x, centers.panelCorner.y) : "",
    radii.button < 0.5 ? squareMark(centers.buttonCorner.x, centers.buttonCorner.y) : "",
  ].join(" ")
  svg.querySelector('[data-arc="squares"]')?.setAttribute("d", squares)

  const points = [
    radii.card >= 1 ? centers.card : null,
    radii.panel >= 1 ? centers.panel : null,
    radii.button >= 1 ? centers.button : null,
  ].filter((point): point is Point => point !== null)
  const groups = cluster(points)
  ;["dot-a", "dot-b", "dot-c"].forEach((name, index) => {
    const dot = svg.querySelector(`[data-arc="${name}"]`)
    const group = groups[index]
    if (!dot) return
    if (!group) {
      dot.setAttribute("opacity", "0")
      return
    }
    const x = group.reduce((sum, point) => sum + point.x, 0) / group.length
    const y = group.reduce((sum, point) => sum + point.y, 0) / group.length
    dot.setAttribute("cx", x.toFixed(2))
    dot.setAttribute("cy", y.toFixed(2))
    dot.setAttribute("r", groups.length === 1 ? "4.5" : "3")
    dot.setAttribute("opacity", "1")
  })

  const link = svg.querySelector('[data-arc="link"]')
  if (!link) return
  if (distance(centers.card, centers.button) > 1.25) {
    link.setAttribute("x1", centers.card.x.toFixed(2))
    link.setAttribute("y1", centers.card.y.toFixed(2))
    link.setAttribute("x2", centers.button.x.toFixed(2))
    link.setAttribute("y2", centers.button.y.toFixed(2))
    link.setAttribute("opacity", "1")
  } else {
    link.setAttribute("opacity", "0")
  }
}

export function App() {
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState<LabState>(INITIAL)
  const [box, setBox] = useState<Box>(FALLBACK_BOX)
  const [drag, setDrag] = useState<DragKind | null>(null)
  const [ready, setReady] = useState(false)
  const [approveFocus, setApproveFocus] = useState(false)

  const stateRef = useRef(state)
  const reducedRef = useRef(reduced)
  const dragRef = useRef(false)
  const readyRef = useRef(false)
  stateRef.current = state
  reducedRef.current = reduced

  const labRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const approveRef = useRef<HTMLButtonElement>(null)
  const loupeRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const mainGuidesRef = useRef<SVGSVGElement>(null)
  const loupeGuidesRef = useRef<SVGSVGElement>(null)
  const depthRefs = useRef<Partial<Record<Depth, HTMLButtonElement>>>({})

  const outerS = useSpring(INITIAL.outer, SPRING)
  const padS = useSpring(INITIAL.padding, SPRING)
  const borderS = useSpring(INITIAL.border, SPRING)
  const focusOffsetS = useSpring(INITIAL.focusOffset, SPRING)
  const focusWidthS = useSpring(INITIAL.focusWidth, SPRING)
  const naiveS = useSpring(0, SPRING)
  const depthS = useSpring(1, SPRING)

  const commit = (partial: Partial<LabState>, how: "jump" | "spring") => {
    const next = { ...stateRef.current, ...partial }
    stateRef.current = next
    const write = reducedRef.current || how === "jump" ? "jump" : "set"
    writeSpring(outerS, next.outer, write)
    writeSpring(padS, next.padding, write)
    writeSpring(borderS, next.border, write)
    writeSpring(focusOffsetS, next.focusOffset, write)
    writeSpring(focusWidthS, next.focusWidth, write)
    writeSpring(naiveS, next.naive ? 1 : 0, write)
    writeSpring(depthS, next.depth === 3 ? 1 : 0, write)
    setState(next)
  }
  const commitRef = useRef(commit)
  commitRef.current = commit

  const paintRef = useRef(() => {})
  paintRef.current = () => {
    const lab = labRef.current
    const shell = shellRef.current
    if (!lab || !shell) return

    const rect = shell.getBoundingClientRect()
    const buttonRect = approveRef.current?.getBoundingClientRect()
    const measured =
      rect.width > 20
        ? {
            w: rect.width,
            h: rect.height,
            buttonW: buttonRect && buttonRect.width > 1 ? buttonRect.width : FALLBACK_BOX.buttonW,
            buttonH: buttonRect && buttonRect.height > 1 ? buttonRect.height : BUTTON_HEIGHT,
          }
        : FALLBACK_BOX

    const input: DeriveInput = {
      outer: outerS.get(),
      padding: padS.get(),
      border: borderS.get(),
      focusOffset: focusOffsetS.get(),
      focusWidth: focusWidthS.get(),
      naiveMix: naiveS.get(),
      depthMix: depthS.get(),
      cardWidth: measured.w,
      cardHeight: measured.h,
      buttonWidth: measured.buttonW,
      buttonHeight: measured.buttonH,
    }
    const radii = derive(input)

    lab.style.setProperty("--r-card", radii.card.toFixed(2))
    lab.style.setProperty("--r-panel", radii.panel.toFixed(2))
    lab.style.setProperty("--r-button", radii.button.toFixed(2))
    lab.style.setProperty("--pad", input.padding.toFixed(2))
    lab.style.setProperty("--border", input.border.toFixed(2))
    lab.style.setProperty("--focus-offset", input.focusOffset.toFixed(2))
    lab.style.setProperty("--focus-width", input.focusWidth.toFixed(2))
    lab.style.setProperty("--approve-w", `${Math.ceil(measured.buttonW + 8)}px`)

    if (mainGuidesRef.current) drawGuides(mainGuidesRef.current, input, radii)
    if (copyRef.current) {
      copyRef.current.style.width = `${measured.w}px`
      copyRef.current.style.height = `${measured.h}px`
    }
    if (loupeGuidesRef.current) drawGuides(loupeGuidesRef.current, input, radii)

    const loupe = loupeRef.current
    const zoom = zoomRef.current
    if (loupe && zoom && rect.width > 20) {
      const centers = cornerCenters(input, radii)
      const mid = {
        x: (centers.card.x + centers.button.x) / 2,
        y: (centers.card.y + centers.button.y) / 2,
      }
      const reach =
        Math.max(
          distance(mid, centers.card) + radii.card,
          distance(mid, centers.panel) + radii.panel,
          distance(mid, centers.button) + Math.max(radii.button, radii.ringCenterline),
          36,
        ) + 18
      const view = loupe.clientWidth
      const scale = Math.min(2.6, Math.max(1.15, (view * 0.46) / reach))
      zoom.style.transform = `translate(${view / 2 - mid.x * scale}px, ${view / 2 - mid.y * scale}px) scale(${scale})`
    }

    if (rect.width > 20 && !readyRef.current) {
      readyRef.current = true
      setReady(true)
      setBox(measured)
    }
  }

  useLayoutEffect(() => {
    const springs = [outerS, padS, borderS, focusOffsetS, focusWidthS, naiveS, depthS]
    const onChange = () => paintRef.current()
    const unsubs = springs.map((spring) => spring.on("change", onChange))
    const shell = shellRef.current
    const button = approveRef.current
    const observer = new ResizeObserver(() => {
      paintRef.current()
      const shellRect = shell?.getBoundingClientRect()
      const buttonRect = button?.getBoundingClientRect()
      if (!shellRect || shellRect.width < 20 || !buttonRect) return
      const next = {
        w: shellRect.width,
        h: shellRect.height,
        buttonW: buttonRect.width,
        buttonH: buttonRect.height,
      }
      setBox((prev) =>
        Math.abs(prev.w - next.w) < 0.5 &&
        Math.abs(prev.h - next.h) < 0.5 &&
        Math.abs(prev.buttonW - next.buttonW) < 0.5 &&
        Math.abs(prev.buttonH - next.buttonH) < 0.5
          ? prev
          : next,
      )
    })
    if (shell) observer.observe(shell)
    if (button) observer.observe(button)
    onChange()
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
      observer.disconnect()
    }
  }, [outerS, padS, borderS, focusOffsetS, focusWidthS, naiveS, depthS])

  useLayoutEffect(() => {
    if (!reduced) return
    const current = stateRef.current
    writeSpring(outerS, current.outer, "jump")
    writeSpring(padS, current.padding, "jump")
    writeSpring(borderS, current.border, "jump")
    writeSpring(focusOffsetS, current.focusOffset, "jump")
    writeSpring(focusWidthS, current.focusWidth, "jump")
    writeSpring(naiveS, current.naive ? 1 : 0, "jump")
    writeSpring(depthS, current.depth === 3 ? 1 : 0, "jump")
  }, [reduced, outerS, padS, borderS, focusOffsetS, focusWidthS, naiveS, depthS])

  const onKnobPointerDown = (kind: DragKind) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const shell = shellRef.current
    if (!shell) return
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)
    dragRef.current = true
    setDrag(kind)
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return
      const rect = shell.getBoundingClientRect()
      const x = pointer.clientX - rect.left
      const y = pointer.clientY - rect.top
      const current = stateRef.current
      if (kind === "outer") {
        commitRef.current({ outer: clamp(Math.round(x), LIMITS.outer.min, LIMITS.outer.max) }, "jump")
      } else if (kind === "padding") {
        commitRef.current(
          { padding: clamp(Math.round(y - current.border), LIMITS.padding.min, LIMITS.padding.max) },
          "jump",
        )
      } else {
        commitRef.current({ border: clamp(Math.round(x), LIMITS.border.min, LIMITS.border.max) }, "jump")
      }
    }
    const up = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      dragRef.current = false
      setDrag(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const onKnobKey = (kind: DragKind) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const limit = LIMITS[kind]
    const next = stepValue(stateRef.current[kind], event.key, limit.min, limit.max)
    if (next === null) return
    event.preventDefault()
    commit({ [kind]: next }, "spring")
  }

  const settled = derive(toInput(state, box))
  const mainStatus = drag
    ? `Dragging ${drag === "outer" ? "outer radius" : drag}.`
    : state.naive
      ? "Naive mode uses one radius on every layer, so the centers split."
      : state.depth === 2
        ? "Depth 2 keeps the button a pill. Card and panel still share a center."
        : settled.square
          ? "Inner radius is 0. That corner is square."
          : settled.pill
            ? "The button clamped to height / 2, so its center moved."
            : "The approve corner shares one center with the card and the panel."

  return (
    <div
      className="lab"
      ref={labRef}
      data-guides={state.showGuides}
      data-naive={state.naive}
      data-depth={state.depth}
      data-square={settled.square}
      data-pill={settled.pill}
      data-drag={drag ?? "none"}
      data-reduced={reduced}
      data-ready={ready}
      data-approve-focus={approveFocus}
    >
      <main className="page">
        <header className="header">
          <p className="eyebrow">Concentric corner lab</p>
          <h1>Corners that share a center</h1>
          <p className="deck">
            Drag padding, border, and outer radius on the approval card. Inner corners, borders, and the focus ring stay on one center.
          </p>
        </header>

        <div className="layout">
          <div className="stage">
            <div className="card-frame">
              <div className="shell" ref={shellRef}>
                <CardFace interactive approveRef={approveRef} onApproveFocus={setApproveFocus} />
                <Guides svgRef={mainGuidesRef} />
              </div>
              <Knob
                kind="outer"
                label="Outer radius handle"
                value={state.outer}
                min={LIMITS.outer.min}
                max={LIMITS.outer.max}
                dragging={drag === "outer"}
                onPointerDown={onKnobPointerDown("outer")}
                onKeyDown={onKnobKey("outer")}
              />
              <Knob
                kind="border"
                label="Border width handle"
                value={state.border}
                min={LIMITS.border.min}
                max={LIMITS.border.max}
                dragging={drag === "border"}
                onPointerDown={onKnobPointerDown("border")}
                onKeyDown={onKnobKey("border")}
              />
              <Knob
                kind="padding"
                label="Padding handle"
                value={state.padding}
                min={LIMITS.padding.min}
                max={LIMITS.padding.max}
                dragging={drag === "padding"}
                onPointerDown={onKnobPointerDown("padding")}
                onKeyDown={onKnobKey("padding")}
              />
            </div>
          </div>

          <div className="proof">
            <figure className="loupe-block">
              <div className="loupe" ref={loupeRef}>
                <div className="loupe-zoom" ref={zoomRef} inert aria-hidden="true">
                  <div className="shell shell-copy" ref={copyRef}>
                    <CardFace interactive={false} />
                    <Guides svgRef={loupeGuidesRef} />
                  </div>
                </div>
              </div>
              <figcaption>Corner</figcaption>
            </figure>
            <div className="readout">
              <Formula state={state} radii={settled} />
              <p className="legend">
                <span>
                  <i className="swatch swatch-card" aria-hidden="true" /> Card
                </span>
                <span>
                  <i className="swatch swatch-panel" aria-hidden="true" /> Panel
                </span>
                <span>
                  <i className="swatch swatch-button" aria-hidden="true" /> Button
                </span>
                <span>
                  <i className="swatch swatch-ring" aria-hidden="true" /> Ring
                </span>
              </p>
              <div className="status">
                <p className="status-main">{mainStatus}</p>
                <p className="status-sub">
                  {reduced
                    ? "Reduced motion is on. Updates are instant."
                    : "Sliders ease on a spring. Card handles track the pointer."}
                </p>
              </div>
              <p className="credit">
                Inspired by{" "}
                <a href="https://x.com/maybepratikk/status/2118614980635603062">@maybepratikk</a>
                &apos;s radius notes.
              </p>
            </div>
          </div>

          <aside className="controls">
            <section className="group" aria-labelledby="geometry-label">
              <p className="group-label" id="geometry-label">
                Geometry
              </p>
              <Slider
                id="outer-radius"
                label="Outer radius"
                value={state.outer}
                min={LIMITS.outer.min}
                max={LIMITS.outer.max}
                onChange={(outer) => commit({ outer }, "spring")}
              />
              <Slider
                id="padding"
                label="Padding"
                value={state.padding}
                min={LIMITS.padding.min}
                max={LIMITS.padding.max}
                onChange={(padding) => commit({ padding }, "spring")}
              />
              <Slider
                id="border"
                label="Border"
                value={state.border}
                min={LIMITS.border.min}
                max={LIMITS.border.max}
                onChange={(border) => commit({ border }, "spring")}
              />
            </section>

            <section className="group" aria-labelledby="focus-label">
              <p className="group-label" id="focus-label">
                Focus ring
              </p>
              <Slider
                id="focus-offset"
                label="Focus offset"
                value={state.focusOffset}
                min={LIMITS.focusOffset.min}
                max={LIMITS.focusOffset.max}
                onChange={(focusOffset) => commit({ focusOffset }, "spring")}
              />
              <Slider
                id="focus-width"
                label="Focus width"
                value={state.focusWidth}
                min={LIMITS.focusWidth.min}
                max={LIMITS.focusWidth.max}
                onChange={(focusWidth) => commit({ focusWidth }, "spring")}
              />
            </section>

            <section className="group" aria-labelledby="compare-label">
              <p className="group-label" id="compare-label">
                Compare
              </p>
              <div
                className="depths"
                role="radiogroup"
                aria-label="Nesting depth"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                  event.preventDefault()
                  const next: Depth = event.key === "ArrowRight" ? 3 : 2
                  commit({ depth: next }, "spring")
                  requestAnimationFrame(() => depthRefs.current[next]?.focus())
                }}
              >
                {([2, 3] as const).map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    role="radio"
                    aria-checked={state.depth === depth}
                    tabIndex={state.depth === depth ? 0 : -1}
                    ref={(node) => {
                      if (node) depthRefs.current[depth] = node
                    }}
                    onClick={() => commit({ depth }, "spring")}
                  >
                    {depth} levels
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={state.showGuides}
                onClick={() => commit({ showGuides: !state.showGuides }, "spring")}
              >
                <span className="switch-ui" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
                Guides
              </button>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={state.naive}
                aria-describedby="naive-help"
                onClick={() => commit({ naive: !state.naive }, "spring")}
              >
                <span className="switch-ui" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
                Naive radius
              </button>
              <p className="help" id="naive-help">
                Same radius on every layer.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Formula({ state, radii }: { state: LabState; radii: ReturnType<typeof derive> }) {
  let lines: ReactNode
  if (state.naive) {
    lines = (
      <>
        <span>naive panel = outer = {formatPx(radii.panel)}</span>
        <span>
          naive button = min(height / 2, outer) = {formatPx(radii.button)}
        </span>
      </>
    )
  } else if (state.depth === 2) {
    lines = (
      <>
        <span>
          panel = max(0, {state.outer} − {state.padding} − {state.border}) = {formatPx(radii.panel)}
        </span>
        <span>button = height / 2 = {formatPx(radii.button)}</span>
      </>
    )
  } else {
    lines = (
      <>
        <span>
          panel = max(0, {state.outer} − {state.padding} − {state.border}) = {formatPx(radii.panel)}
        </span>
        <span>
          button = min({BUTTON_HEIGHT / 2}, max(0, {formatPx(radii.panel)} − {state.padding} − {state.border})) = {formatPx(radii.button)}
        </span>
      </>
    )
  }
  return (
    <p className="formula">
      {lines}
      <span>
        ring = {formatPx(radii.button)} + {state.focusOffset} + {state.focusWidth}/2 = {formatPx(radii.ringCenterline)}
      </span>
    </p>
  )
}
