import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource/instrument-sans/400.css"
import "@fontsource/instrument-sans/500.css"
import "@fontsource/instrument-sans/600.css"
import "@fontsource/instrument-serif/400.css"
import { App } from "./App"
import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing root")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
