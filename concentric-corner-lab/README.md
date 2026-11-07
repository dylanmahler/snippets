# Concentric corner lab

An interactive stress test for nested corner radii. The surface is a production approval card: outer card, inner panel, action pill. Drag padding, border width, and outer radius. Inner corners, borders, and the outward focus ring stay on one shared center.

Guides draw each corner's arc and its center so you can see them meet. Naive mode paints the same radius on every level, and the centers split.

## Formula

```
panel  = max(0, outer - padding - border)
button = min(height / 2, max(0, panel - padding - border))
ring   = button + focus offset + focus width / 2
```

The ring radius is the stroke centerline. The ring is drawn outside the control: its CSS border box starts `offset + width` beyond the button, with outer radius `button + offset + width`.

A pill never exceeds `height / 2` (the radius CSS actually paints, not `999px`). When padding and border exceed the outer radius, the inner radius hits 0 and that corner goes square.

Depth 2 derives the panel only and leaves the action as a pill. Depth 3 derives the button too.

Slider changes ease with a spring (stiffness 320, damping 28, mass 0.7). Dragging a handle on the card tracks the pointer. `prefers-reduced-motion` snaps to the new value.

## Credit

Inspired by [@maybepratikk](https://x.com/maybepratikk/status/2118614980635603062)'s radius notes. This lab makes those edge cases draggable, includes borders and outward focus rings, and puts the math on a nested approval card instead of abstract boxes.

## Run

```bash
cd concentric-corner-lab
npm install
npm test
npm run dev
```

Open the printed local URL. `npm run build` typechecks and writes `dist/`.
