# kwb204 report: polling in a sleep loop refused in every project

Branch `work/2.0.0-ts-kwb204`.

## What was made

- `packs/base/hooks/lib/polling.mts`: `pollingIn(cmd)`, the one reader (moved from build-guard's `polling`): a while/until loop that sleeps, a `seq` loop that sleeps, a sleep over 5 s, `tail -f`. Quoted text and heredoc bodies are blanked first.
- `packs/base/hooks/no-polling.mts`: a new base PreToolUse Bash hook (order 65, after no-find), through `judgeVerdict`. The refusal says to run the long command with `run_in_background` and its output in a file inside the project (never /tmp). Its selftest (12 cases): four loops, a long sleep and `tail -f` refused; `sleep 2 && ls`, a loop with no sleep, the words in a string, a heredoc that merely contains them and `tail -n 20` allowed; the refusal names `run_in_background`; the write trap.
- `packs/base/hooks/lib/selftest.mts`: `bashStep(label, command, want)`, so a Bash worktree row is one line (the existing copies in other hooks were not touched).
- `packs/synth-creator/hooks/build-guard.mts` and `lib/build-guard-selftest.mts`: the polling function, its call and its plants are gone; no copy remains. A synth-creator install always has base, so it is still refused there.
- `packs/base/pack.json`: hook row (order 65), `tests` rows for the hook and the lib, `onByDefault`.
- `test/worktree-cases-commands.mts`: the `no-polling.mjs` worktree case (loop refused from the worktree and from the main checkout, `sleep 2` allowed).
- `test/hooks/base/no-polling.test.mts`: the contract on a base install (`until grep -q done build/log; do sleep 10; done` is refused, exit 2) plus unit rows for `pollingIn`.

## Red and green

- Red: `build/evidence/KWB-204/red.txt` (the test before the hook existed: `pollingIn` import and the base install refused nothing). Command: `node --import ./test/fresh-tmp.mts --test test/hooks/base/no-polling.test.mts`.
- Green: `build/evidence/KWB-204/green.txt`: 4 pass, 0 fail. `node packs/base/hooks/no-polling.mjs --selftest`: OK (12 cases).
- `npm run check` exits 0.

## Gate

`npm run test:changed -- --base origin/work/2.0.0-typescript`, output `build/kwb204-gate.txt`: 877 pass, 11 fail (exit 1). One of the 11 was mine and is fixed after the run (the repo-lint test "base and the base configuration name no synth word": my comments named synth-creator; reworded, the test now passes, rerun by name). The other ten are all things I may not change, or are not from this change:
- 4 counts tests (`test/counts.test.mts`): the README needs the hand-written cell for `no-polling` (see Open).
- 3 noop tests (stellix, sub37, full-stack): `test/fixtures/noop/pinned-manifest.json` must be re-pinned (`node scripts/counts.mts`, then read the diff and run `node scripts/noop-pin.mts`): the new files `lib/polling.mjs` and `no-polling.mjs` are "not in the pin", and the `selftest.mts` addition changes the emitted hooks that import it. I did not pin it: the lead pins once after the four branches merge.
- 1 `base-install-kit.test.mts`: the kit's own `.claude/settings.json` does not register `no-polling` until the lead runs `update` in the main checkout with `enable: ["no-polling"]`.
- 2 git-guard Stop tests (`worktrees-checkouts.test.mts`, `git-guard-libs.test.mts`: exit 0 where 2 is wanted for "one commit ahead"): unrelated to polling; not run against the base to confirm they were already red [gap].

## Refusals met (my own judgement)

template-law and once-only refused my first writes of the hook: the worktree-case rows and the selftest's opening lines repeat stage-guard's. Right in the first case (a helper, `bashStep`, is the cleaner fix); the selftest opening is shared by every hook's selftest, so it is marked `one-off:`. Not marked in `logs` (no ids shown).

## Open

- [gap] `README.md` needs the hand-written "What it does" cell for `no-polling` in the base hooks table (I may not edit README.md); `node scripts/counts.mts --check` is red until it is added. Proposed cell: `| `no-polling` | Bash | Refuses a while/until loop that sleeps, a sleep over 5 seconds and `tail -f`: run the job with run_in_background and its output in a file in the project |`. Then `node scripts/counts.mts` (the manifest and noop fixtures may move).
- [gap] The kit's own installed `.claude/` still lacks the hook until `update` with `enable: ["no-polling"]` in `layout.json` (update never switches a new law on silently); the lead does that in the main checkout.
