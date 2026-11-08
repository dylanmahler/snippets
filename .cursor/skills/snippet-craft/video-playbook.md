---
name: snippet-craft-video
description: How to film one snippet into an 8–20s square mp4. Use with the snippet-craft skill. House defaults, not a claim about X reach.
---

# Snippet video

Default: 12–16 seconds, one interaction, one payoff, square, silent. Capture the real component. Staging is only for a clean clock and a scripted pointer.

## Frame

- Master canvas 1080×1080 at 60fps. Author the stage at 540×540 CSS pixels and capture at device pixel ratio 2 so type still reads when the file is shown near 390px wide.
- Subject 60–75% of the frame width. Popovers stay fully inside. Only filler may bleed.
- One opaque ground matching the component. No gradient plate under it. No browser chrome, localhost, or console.
- Locked camera. No zoom used to rescue a small subject.
- Poster is the landed payoff, not a mid-blur frame. Also save a 390px still of the live layout and a 1080 still of opening and payoff.

## Story

3–5 beats. Payoff holds 2 seconds. Nothing sits still longer than 3 seconds except that hold. Open on a finished screen. End on the opening frame only if a visible Reset caused the return. Data never rewinds without that cause.

Corner lab house cut, 12s:

| Time | What happens | What stays |
|---|---|---|
| 0–1s | Nested card, corner grip, equation badge, pointer nearby | Copy, actions, ground |
| 1–4s | Pick up the grip. Drag radius about 40 to 56. Guides appear with the drag | Card footprint |
| 4–6s | Drag padding about 12 to 20. The inner radius follows | No tray over the corner |
| 6–8s | Compare naive once, then back. Pointer off the label | Text slots |
| 8–10s | Hold the correct curves and the one-line equation. No spinning glow | Everything |
| 10–12s | Reset restores the opening. Guides leave. Pointer returns |

Functional drags stay 1:1 with the pointer. Do not add an 800ms ease to a live control. The filmed hand may travel on `(0.45, 0, 0.1, 1)`. UI feedback stays at product speed (press 100–160ms).

## Cursor

- One scripted pointer inside the scene. Hide the native cursor. `page.mouse` does not draw a cursor by itself.
- Resize glyph on a radius or padding grip. Arrow elsewhere. No closed hand on a button.
- 18–22 CSS px. Aim in the target's blank area, never over the label or the equation.
- A held grip matches the pointer every frame, including pickup and release.

## Capture

Prefer deterministic frames when the take must repeat.

- One clock owns the scene, the pointer, and any material. `?film=1&t=` seeks it. Do not also run CSS animations on a second clock.
- Wait for `document.fonts.ready` before frame 0.
- Step `1000/60` ms. 12s is 720 frames. Do not duplicate frames to pretend 60fps.
- Screenshot after React has flushed and layout has run. Do not use a screenshot mode that disables animations you still need. The film should not depend on live CSS animation time.
- Watch a live pass separately. An offline mp4 does not prove the gesture is 60fps.

Playwright can request `video.fps: 60` on Chromium. A requested fps is not proof the frames were unique. Pin the version and inspect the file with ffprobe.

## Export

```bash
ffmpeg -framerate 60 -i frames/frame-%05d.png \
  -c:v libx264 -profile:v high -crf 17 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -an name-master-1080-60.mp4

ffmpeg -i name-master-1080-60.mp4 \
  -vf 'scale=720:720:flags=lanczos,fps=30' \
  -c:v libx264 -profile:v high -b:v 6M -maxrate 8M -bufsize 12M \
  -pix_fmt yuv420p -movflags +faststart -an name-x-web-720-30.mp4

ffprobe -v error -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate \
  -show_entries format=duration,size -of json name-master-1080-60.mp4
```

X's API guidance is H.264, yuv420p, 30 or 60fps. A 30fps 720 square is the safe web upload. The 60fps master is the archive.

## After export

Watch the mp4, including the loop seam. Contact-sheet the pickup and the reset. Read it at 390px with the sound off. Reduced motion is a separate still of the payoff, not a skipped film.

## Sources

Benji Taylor, Stageshow `references/motion.md` and `references/rehearse.md`. Emil Kowalski, gestures and choreograph. X API media best practices for the codec and pixel format.
