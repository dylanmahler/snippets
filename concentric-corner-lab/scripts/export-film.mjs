import { spawn } from "node:child_process"
import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire("/tmp/node_modules/playwright/package.json")
const { chromium } = require("playwright")

const root = path.resolve(import.meta.dirname, "..")
const framesDir = process.env.FRAMES_DIR || "/tmp/corner-frames"
const outDir = process.env.OUT_DIR || "/opt/cursor/artifacts"
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome"
const port = 4173
const frames = 12 * 60

await rm(framesDir, { recursive: true, force: true })
await mkdir(framesDir, { recursive: true })
await mkdir(outDir, { recursive: true })

const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
})
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("preview did not start")), 20000)
  const ready = (chunk) => {
    if (String(chunk).includes("4173")) {
      clearTimeout(timer)
      resolve()
    }
  }
  preview.stdout.on("data", ready)
  preview.stderr.on("data", ready)
  preview.on("exit", (code) => reject(new Error(`preview exited ${code}`)))
})

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--hide-scrollbars"],
})

const film = await browser.newPage({
  viewport: { width: 540, height: 540 },
  deviceScaleFactor: 2,
})
await film.goto(`http://127.0.0.1:${port}/?film=1&t=0`, { waitUntil: "networkidle" })
await film.evaluate(() => document.fonts.ready)
await film.waitForFunction(() => document.documentElement.dataset.filmReady === "true")

for (let i = 0; i < frames; i += 1) {
  const time = (i * 1000) / 60
  await film.evaluate((next) => window.__setFilmTime(next), time)
  await film.screenshot({ path: path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`), type: "png" })
  if (i === 24) await film.screenshot({ path: path.join(outDir, "opening-1080.png"), type: "png" })
  if (i === 660) await film.screenshot({ path: path.join(outDir, "payoff-1080.png"), type: "png" })
  if (i % 120 === 0) console.log(`frame ${i}/${frames}`)
}

await film.close()

const live = await browser.newPage({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 2 })
await live.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" })
await live.evaluate(() => document.fonts.ready)
await live.screenshot({ path: path.join(outDir, "opening-390.png"), type: "png" })
await live.goto(`http://127.0.0.1:${port}/?mode=concentric&radius=36`, { waitUntil: "networkidle" })
await live.screenshot({ path: path.join(outDir, "payoff-390.png"), type: "png" })

const reduced = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
})
await reduced.goto(`http://127.0.0.1:${port}/?film=1`, { waitUntil: "networkidle" })
const reducedBadge = await reduced.locator(".equation").textContent()
console.log("reduced film badge", reducedBadge)
await reduced.close()
await live.close()
await browser.close()
preview.kill("SIGTERM")
preview.unref()

const master = path.join(outDir, "corner-lab-master-1080-60.mp4")
const web = path.join(outDir, "corner-lab-x-web-720-30.mp4")
await run("ffmpeg", [
  "-y",
  "-framerate",
  "60",
  "-i",
  path.join(framesDir, "frame-%05d.png"),
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-crf",
  "17",
  "-preset",
  "slow",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-an",
  master,
])
await run("ffmpeg", [
  "-y",
  "-i",
  master,
  "-vf",
  "scale=720:720:flags=lanczos,fps=30",
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-b:v",
  "6M",
  "-maxrate",
  "8M",
  "-bufsize",
  "12M",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-an",
  web,
])
await run("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "stream=codec_name,profile,pix_fmt,width,height,r_frame_rate",
  "-show_entries",
  "format=duration,size",
  "-of",
  "json",
  master,
])
setTimeout(() => process.exit(0), 200)

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" })
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}
