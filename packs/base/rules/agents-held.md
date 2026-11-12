---
# hook: agents-held.mjs
---
# A session with nobody there starts its agents in the foreground, all in one message

A `claude -p` session ends when its turn ends, and every agent it started in the background is stopped with it. One run's session started four agents in the background and ended its turn; all four were stopped mid-work (KWB-124).

<constraints>
Always do:
- In a run with nobody there (a work order's `run.sh`, any `claude -p`), start each agent in the foreground, and every independent agent in the same message, up to the project's agent limit: they run side by side, and the turn waits for them.
- Split a wave into agents of similar size, and give a long list to several agents, not one: the turn waits for the slowest, so the others' slots idle and their work stays unmerged (KWB-199).
- Do the lead's own work only when no agent is running, or no work is left to hand out.

Never do:
- Pass `run_in_background: true` to an agent in a run with nobody there; `agents-held` refuses it.
- Start agents one per message: each holds the turn until it ends, so they run one at a time.
</constraints>
