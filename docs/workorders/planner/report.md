# planner: the report

The order `docs/workorders/planner/workorder.md`, run unattended on 2026-11-09 in one session, on `work/1.6.0-planner`, released as 1.6.0 (the order named 1.5.0; research-gaps published that first, d-6). Decisions are in `decisions.md` (d-1 to d-29), progress in `progress.md`, evidence under `evidence/`.

## What was built

- `planner/`: three claude.ai skills (`workorder-writer` 7.1k characters, `start-a-build` 2.9k, `ui-mockup` 4.9k) with five reference files, and `planner-skills --zip` bundling them with `design-a-preset` and `synth-cost` (W6).
- `workorder --template generic|plugin|rebuild` and the new `plugin` template (W1); `workorder check` (W2); the install block with `init --from` and `new --from` (W3); `new --template` (W9, d-29).
- `synth-cost` in audio-core (W4); `design-a-preset` rebuilt from the patch document with 18 reference files, the grown bank rule, two checks and `prove-a-bank` in sound-design (W5); `run-a-workorder` in base and `write-a-workorder` split (W7).
- Kit faults found and fixed on the way: KWB-128 (the prompt template's branch per step and full suite), KWB-136 (every update wrote `"chart": []`, breaking chart-first; found by the noop test).

## What is proved, and how

| step | Done when | measured |
|---|---|---|
| W0 | doctor --strict OK; layout names planner; npm pack lists planner/README.md; d-1 to d-5; sources | evidence/W0 |
| W1 | three templates write from a scratch folder; tests green, each red on its planted fault | 6 faults red, evidence/W1 |
| W2 | four planted faults each refused with the right line; admiral-fleet checked | 5 refusal tests red without their check; admiral-fleet: 13 refusals recorded as findings (d-12), evidence/W2 |
| W3 | new --config synth-creator --from an order, doctor --strict OK; the refusal red on a planted key; README | 4 faults red, evidence/W3 |
| W4 | doctor accepts the skill; readme counts; a scratch install has the skill | evidence/W4 |
| W5 | doctor accepts the skill and both checks; prove-a-bank on a synthetic bank, each planted fault red; counts; base-neutral | 13 measurement faults each fail only their line; checks measured on 2,086 and 167 house presets and proved through the hook, evidence/W5 |
| W6 | five zips from a fresh npm pack install; planner test green and each fault red; the three skills by doctor's rule | 10 faults red, evidence/W6 |
| W7 | both skills under 8,000; doctor accepts them; README lists both | evidence/W7 |
| W8 | inputs/ gone; every README claim checked; open items written | 6 claims corrected, evidence/W8/readme-check.md |
| W9 | the published version, in a clean folder: new --template plugin, init --from its block, doctor --strict green; five zips; this report's counts | evidence/W9 |

## What the kit did: `logs` for this run

The counts below were read before the landing; `evidence/final/logs.txt` has the last ones. 3 refusals in the build, each judged right, no crash:
- `template-law`, twice: a function name already in the repo (`linesOf`, renamed to `orderLines` for its own job), and a folder walker that already existed (`filesUnder` in `lib/selftest-cache.mjs`, exported and called). Both caught a second copy before it was written.
- `git-guard`, once: a commit before the previous one was pushed (KWB-26's law); pushed, then committed.

At the landing, `inside-the-project` refused `git -C` on the main checkout (land-branch step 9), judged wrong and logged as KWB-137: the main checkout is the folder this worktree lives in. The main checkout was not fast-forwarded by this run.

Three hook-context notes said a Bash write to source could not be judged by content laws; the source writes moved to Edit and Write after the first.

## What is not proved

- That a person who knows nothing finishes the interview in one sitting, and that claude.ai starts the right skill for each sentence a person types: the intent test runs the kit's own match (`skillFor`, d-24), not claude.ai's. The first real planner run is the test.
- The cost ledger's units are planning estimates until a build's W0 measures one.
- `prove-a-bank` is proved on synthetic renders; no house bank has been rendered through it yet.

## Left open

- [gap] KWB-134: doctor stays green when a hook file that settings runs is gone.
- [gap] KWB-135: an opt-in hook that imports another opt-in hook crashes when switched on alone (`idle-wake` and `user-asks`).
- [deferred: by this run, the order keeps the rebuild template to two changes] its Done whens state counts in words, so `workorder check` refuses 16 of 19 until filled with numbers (d-11).
- [gap] One node start hung in a futex wait for 10 minutes during the prove-a-bank tests and ran in 0.18 s by hand; the test now gives each run 60 s. Not reproduced; the machine was loaded by another project's run.
