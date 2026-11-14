---
name: run-a-workorder
description: Use when starting a work order, leaving one running, or changing one that is running.
---

# Run a work order (one job: a finished order started, left running, and changed only through its prompt)

A work order is `docs/workorders/<name>/`: `workorder.md` (the steps, written with `write-a-workorder` or planned in claude.ai), `PROMPT.md` (how a run works with nobody there) and `run.sh` (session after session until the `DONE` file).

<constraints>
Always do:
1. Before the first session, run `workorder check <name>` and fix every line it refuses: a placeholder left, a step whose Done when holds no number and no path to a test, a skill the project has not installed (it names the pack to add), a red `doctor --strict`. `run.sh` and `PROMPT.md` run it too, and start nothing on a refusal.
2. Install from the order's install block first, if the project was not made from it: `init --from docs/workorders/<name>/workorder.md`.
3. Before leaving it running, read `PROMPT.md` and `run.sh` once, and check that the first step can start.
4. Start it by typing `Run docs/workorders/<name>/PROMPT.md` in Claude Code to watch, or `bash docs/workorders/<name>/run.sh` to leave it. The same sentence resumes it in any later session; all progress lives in files.
5. Watch the files, not the chat: `progress.md` (one line per finished item), `decisions.md` (overturn any by editing the order), `bugs.md`, and the evidence folder of each step.
6. To change a run in progress, edit its `PROMPT.md` and commit it. A run refuses an instruction it cannot trace to its order or to you, so a file dropped beside it is rightly ignored.
7. Run a wave of agents in one of two ways (`agents-held`, KWB-199, `build/evidence/KWB-199/summary.md`). Foreground: every independent agent in the same message; the turn waits for the slowest. Background: a lead with work of its own starts the wave in the background and keeps the turn open with short calls of its own, merging and refilling each slot when its notification arrives (it reaches the lead at its next tool-call boundary); a foreground agent hides the notifications until it returns, so start none while a background one runs. Never end a turn with an agent running: a session with nobody there ends when its turn ends and stops every agent left in the background, so `agents-held` refuses the end of the turn while one is pending. Split a wave into agents of similar size and give a long list to several agents, not one: the wave ends with its slowest agent.
8. Land the order's branch once, when every step's Done when is measured, gated by the tests its changes reach against the trunk (`land-branch`).
9. End an unattended run with a hand-over list for the person: what should now behave differently, each item to be judged by hand with the single constant it turns on, what is known to be imperfect, and which large rewrites are left for a session with them.

Never do:
- Start a run on an order `workorder check` refuses: it stops halfway, at the line it could not finish.
- Change a running order by talking to it, or by a file beside it. The prompt is the one way in.
- Run the whole suite at the end on the run's own initiative; the gate is the tests the branch reaches.
- Read a checkpoint as the end. A run is finished on the `DONE` file, after its last gate.
</constraints>
