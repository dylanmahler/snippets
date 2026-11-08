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

Dragging a handle tracks the pointer 1:1 and keeps the grip you picked up. Keyboard changes the same values immediately. `prefers-reduced-motion` leaves the drag direct and holds the prism still.

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

## Layers

The card shows one equation, `outer − padding − border = panel`, and a corner grip. Drag that grip for the outer radius. The inner edge, on hover or tap, drags padding.

Guides appear while you drag, or from the Guides control. Compare paints the naive radius. Adjust opens a tray for radius, padding, and border. More, inside the tray, holds the focus ring, depth, and the credit.

`?film=1` is a 540px square stage (captured at 2x) with a scripted pointer. `?film=1&t=8400` is the payoff frame.

## Preview

Branch previews are the Vercel deployment for this pull request. The URL is posted on the PR when the build finishes.
