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

- 0.12.0, the v8 additions (work/0.12.0-v8-additions, from the v7 branch), started 2026-11-04.
  making: the v8 additions merged into the kit without overwriting it (packs web, tui, nginx; fastify's one isProd switch replacing security-always-on; fastify, js-ts and ai additions; eight presets); concepts: none (design/shape.json declares none); reuse: PRESETS and normalisePacks (lib/packs.mjs), the node configuration (configurations/node/config.json) for the new packs, fresh and hookRun (test/kit-cli.mjs) in the v8 test.
  done when: MERGE.md's Verify passes (selftest, doctor --strict, npm test, list); every .incoming reconciled; .incoming-v8/ deleted; the branch on GitHub.

- 0.13.0, the time laws (work/0.13.0-time-laws, from main once v8 has landed), started 2026-11-04 (Tim: "yes" to the hook review).
  making: doctor caches a passing selftest by the hash of the hook and its libs; test-changed narrowed (a version bump alone, pack content by pack); a base hook suite-once and six small rules and two skills behind the hooks that cost the most time (KWB-41); concepts: none (design/shape.json declares none); reuse: judgeEvent (packs/base/hooks/lib/writes.mjs), hashFile (lib/manifest.mjs), the "# hook:" rule frontmatter (lib/packs.mjs planFiles), TABLE (scripts/test-changed.mjs).
  done when: a test shows the second doctor runs no unchanged selftest, and a changed hook is proved again; test-changed picks under 34 files for a version bump and for one pack's content; suite-once's selftest each way, seen red; KWB-41 closed.

- 0.14.0, stored text (work/0.14.0-stored-text), started 2026-11-04 (Tim: UIs render what comes from a database with \r correct, code highlighted, markdown parsed).
  making: pack stored-text: one renderer for text from a database (line endings, markdown, highlighted code, sanitized), a rule, a skill and four lesson checks, taken by the node and full-stack configurations and the UI presets; concepts: none (design/shape.json declares none); reuse: the lesson-checks hook and its needs mode (packs/base/hooks/lesson-checks.mjs), PRESETS (lib/packs.mjs), fresh and hookRun (test/kit-cli.mjs).
  done when: each check refuses its bad and passes its good through the hook in an install; the UI presets bring the pack; doctor --strict OK; the whole suite green once, committed.

- 0.14.1, MIT license (work/0.14.1-mit-license), started 2026-11-04 (Tim: "we should make our license MIT of this project").
  making: the project under the MIT license: a LICENSE file, package.json and the lock say MIT; concepts: none (design/shape.json declares none); reuse: none, no code changes.
  done when: LICENSE at the root, package.json and package-lock.json name MIT, on main.

## Steps

## Log

- 2026-11-04 00:50 EST: 0.11.0 started; merge applied, .incoming files reconciled; commit e17a79d (local, push blocked by KWB-39).
- 2026-11-04: 0.11.0 and 0.12.0 landed on main (964057b): npm test 167 of 167. 0.13.0: the gate ran once on a66749b in 252 s (it took 12 minutes and more before), 170 of 171; the noop list fixed (a rule held with a hook Sub37 does not have), noop 3 of 3 run alone: 171 of 171.
