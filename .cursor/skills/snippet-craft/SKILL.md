---
name: snippet-craft
description: Polish bar for design-engineering snippets in this repo. Use before building or revising any snippet, still, or film. Numbers are house defaults unless marked source.
---

# Snippet craft

Distilled from Jakub Krehel (details, less-is-more, invisible craft), Benji Taylor (Stageshow craft, motion, rehearse), and Emil Kowalski (emil-design-eng, choreograph, gestures), plus Dylan Mahler's liked references. House numbers are starting values to audition on the captured pixels, not claims those authors publish this exact token.

Two outputs, kept apart: a usable snippet, and a staged film of that snippet. Do not put film timing into everyday controls. Do not fake a cursor in place of a behavior test.

One snippet makes one relationship unmistakable. Quiet is not tiny, empty, or low-contrast.

## Composition

- Write the sentence first: when I do X, Y stays or changes because Z. One lead, one payoff.
- Approve opening and payoff stills at 390px and at the film frame before tuning motion.
- Isolated subject occupies 60–75% of a square film frame. A faux window fills at least two thirds and may bleed. Never a whole window floating with air on four sides.
- Live pages are not film crops. At 390px, redesign spacing. Do not ship a squeezed desktop screenshot.
- Word budget for a staged shot is usually 3–7 real strings. Keep real product content. No gray bars where the eye lands.
- Level 0 is the artifact and the next action. Level 1 is the reason. Level 2 is the math or the trace. One tray, one job, one exit.
- One expressive material, one dominant action, at most three surface depths. Cut tutorial paragraphs before adding glow.
- Size the object to its content. No dead band. Spacing scale 4 / 8 / 12 / 16 / 24 / 32. Do not spread rows to fill a viewport.

## Type, edges, color

- One family. Inter (loaded) or the system sans. 400 body, 500 labels, 600 title. Monospace only for measurements.
- Micro 12/16. UI body 14/20, tracking -0.01em. Inputs stay at least 16px on mobile. Title 22/27, 600, tracking -0.025em. Nothing under 11px in the UI, or under 10px after stage scaling.
- `text-wrap: balance` on titles, `pretty` on paragraphs. `tabular-nums` on changing measures.
- Words sit 12px from a surface edge, floor 8px. Title-to-subtitle ink gap 4–6px. Near tangents (1–3px) are accidents: align or separate by at least 8px.
- Icons 14–16px, one stroke, even boxes. Optical alignment with the label, not the line box.
- Light neutrals: canvas `#f6f6f8`, surface `#fff`, inset `#f3f3f5`, text `#1c1c1e`, body `#3f3f42`, secondary `#5c5c61`. One temperature. No default blue. No AI purple.
- Text contrast at least 4.5:1. Essential graphics at least 3:1. Measure the composite.
- Surface shadow, source Jakub: `0 1px 2px -1px rgb(0 0 0 / .06), 0 2px 4px rgb(0 0 0 / .04)`. Do not stack a second hairline on a border that is the subject.
- Raised tray adds `0 12px 32px -8px rgb(0 0 0 / .14)` and nothing else gets that depth.
- Nested radius: `inner = max(0, outer - padding - border)` on each edge. Pills clamp to half the height. Focus-ring centerline: `R + gap + stroke/2`, drawn outside the control. Check zero, pill, thick border, and padding greater than radius.
- Prism: one localized conic layer, blur 24–32px. Idle opacity .12–.18, active .28–.36, on its own layer. Stop at rest. A high-contrast ring remains if the prism is removed. Bloom is never the only state signal.

## Motion

Product UI, not the film:

- Press 120ms to `scale(.97)`, release 160ms. Hover color 120ms `ease`, no travel. Gate hover to `(hover: hover) and (pointer: fine)`.
- Small popover 180ms, ease-out `(0.23, 1, 0.32, 1)`, opacity and 4px y. No child stagger.
- Floating tray ~200ms `(0.165, 0.84, 0.44, 1)`, y 8px and opacity. Content is already there. Blur at most 2px on a changing slot, never 8px on the whole panel.
- Track phase: 1:1 with the pointer. No spring, no CSS transition, no React state per move. Preserve the grip delta. One rAF, one write. Release can spring with no overshoot on a measured value. Keyboard updates are instant.
- Cancel on pointerup, pointercancel, lostpointercapture, blur, and unmount. Re-grab mid-flight retargets from the current value.
- Do not rubber-band a parameter past its real clamp.
- Reduced motion: direct manipulation stays. No breathe, spin, inertia, bounce, or stagger. Opacity changes 120–200ms or instant.

Film timing stays in `video-playbook.md`. Do not put an 800ms presentation ease on a live drag.

## Checklist

Each line is pass, fail, or not tested. Not tested is not a pass.

- Opening, payoff, and the busiest frame read at 390px without a caption.
- One lead. No postage-stamp frame, dead band, near-tangent, orphan word, or clipped control.
- The font is loaded. Reading edges, icon baseline, and tabular numbers hold still.
- One neutral family, one material, one shadow. Contrast measured on the composite.
- Radius math checked at zero, pill, thick border, and padding greater than radius. Focus ring checked by which edge the radius describes.
- Durations are named. Keyboard changes do not animate. A parent entrance does not also stagger its children.
- Drag grip does not jump. The pointer tracks exactly. Cancel and lost capture release cleanly.
- Rapid open, close, open and a re-grab mid-settle do not duplicate or snap.
- Mobile 390px is its own layout. Hit targets are at least 44px. Focus order works.
- Reduced motion is a complete still. Decorative motion is stopped.
- The film is 8–20s, one cause, a 2s payoff, and a caused reset. The mp4 was watched after export.
- The weakest remaining detail is named.

## Sources

- Jakub Krehel, [Details that make interfaces feel better](https://jakub.kr/writing/details-that-make-interfaces-feel-better), [Less is more](https://jakub.kr/writing/less-is-more), [The invisible side of design engineering](https://jakub.kr/writing/the-invisible-side-of-design-engineering)
- Benji Taylor, [Stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow): `SKILL.md`, `references/craft.md`, `references/motion.md`, `references/rehearse.md`
- Emil Kowalski, [emil-design-eng](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md), [choreograph](https://github.com/emilkowalski/skills/blob/main/skills/choreograph/SKILL.md), [gestures](https://github.com/emilkowalski/skills/blob/main/skills/gestures/SKILL.md)
- @maybepratikk, [radius notes](https://x.com/maybepratikk/status/2118614980635603062)
