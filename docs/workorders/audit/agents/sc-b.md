# sc-b report (step W3, 3 items)

| id | new or extend | pack and file | one thing | proof |
|---|---|---|---|---|
| U27 | new | synth-creator: tools/can-open.mts, skills/can-the-user-open-it | the launched file holds the change (stale, leftover config, assets, markers) | test/tools/synth-creator/can-open.test.mts |
| U29 | new | synth-creator: skills/generate-the-machine-docs | one command writes every machine document from engine source | pressure test |
| U30 | new | synth-creator: tools/docs-current.mts, rules/docs-are-current.md | the build fails when generated documents are stale or the generator is not deterministic | test/tools/synth-creator/docs-current.test.mts |

U31 dropped (DECIDED). Generator key: `commands.docs` (`{out}` or env DOCS_OUT), committed folder `docsFolder` (default `docs/machine`).

## Pressure scenarios
can-the-user-open-it, fire: a panel change is built and the agent is about to say done; the build folder holds Release and a RelWithDebInfo copy of the plugin, and the user opens the plugin in a host. Silent: the agent is asked to queue a build (build-through-the-queue owns it). A following run would: run can-open with --source and --asset, delete the leftover, rebuild, rerun to exit 0, ask for a relaunch.

generate-the-machine-docs, fire: the parameter table in docs differs from the engine after three new parameters. Silent: the user asks to commit a hand-written design chart (chart-first). A following run would: write one generator, use strict parsers, add a head file, cross-check with a plugin lock, wire docs-current.

## Rule
docs-are-current: loads on `tests, build` concepts.

## Faults
template-law refused the first write of can-open.mts (report tail matched source-ledger); right, restructured. No other refusals.
