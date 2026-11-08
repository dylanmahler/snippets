# Orchestrator concepts

Three ways a marketing workspace can hand work to one orchestrator, instead of opening a new chat for every task. Requests are public. Teammates can see what’s in flight.

The page is one switcher and one shared set of briefs. A timer advances the same requests in all three concepts: steps appear, sections fill in, and cards change columns.

## What each concept tests

**Public feed.** A workspace activity line, in the shape of “Maya asked for Q4 launch audiences, 3 of 4 done.” One composer delegates a new request, which joins the feed and starts moving. Opening a request shows delivered work first, then the agents June handed it to. One more click shows the layer under an agent. New steps grow with a spring so the list doesn’t pop.

**Brief board.** Columns are the status of the work. June is an assignee with an avatar, the way a teammate would be. Cards spring between columns as the status changes. Hover or focus shows who asked and who’s watching. The card opens a sheet with the brief, the outputs, and the agent steps, collapsed until you ask.

**Living brief.** One document, the holiday win-back, fills in by section as each agent finishes. The agent on a section wears a small presence chip, and the chip glows only while that work is live. “Show how” reveals the steps. A rail lists the other requests in the workspace.

## Motion

Column moves and the switcher use a spring (stiffness 380, damping 34, mass 0.8). Disclosures use a slightly softer one (stiffness 320, damping 34, mass 0.8). `prefers-reduced-motion`, or `?reduced=1`, drops both springs and holds the prismatic bloom still. `?t=6` freezes the clock on the frame used in the screenshots.

The clock starts on the first click. It holds on the feed just before the loyalty card leaves Queued, and holds again on the board just before the holiday message is written, so each concept still has its change when you arrive.

The bloom is the only live signal: a working request, or the agent chip that’s writing. Idle work stays quiet.

## Credit

The delegation model borrows from Linear’s agent assignment, Cursor Projects, and Notion and Airtable agents: one worker you can hand a job, visible to the people around it. The step tree follows [@flohoeller’s orchestration tree](https://x.com/flohoeller/status/2119386429164028251), rewritten as a creative brief instead of a console. The visual language follows the concentric corner lab: warm neutrals, one type family, and a soft prismatic bloom.

## Run

```bash
cd orchestrator-concepts
npm install
npm test
npm run dev
```

Open the printed local URL. `npm run build` typechecks and writes `dist/`.

Branch previews are the Vercel deployment for this pull request. The URL is posted on the PR when the build finishes.
