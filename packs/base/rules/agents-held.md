---
# hook: agents-held.mjs
---
# A session with nobody there never ends its turn with an agent running

A `claude -p` session ends when its turn ends, and every agent it started in the background is stopped with it. One run's session started four agents in the background and ended its turn; all four were stopped mid-work (KWB-124). A background agent lives as long as the turn is open, and its completion reaches the lead at its next tool-call boundary (KWB-199, measured in `build/evidence/KWB-199/summary.md`).

<constraints>
Always do:
- In a run with nobody there (a work order's `run.sh`, any `claude -p`), either start each agent in the foreground, every independent agent in the same message, up to the project's agent limit: they run side by side, and the turn waits for them; or, with work of your own, start the wave in the background and keep the turn open with short calls of your own, merging and refilling each slot when its notification arrives.
- Split a wave into agents of similar size, and give a long list to several agents, not one: the turn waits for the slowest, so the others' slots idle and their work stays unmerged (KWB-199).
- Wait for the agents still running in the foreground when no work of your own is left.

Never do:
- End a turn with an agent running (never end a turn with an agent running): `agents-held` refuses the end of the turn while an agent started in the background has not returned.
- Start a foreground agent while background ones run: a foreground agent hides the notifications until it returns.
- Start agents one per message in the foreground: each holds the turn until it ends, so they run one at a time.
</constraints>
