# Concentric corner lab

Two nested sheets. Matched corners copy the outer radius onto the inner one, so the gap pinches. Concentric corners use one subtraction, and the gap stays even.

## Formula

```
inner = max(0, outer - padding - border)
```

This specimen fixes padding at 10px and the border at 1px, so a 36px outer corner resolves to 25px. The border is a real 1px line because it is part of the formula. A radius never exceeds half the shorter side, and it stops at 0 when the gap is larger than the outer corner.

Drag the bottom-right grip. It tracks the pointer 1:1. Switching to concentric eases the inner corner in 220ms. Keyboard changes are immediate. `prefers-reduced-motion` keeps the drag and drops the settle.

## Credit

The relationship comes from concentric radius teaching examples, including [@maybepratikk](https://x.com/maybepratikk/status/2118614980635603062). The inspector edge is Jakub Krehel's shadow recipe from [jakub.kr/work/shadows](https://jakub.kr/work/shadows).

## Run

```bash
cd concentric-corner-lab
npm install
npm test
npm run dev
```

`npm run build` typechecks and writes `dist/`. `?film=1` is the 12 second specimen film, authored at 540 CSS pixels. `?film=1&t=11000` is the payoff frame.

## Preview

Branch previews are the Vercel deployment for this branch. Production is `main`.
