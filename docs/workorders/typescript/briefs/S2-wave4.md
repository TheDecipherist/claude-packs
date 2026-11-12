# Session 2, wave 4: two agents (W10b's soak and leak checks, the commit-time hook cost)

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
