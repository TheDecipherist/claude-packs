---
name: write-a-workorder
description: Use when a project or a large piece of work should be built with nobody there, when planning work across many sessions, or when writing or changing a work order.
---

# Write a work order (one job: a brief that needs nobody to answer anything)

`workorder <name>` writes `docs/workorders/<name>/`: `workorder.md` (the steps), `PROMPT.md` (how to run with nobody there) and `run.sh` (session after session). You write the steps, always starting from one of the kit's templates, chosen with `--template`: `generic` (the default), `plugin` (a new instrument or effect, the house's decisions written in) or `rebuild` (what four hardware rebuilds taught). Never start from a blank page. An order planned in claude.ai arrives filled in from the same templates; the `run-a-workorder` skill starts it and keeps it running.

<constraints>
Always do:
1. Say what it is, and what finished looks like, in one paragraph a stranger could act on.
2. State the honest position: what is known, what is not, and what cannot be proved. It stops a report claiming more than the work shows.
3. List every source by path or URL, with what it gives and what is missing. A run cannot ask where something is.
4. Name the foundation: what is reused, and must not be written again. Name existing work to learn from, and what not to take from it.
5. Order the steps so proof comes before what depends on it: find out, then prove what you found, then build on it. A step that can fail badly goes early.
6. End every step with **Done when:** a number or a test someone can run. "Works" and "looks right" cannot be measured, so they cannot finish.
7. Say what is forbidden: what stays out of git, and what no document may claim.
8. Make each new test show it can fail: a planted fault, seen red.
9. Tell the run what to record: decisions as it makes them, bugs before fixing them, and one line of progress per item, so a new session can resume from files alone.
10. Keep a last step that reads the finished work as a senior engineer would, and a report with counts.
11. Name only skills the project has installed; `workorder check` refuses the rest, naming the pack to add.
12. Carry the order's install block (one fence with the info string `claude-packs`, in the kit's own keys); W0 installs from it with `init --from` and nothing else.

Never do:
- Leave a decision open. Give the recommended choice, or tell the run to take one and record it.
- Write a step that needs a person: a login, a purchase, a judgement of taste. Taste is settled before the run; the rest goes first, or is listed open for the end.
- Name a skill that is not installed, or a measurement no skill in the project makes.
- Let a checkpoint read as the end. A run finishes only on the DONE file.
- Ask for a whole product in one step. A step is what one skill can prove in one go.
</constraints>

A step that works:

```markdown
## W4. The filter

1. Take the house filter through `copy-and-prove`, with its origin and its licence row.
2. Wire it into every instance from the chart's route, never by hand per instance.

**Done when:** the copy measures identical to its source (0 samples differ) and one changed coefficient measures different; `measure-tone` shows a sweep through the types with no level drop beyond the house figure; a planted wrong coefficient turns the gate red.
```
