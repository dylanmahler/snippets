import { useState } from "react"
import { BlockNote, Outputs, StepTree, Stream, Avatar, Bloom } from "./ui.tsx"
import type { RequestView } from "./model.ts"

export function Feed({
  requests,
  reduced,
  onCreate,
}: {
  requests: RequestView[]
  reduced: boolean
  onCreate: (title: string) => void
}) {
  const [text, setText] = useState("")
  const trimmed = text.trim()

  return (
    <div className="feed">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (!trimmed) return
          onCreate(trimmed)
          setText("")
        }}
      >
        <label className="sr" htmlFor="delegate">
          Delegate a request
        </label>
        <input
          id="delegate"
          value={text}
          maxLength={140}
          placeholder="Ask June for a brief"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="delegate" disabled={!trimmed}>
          Delegate
        </button>
      </form>
      <p className="hint">Delegating as Alex Rivera. The workspace can see it.</p>
      <ol className="feed-list">
        {requests.map((request) => (
          <FeedItem key={request.id} request={request} reduced={reduced} />
        ))}
      </ol>
    </div>
  )
}

function FeedItem({ request, reduced }: { request: RequestView; reduced: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = `feed-${request.id}`
  const working = request.status === "working"

  return (
    <li className="feed-item" data-status={request.status} data-open={open}>
      {working && <Bloom />}
      <article className="feed-card">
        <button
          type="button"
          className="feed-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <Avatar person={request.requester} />
          <span className="feed-copy">
            <span className="feed-line">{request.line}</span>
            <span className="feed-meta">
              <span className="dot" data-status={request.status} />
              {request.area}
              <span aria-hidden="true">·</span>
              Due {request.due}
            </span>
          </span>
          <span className="chevron" aria-hidden="true" />
        </button>
        <Stream open={open} reduced={reduced}>
          <div className="feed-panel" id={panelId}>
            <BlockNote note={request.note} />
            <Outputs outputs={request.outputs} />
            <div className="tree">
              <p className="kicker">Who’s on it</p>
              <StepTree steps={request.steps} />
            </div>
          </div>
        </Stream>
      </article>
    </li>
  )
}
