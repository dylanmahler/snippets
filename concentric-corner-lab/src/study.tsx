import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react"
import { derive, type DeriveInput } from "./radius"
import { drawGuides } from "./guides"

export type Box = { w: number; h: number; buttonW: number; buttonH: number }

export type Values = {
  outer: number
  padding: number
  border: number
  naive: boolean
  depth: 2 | 3
  focusOffset: number
  focusWidth: number
  guides: number
}

export function equationText(values: Values, panel: number) {
  const n = (value: number) => String(Math.round(value))
  if (values.naive) return `${n(values.outer)} = ${n(panel)}`
  return `${n(values.outer)} − ${n(values.padding)} − ${n(values.border)} = ${n(panel)}`
}

export function toInput(values: Values, box: Box): DeriveInput {
  return {
    outer: values.outer,
    padding: values.padding,
    border: values.border,
    focusOffset: values.focusOffset,
    focusWidth: values.focusWidth,
    naiveMix: values.naive ? 1 : 0,
    depthMix: values.depth === 3 ? 1 : 0,
    cardWidth: box.w,
    cardHeight: box.h,
    buttonWidth: box.buttonW,
    buttonHeight: box.buttonH,
  }
}

export function paintStudy(
  root: HTMLElement,
  svg: SVGSVGElement | null,
  badge: HTMLElement | null,
  values: Values,
  box: Box,
) {
  const input = toInput(values, box)
  const radii = derive(input)
  root.style.setProperty("--r-card", radii.card.toFixed(2))
  root.style.setProperty("--r-panel", radii.panel.toFixed(2))
  root.style.setProperty("--r-button", radii.button.toFixed(2))
  root.style.setProperty("--pad", values.padding.toFixed(2))
  root.style.setProperty("--border-w", values.border.toFixed(2))
  root.style.setProperty("--focus-offset", values.focusOffset.toFixed(2))
  root.style.setProperty("--focus-width", values.focusWidth.toFixed(2))
  root.style.setProperty("--approve-w", `${Math.ceil(box.buttonW + 8)}px`)
  root.style.setProperty("--guides", values.guides.toFixed(3))
  if (badge) badge.textContent = equationText(values, radii.panel)
  if (svg) drawGuides(svg, input, radii)
  return radii
}

export function measureBox(shell: HTMLElement, button: HTMLElement): Box {
  const shellRect = shell.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  return {
    w: shellRect.width,
    h: shellRect.height,
    buttonW: buttonRect.width,
    buttonH: buttonRect.height,
  }
}

function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.25 8.2 6.2 11.1 12.75 4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GuidesSvg({ svgRef }: { svgRef?: RefObject<SVGSVGElement | null> }) {
  return (
    <svg className="guides" ref={svgRef} aria-hidden="true">
      {["card", "panel", "button", "ring"].map((name) => (
        <g key={name}>
          <path data-arc={`${name}-halo`} />
          <path data-arc={name} />
        </g>
      ))}
      <path data-arc="squares" />
      <line data-arc="link" />
      <circle data-arc="dot-a" r="4" />
      <circle data-arc="dot-b" r="2.5" />
      <circle data-arc="dot-c" r="2.5" />
    </svg>
  )
}

export function CornerCard({
  badgeRef,
  shellRef,
  buttonRef,
  hot,
  handles,
  onApproveFocus,
  children,
}: {
  badgeRef?: RefObject<HTMLParagraphElement | null>
  shellRef?: RefObject<HTMLDivElement | null>
  buttonRef?: RefObject<HTMLButtonElement | null>
  hot: boolean
  handles: boolean
  onApproveFocus?: (focused: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className="card-frame" data-hot={hot} data-handles={handles}>
      <div className="prism" aria-hidden="true" />
      <div className="shell" ref={shellRef}>
        <article className="card">
          <div className="panel">
            <p className="kicker">Approval</p>
            <h2>Holiday win-back</h2>
            <p className="body">3 drafts ready. Brand checks passed.</p>
            <p className="badge" ref={badgeRef} />
            <div className="actions">
              <button type="button" className="btn btn-quiet" disabled aria-label="Hold, needs a second reviewer">
                Hold
              </button>
              <button type="button" className="btn btn-line">
                Revise
              </button>
            </div>
            <button
              type="button"
              className="btn btn-solid"
              ref={buttonRef}
              onFocus={(event) => onApproveFocus?.(event.currentTarget.matches(":focus-visible"))}
              onBlur={() => onApproveFocus?.(false)}
            >
              <CheckIcon />
              <span>Approve</span>
            </button>
          </div>
        </article>
        <GuidesSvg />
      </div>
      {children}
    </div>
  )
}

export function Grip({
  kind,
  label,
  value,
  min,
  max,
  spot,
  onPointerDown,
  onKeyDown,
}: {
  kind: "outer" | "padding" | "border"
  label: string
  value: number
  min: number
  max: number
  spot?: string
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      className={`grip grip-${kind}`}
      data-spot={spot}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} pixels`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  )
}
