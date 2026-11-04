# claude-packs: the build

## Rules for this file

- A step is ticked only when its "done when" was measured or seen in the opened app.
- Every step is built on its own branch and merged when done; its start and finish are in the log.

## Where we are

Started 2026-11-04 (the kit had no build.md before 0.11.0; earlier steps are in CHANGELOG.md and workflow-bugs.md).

## In progress

- 0.11.0, the v7 additions (work/0.10.0-v7-additions), started 2026-11-04 00:50 EST.
  making: the v7 additions merged into the kit without overwriting it (dispatch laws in base, the needs check mode, seven node packs under a node configuration, presets, per-service compose checks); concepts: none (design/shape.json declares no concept: packs, configurations, hooks and checks are each a different thing, addressed by name); reuse: judgeEvent (packs/base/hooks/lib/writes.mjs) for dispatch-once's write frame, hookRun (test/kit-cli.mjs) for the tests' hook calls, inferConfig (lib/configs.mjs) for a preset's configuration.
  done when: npm test all green; the node-api install's checks pass their selftest and doctor --strict is OK; the work branch is on GitHub (blocked: KWB-39).
- KWB-39, git-guard takes SSH (Tim, 2026-11-04: "let git-guard take SSH"), on the same branch.
  making: git-guard's push law accepts a push whose target is an SSH URL under the owner (named in the command, or the URL of the remote it names), the Stop hint offers that form; concepts: none (design/shape.json declares none); reuse: house() and its env (packs/base/hooks/git-guard.mjs), pushCommand (packs/base/hooks/lib/pushed.mjs).
  done when: git-guard's selftest has an SSH case each way (an owner SSH remote and URL pass; another owner's SSH remote and an HTTPS remote are refused), red without the fix; the kit's install updated; work/0.10.0-v7-additions pushed over SSH.

## Steps

## Log

- 2026-11-04 00:50 EST: 0.11.0 started; merge applied, .incoming files reconciled; commit e17a79d (local, push blocked by KWB-39).
