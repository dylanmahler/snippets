import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import { App, FilmRoot } from "./App"
import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing root")

const film = new URLSearchParams(window.location.search).has("film")

createRoot(root).render(<StrictMode>{film ? <FilmRoot /> : <App />}</StrictMode>)
