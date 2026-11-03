---
name: build-step
description: Use when work begins on a step of a synth's build.md, when a step's "done when" may be met, when a session starts or ends in a repo with a build.md, or when someone asks where the build is. Also /build-step.
---

# One build step: its own branch, from start to merge

The canonical text is the repo's own `build.md` ("Rules for this file") and its `CLAUDE.md`. This file is the operating
summary. Where they disagree, the repo wins. The step tool is the project's (the `step` command in `.claude/layout.json`,
usually `python3 tools/step.py`); if the repo has none, copy `tools/step.py` and `tools/hooks/` from a sibling synth that
has them before doing any of this by hand.

The house rule (Tim, 2026-10-06): **every build task is built in a new branch. Once completed it is merged into the
trunk. We must not be able to lose any work.** MegaSynth lost two days of panel work to one checkout, more to work nobody
had written down as started, and more to steps called done because the code compiled. A step is a promise with a
measurement on the end, and a pushed branch is what a dead session leaves behind.

## 0. Before acting on a paste from Tim

- If the project's spec carries an edition line ("Spec edition: ..." at the top of `docs/*-spec.md`) and the paste names an
  edition, check the file shows it. Older, or no line: **stop and say so**, naming both editions.
- Every file a paste names must be there. One missing or older: **stop and tell Tim**, naming the file and what was found;
  do not carry on with the parts that do not depend on it.

## 1. At the start of a session

```
python3 tools/step.py status
```

It prints the count, the current step, the branch you are on, uncommitted changes and every branch not yet merged, with
its last commit. An unmerged branch is unfinished work: read its last commit message and its In-progress row before
starting anything else. Read `bugs.md`'s Open table too.

**If the work in front of you is not a step in build.md, stop and ask Tim whether the plan has changed.** A bug fix or a
change of plan he has agreed goes on `start --work <name> "task"` and is merged with `land`.

## 2. Start: the branch comes first

```
python3 tools/step.py start <STEP> "<the task, smaller than the step>"
```

This makes the step's branch from the trunk, writes the task under "In progress" with its start time (date, time, zone),
commits and pushes the branch. Nothing is committed straight onto the trunk; `git-guard` refuses it.

Read the step's "done when" now and decide how it will be measured. If it cannot be measured or seen in the opened app,
say so before building.

### The shape comes first (KWB-1)

Before any code, name every concept the step touches and find its row in `design/shape.json` (ONE with its frozen id, or
MANY with its count, generator, selectors and declared constants).

- **A concept the step introduces gets its row first, as the step's first commit** (`step.py save "shape: <concept> row"`
  with only `design/shape.json` in it), before any code that uses it. `shape-law` refuses an instance type with no row.
- Build for the shape: one loop over every instance, or the generator. An instance a bug was seen in goes on a `seen in:`
  line; a rule that picks one is a selector listed in the row; a fixed one is a named constant there. Anything else is
  refused with "example, rule, or constant?".
- **Every subagent brief quotes the manifest row of every concept it touches, word for word**, and names the shape and
  the generator, never an instance (`brief-guard` refuses "drive slot 2"; "seen in: slot 2, build for all slots" passes).
- `npx --no-install @thedecipherist/claude-packs shape scan` lists what the repo already names by instance; a step that touches such a file fixes its
  lines or leaves them as they were, never adds to them.

## 3. While working: save often

```
python3 tools/step.py save "<what state it is in>" [--paths <new files>]
```

Commits everything changed and pushes the branch. Run it after every unit of work, before any risky command, and
**always before a session ends**, saying if the work was interrupted and what is half done. It lists new files it was not
told about; name them or ignore them, never leave them floating.

- A bug goes into `bugs.md` the moment it is found, before it is fixed.
- A red tripwire gate stops all other work.
- Steps that run side by side each have their own branch. Switch with `start`; it refuses to switch over uncommitted work.

## 4. Is it done?

```
python3 tools/step.py check
```

It runs the mechanical checks and prints the repo's "Runs through every step" list to walk by eye. Run the project's
plants script (the `plants` command) before ticking: every planted fault red. Then the step's own "done when":

- **Measured or seen in the opened app.** Rebuilt, opened, pressed. Not "wired", not "compiles", not "the test I just
  wrote passes".
- A gate that passed first time is suspect. Plant the fault it exists to catch and watch it fail.
- Say which artefact was checked: the standalone, a probe, a picture the app rendered itself.

If any part is not met, the step is not done. Say which part, `save`, and keep working or ask. The branch stays open;
that is what it is for.

## 5. Finish: merge into the trunk

```
python3 tools/step.py finish <STEP> --proof "<what was measured, with numbers>" [--paths <new files>]
```

On the step's branch. It brings the trunk into the branch first, ticks and dates the step, moves its In-progress row to
the log with the finish time and what the step took, updates "Where we are" and the count, commits, merges into the trunk
with a merge commit, writes that commit's short hash into the log line in a second commit, and pushes the trunk and the
branch.

It refuses an empty proof, a step that is not the current one (side-by-side steps take `--out-of-order`), and unnamed new
files. If a merge conflicts it stops with both sides intact: resolve by hand, never by throwing a side away, and ask Tim
if it is not obvious which line is right. If it prints NOT PUSHED, push with the command it shows. A step is not finished
until the trunk is pushed.

## 6. Tell Tim

Conclusion first, in plain language: the step, what proved it, the new count, the next step. Show the changed `build.md`.
Never claim a step works that has not been built, opened and measured.

## Never

- Delete a branch, here or on GitHub. Rebase, amend, squash or force-push. `git add -A`.
- `checkout`, `restore`, `stash` or `reset --hard` over uncommitted work. `save` first.
- Commit straight onto the trunk. Pass `--no-verify`.
- Delete a step from build.md: strike it through with the reason and the date. A reopened step keeps its line, marked
  REOPENED.
- Tick from memory of an earlier session. Measure again.
- Soften a red test in a commit message.
