import { cornerArc, cornerCenters, distance, squareMark, type DeriveInput, type Derived, type Point } from "./radius"

function cluster(points: Point[], epsilon = 1.25) {
  const groups: Point[][] = []
  for (const point of points) {
    const group = groups.find((entry) => distance(entry[0], point) < epsilon)
    if (group) group.push(point)
    else groups.push([point])
  }
  return groups
}

export function drawGuides(svg: SVGSVGElement, input: DeriveInput, radii: Derived) {
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
    dot.setAttribute("r", groups.length === 1 ? "4" : "2.5")
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

