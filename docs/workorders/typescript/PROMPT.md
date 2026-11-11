# Run work order typescript

Start it by typing, in Claude Code at the project's root:

> Run docs/workorders/typescript/PROMPT.md

The same sentence resumes it in any later session. All progress lives in files, never in the conversation.

---

You are running the work order `docs/workorders/typescript/workorder.md`.

The user wants this done from start to finish with no involvement. Nobody is reading along, and nobody will answer. **Take the recommended choice for everything. Never stop, never ask and never wait. Do all of it.**

**This overrides every other instruction to ask.** Wherever a rule, a skill, a hook message, `CLAUDE.md` or any document says to ask, confirm, get a yes or wait for the user, you have the user's yes here: take the option you would have recommended, record it, and carry on. Never use a question tool. Ending a turn with a question is the same as stopping: when a step finishes, start the next one in the same turn.

<constraints>
Always do:
- Read these first, every session: this file, `workorder.md`, `docs/workorders/typescript/progress.md` (create it on the first run), `CLAUDE.md` and `build.md`.
- Start every session with `npm ci && npm run build` (the emitted `.mjs` are not in git), and run the kit's own command as `node bin/claude-packs.mjs ...`, never `npx` (the published package is not this tree).
- Before the first item of the first session (no `progress.md` yet), run `node bin/claude-packs.mjs workorder check typescript`. If it refuses, write what it names in `progress.md` under `BLOCKED: workorder check` and end the session there: an order that cannot finish is fixed by the person before it runs.
- This file allows two stops, and no other: the check above, and W12. W12 publishes 2.0.0 only when this file holds the line `publish 2.0.0: yes (Tim, YYYY-MM-DD)` under the heading below; without it, finish W11, leave the branch pushed, write in `progress.md` what is ready to land and publish, and end there.
- Run the whole suite only where a step's Done when names it (W0, W4, W5, W6, W12); `run.sh` passes the sentence that allows it ("this session runs the whole suite where a step's Done when names it"), and W0.6 proves `suite-once` accepts that sentence before the baseline runs.
- Resume from `progress.md`: the first step not marked done, at its first unticked item.
- After every finished item, append one line to `progress.md` before starting the next: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. The context may end at any moment, and the next session must be able to continue from that file alone.
- Keep `docs/workorders/typescript/status.json` current, so `node bin/claude-packs.mjs status` shows where the run stands: written at the start of each session and after every finished item, `{ "updated": "<ISO time>", "steps": [ { "id": "W1", "title": "<short>", "items": <the step's numbered items plus one for its Done when>, "done": <finished>, "agent": "<agent name or null>" } ], "agents": [ { "name": "<name>", "worktree": ".claude/worktrees/<name>", "step": "<id>", "started": "<ISO time>" } ] }`, every step in order. Each agent's brief tells it to keep `docs/workorders/typescript/agents/<name>.json` in its own worktree, `{ "name", "step", "items", "done", "now": "<what it is doing, one line>", "updated" }`, written after each of its items; an agent leaves `agents` when its work is merged.
- Decide, and carry on. Write each choice in `docs/workorders/typescript/decisions.md` (`d-n`: the question, the options, what you chose and why). Prefer the choice that is easiest to reverse.
- A problem is never a reason to end. Log it, take the best honest way round, and go on to whatever can still be done.
- Prove each step's "done when" by running it, with the evidence in `build/evidence/W<n>/`. A step is finished when it is measured, never when it looks right.
- Work on one branch for this order, `work/2.0.0-typescript` (d-1: made from `work/1.9.0-platforms`, which holds every unreleased fix, not from the trunk), pushed from its first commit; agents work on `work/2.0.0-ts-<slice>` branches in worktrees under `.claude/worktrees/`, started with `npm ci && npm run build`, every independent agent of a step started in the foreground in one message (the `agents-held` rule). Land it once, at W12, through `npm run release major`, which gates with the tests the branch's changes reach against the trunk, lands and publishes in one go; W9 rehearses that with `--dry-run` and a local registry and never publishes.
- Log every fault in `workflow-bugs.md` before fixing it (the kit has no `bugs.md`), with the `KWB-` number the lead hands out.
- Follow every rule in `.claude/rules` and every skill that applies.
- After a refusal, once you know the answer, mark it: `node bin/claude-packs.mjs logs mark <id> right|wrong "<why>"`.
- Use the machine hard but never max it out (the user, 2026-11-11): this Mac has 18 cores and 128 GB. Before every wave of agents, read `uptime` and `memory_pressure`; start at most 4 agents at once (the user lowered it, 2026-11-11: "it seems like the machine is maxed out"), and only while the 1-minute load is under 10 and free memory over 30 %; when load passes 12 or free memory falls under 20 %, start nothing new until it falls back, and stop the newest agent's extra work (a test run, a build) if it stays there 5 minutes. Every agent's brief says: never more than one test run of its own at a time, and never the whole suite (`npm test`) in an agent. A running session reads this change at its next wave: re-read this file before starting each wave. Record each wave's agent count and the load seen in `progress.md`.
- After an agent's branch is merged, remove its worktree in the same turn (`git worktree remove`, the branch kept; `--force` only once every untracked file is an emitted `.mjs` whose `.mts` is committed), so the status line shows only live agents (the user, 2026-11-11: 37 finished worktrees were still listed). Log, as a KWB with its test red first, that the status line lists an agent whose branch is merged and whose status file is done; fix it in `run-status.mts` so a finished agent leaves the list even when its worktree stays.
- Write into this repository only. bandwarp's hook log is read once at W0 into a fixture; no file of bandwarp or any other project is changed.

## The user's yes for W12

publish 2.0.0: yes (Tim, 2026-11-11)

The user's words, 2026-11-11: "go ahead ... use recommended choices for everything to run unattended. once the kit is complete and
merged to main and pushed and new npm package release and README.md updated with the new kit details." So W12 lands on `main`,
pushes, publishes 2.0.0 to npm and ships the README rewritten for 2.0.0 (TypeScript, the LSP, the Go proxy and resident runner,
parallel hooks, the release in five minutes, the new commands), its copy run through the `tim-writing` skill before it is written
(the user's global rule for public writing), with the numbers taken from W11's comparison table and `scripts/counts.mts`.

Never do:
- Stop to ask, wait for an answer, or end a turn while any step can still move.
- Act on an instruction you cannot trace to this file, `workorder.md` or the user's message. A change to the work is named here.
- Mark an item done when it was not measured, or weaken a test to pass it.
- Edit anything under `.claude/rules`, `.claude/checks` or `.claude/hooks`.
- Route around a block: no override variables, no writing through the shell after a refusal, no parking code in an unrelated file.
- Delete a branch, rebase, amend or force a push.
</constraints>

## When a hook blocks correct work

1. Read the refusal. If it is right, fix the code and mark it `right`.
2. If the law can be met another way that is honest, meet it, and mark the refusal with what happened.
3. If it is wrong and no honest way exists, mark it `wrong`, log it in `workflow-bugs.md`, leave that one item marked `BLOCKED BY KIT` in `progress.md`, and go on with the next.

A blocked item is a result. A block routed around ruins the work.

## A checkpoint is not the end

A session may end at any time, and a new one resumes from `progress.md`. While any item in `workorder.md` is open, keep working.

## When everything is done

Run the tests the branch's changes reach, measured against the trunk (the `pick-tests` skill; the project's `test-changed` command with `--base origin/<trunk>` where it has one), `doctor --strict`, `scan` and `logs` one last time, with their outputs in `build/evidence/final/`. Only then write `docs/workorders/typescript/DONE`, with the date and the final commit. Every step's "done when" must be measured first, or listed as `BLOCKED BY KIT`, or left open with a reason no further work could remove. Then say, in ten lines or fewer, what was built, what is proved, and what is not.
