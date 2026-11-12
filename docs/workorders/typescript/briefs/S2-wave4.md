# Session 2, wave 4: three agents (W10b's soak and leak checks, the commit-time hook cost, W11's generated graph)

The order is `docs/workorders/typescript/workorder.md` (read W10b and W8's Done when) and its `PROMPT.md`. The rules for every
agent are those of `briefs/S2-wave1.md`, section "Rules for every agent", with your own name and branch, plus wave 3's line: wait
for a run of your own only by its completion notice or a blocking wait on its process (`caffeinate -w <pid>`), and never end your
turn while a run of yours is going.

## w10b-soak: W10b items 1 and 2

Do items 1 and 2 of W10b as the order writes them, and measure their lines of W10b's Done when: the soak's 120 samples with the
verdict comparison at 0 differences; each leak check's number against its line, each plant seen red first; the daemon's RSS at the
end of the soak against its budget (d-31 states it: 250 MB on a fresh install; the soak's planted project is a fresh install).
Build the soak as a script under `scripts/` (it is the kit's own development tool, never shipped) on what exists: the replay
fixture `test/fixtures/replay/bandwarp-hooks.jsonl`, the player `docs/workorders/typescript/probes/replay-play.mts`, the rig
`test/integration/proxy-fire-rig.mts`, the daemon's status reply (`daemon status`, its `usage` and pid file). The project is a
scratch install under `build/` with `init --config synth-creator`, never another project on this machine. Run the 60-minute soak
once, in the background with its output under `build/evidence/W10b/`, holding your turn by a blocking wait on its process. The
leak plants (a growing array, an unclosed file, an interval left running) are short runs of their own, each a test kept in the
suite at a short length. Kill every daemon and sampler you start, and show none is left (`ps`) in your report.

## commit-cost: doctor --strict green on the kit's own live install

After wave 2, doctor's budgets in the main checkout (read only: its `.claude/hooks.log` and `build/session2/doctor2.txt`) still
fail on `git commit`, `git push` and `git merge` Bash calls: git-guard 244 to 385 ms and kit-fresh 87 to 121 ms each, against a
per-hook 10/50 ms p50/p95 and 200 ms worst (`lib/hook-budget.mts`). Find, by timing each step of git-guard's and kit-fresh's work
on such a call in a scratch repo with a remote (a commit with 1, 10 and 40 files staged; a push; a merge), which child processes
and reads cost the time, and remove them from the event: state kept per checkout and refreshed detached (as W8.3's git state and
the kept GitHub look already are), or read from the git directory's files without a process. Each change with a test that holds
the time on a planted repo (seen red first) and the laws' own selftests green. If a law truly needs a process on the event, say
which and why, and measure what it costs at load 1 and at load 10.

## w11-graph: W11 item 4, the README's performance graph, generated

Build W11 item 4 as the order writes it, before W11's after-numbers exist, so that W11.1 only refreshes data. The numbers live in
one tracked file, `docs/workorders/typescript/numbers.json` (the evidence under `build/` is ignored by git, so a generator and
its `--check` must read a tracked copy): one row per measure, `{ "id", "label", "unit", "before", "after", "evidence": "<path of
the evidence file each number came from>" }`; fill it now with the "before" from `build/evidence/W0/baseline.md` and the latest
"after" measured so far (each with its evidence path in the main checkout: W8's summary, W9's report, session 2's progress lines),
and mark each provisional after with `"provisional": true`, which W11.1 removes. `scripts/counts.mts` (with its parts) draws a
light and a dark SVG from it (one horizontal bar pair per measure a user feels: the wait per turn, Stop at p95, a release from
commit to npm, the gate for a one-hook change, a Bash call's hooks live, doctor cached, update warm; before and after on one row,
the factor written at the end), shown in the README through an HTML picture element with both themes, and a plain table of the
same numbers under it; `counts --check` red when the graph or the table disagrees with numbers.json (a test plants a changed
number). Load the `dataviz` skill before choosing colours and marks. The README text around the graph is the lead's: write only
the generated block between markers named like the other generated tables, and its marker pair, at the end of the README's
opening section.

## reds: four reds the gates see since wave 2's merge

Seen in the lead's partial gate (`build/session2/gate2-partial.txt` in the main checkout) and in wave 3's agent gates, each also
on the unchanged trunk: (1) git-guard's selftest case "kept Stop look: within about a second of GitHub, never its 3 s" (in
"git-guard: its selftest passes in an install" and "the house hooks pass their selftests"); (2) "every installed hook writes one
timing line per call: time, event, hook, ms, exit code" (once-only-index wrote no timing line); (3) "doctor is red on a hook that
sleeps 300 ms at one event, and names the hook and the event"; (4) "git commit, git add and the other git calls never wait on the
network or scan the tree: each hook p50 under 50 ms, worst under 500 ms". Wave 2's budgets change (merged in the order's branch:
the daemon answers PostToolUse before its recorders run; git-guard's law on the kept look and remote-tracking refs; the daemon's
indexes built at start in a worker) is the first suspect for (1) to (3); read `docs/workorders/typescript/agents/budgets-report.md`.
For each: run it alone on a quiet machine (load under 6), say whether it is red there, find the cause, and fix the code (or the
test, when the test is what is wrong, saying why); a timing case that only fails under load is made to measure what it means
(a count of network calls, a process count) rather than wall time, where it can. Log nothing in `workflow-bugs.md` (the lead
does): give each red's cause, fix and test in your report. Your branch is cut from the trunk after wave 3's first two merges.
