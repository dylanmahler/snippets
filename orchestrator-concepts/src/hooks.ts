import { useEffect, useState } from "react"

export function useReduced() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false
    const params = new URLSearchParams(window.location.search)
    if (params.get("reduced") === "1") return true
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("reduced") === "1") return
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return reduced
}

const HERO = 6
const TICK_MS = 1000

export function useClock(holdAt: number | null) {
  const params = new URLSearchParams(window.location.search)
  const seek = params.get("t")
  const frozen = seek !== null
  const [clock, setClock] = useState(() => (seek !== null ? Number(seek) || 0 : HERO))
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (frozen) return
    const start = () => setRunning(true)
    window.addEventListener("pointerdown", start, { once: true })
    window.addEventListener("keydown", start, { once: true })
    return () => {
      window.removeEventListener("pointerdown", start)
      window.removeEventListener("keydown", start)
    }
  }, [frozen])

  useEffect(() => {
    if (frozen || !running) return
    const id = window.setInterval(() => {
      setClock((value) => (holdAt === null ? value + 1 : Math.min(holdAt, value + 1)))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [frozen, running, holdAt])

  return clock
}
