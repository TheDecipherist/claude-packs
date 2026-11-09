# admiral-fleet: the report (W8)

Run 2026-11-08, one unattended session (494639ba), from main at 0866039 (the order's own edits, landed first) to 1.4.0 on npm. Progress line by line is in progress.md, choices in decisions.md (d-1 to d-9), what is left in open-items.md.

## What was built

- **W0.0** `land-branch` brings the main checkout up to date after its proof; `git-guard` refuses the end of a turn while the main checkout holds the trunk and lags the remote's, and tells the user where it may not touch it (KWB-96). New: `hooks/lib/trunk-lag.mjs`, its selftest, and `hub-rig.mjs`, one scratch-repo helper the pushed-law selftest now shares.
- **W1** `full-stack` can choose `go`, `web`, `host-agent`, `shell-hooks`.
- **W2** the tenant rule loads on Go; both tenant checks read Go; a lesson check may carry more `examples` pairs, each proved by the selftest.
- **W3** one `packages/` layout with a web folder; `update` no longer writes a configuration's template into a project already of it (KWB-97).
- **W4** `analyse-reference-look` in base, measuring depth (shadow, bevel, edge light); `page-matches-reference-look` in ui-craft; depth rows in `ui-matches-reference-look`.
- **W5** 1.4.0: CHANGELOG, tag v1.4.0, published, dist-tag latest.
- **W6** admiralmcp's install block run against the published 1.4.0 in a scratch clone: doctor --strict OK with its 14 packs.
- Along the way: the work-order runner keeps its session logs out of git (KWB-98); the npx-name test leaves out recorded run output (KWB-99).

## Counts

| What | Count |
|---|---|
| Packs touched | 5: base, audio-core, ui-craft, multi-tenant, full-stack (and the full-stack configuration) |
| Rules added | 1 (`page-matches-reference-look`) |
| Rules widened | 2 (`no-role-crosses-a-tenant` to Go; `ui-matches-reference-look` with depth rows) |
| Checks widened | 2 (`tenant-filter-from-url`, `role-sees-all-tenants`), each with Go `examples` (3 pairs in all) |
| Skills moved or changed | 2 (`analyse-reference-look` moved to base and given depth; `land-branch` step 9) |
| Hooks changed | 2 (`git-guard`'s Stop, `lesson-checks`' selftest), 3 new hook lib files |
| Kit library | 1 change (`lib/layout.mjs` `buildLayout`, KWB-97) |
| Workflow faults logged and fixed | 4 (KWB-96 to KWB-99), each logged before its fix, each with a test |
| Tests added | 8 node tests (worktrees KWB-96, configurations fleet fixture, every-language x2, noop full-stack, workorder KWB-98, npx-name KWB-99, kf-build-laws depth) and 9 git-guard selftest cases; check-speed and noop's synth tests widened |
| Tests seen red before they passed | 9: the trunk-law cases (6 of 9 red), the worktree case, the fleet fixture (host-agent removed), the two every-language tests (old kit), the examples selftest (old lesson-checks, 0 !== 1), noop full-stack (KWB-97), workorder (KWB-98), npx-name (KWB-99); plus the depth gate red on the flat render |
| README counts changed | 3: base skills 11 to 12, audio-core skills 8 to 7, ui-craft rules 16 to 17; the page's rules 263 to 264 |
| Gates | W0.0 489/489, W1 469/469, W2 484/484, W3 482/484 (fixed, the failed run again 13/13), W4 490/491 (fixed, 32/32), W5 46/46 |
| Hook calls this session | 1,440 logged, 0 crashes |
| Refusals met | 2, both marked right: template-law c052abdf (the new selftest repeated a scratch-repo setup; one helper now), code-shape ef65a3a5 (a 352-column line in the W4 driver) |

## What is proved, and how

- Each step's "done when" was run, with its output under `build/evidence/W<n>/`, and every landing proved by `ls-remote`, `rev-parse` and the main checkout's `rev-parse` agreeing.
- Depth: one script measured a drawn reference card and two headless-Chrome renders; the flat render failed 9 depth rows with its colours passing, the drawn one passed all 12, and the side by side was read by eye.
- skill-first and look-gate: events sent through `run-hooks.mjs` on a scratch full-stack install, two refusals and two allowances.
- The release: from a clean folder, the published package lists W1's four names.
- The consumer: doctor --strict OK in a scratch clone of admiralmcp, 0 commits made there.

## What is not proved

- The Go tenant patterns never caught a real fault: 0 hits in 1,130 Go files. Go reads the URL into a variable before the query, which a one-call pattern cannot follow (open item 4).
- The Admiral agent has no database, so W2's checks guard code it does not have; the websocket identity check that would reach it reads no Go (open item 5).
- admiralmcp's own install block cannot run as written until its kit stand-in leaves (d-9). The proof ran the published kit beside the clone, with the block's exact arguments.

## What the kit did well

- `template-law` caught a copied scratch-repo setup at the write, and the shared helper is better code.
- The noop test's design (an old install, updated, compared file by file) is what found KWB-97 before release: without it, every existing full-stack project would have gained a second web folder.
- The `examples` pairs went in with no new machinery: doctor already proves every check through the selftest.
- `skill-first` and `look-gate` worked unchanged on a web page once the skill was installed.

## What the kit did badly

- KWB-97: `update` wrote a configuration's new template into existing projects.
- KWB-98: the runner's transcripts sat untracked in the project, with the user's paths and name in them.
- KWB-99: a test read recorded run output and failed on its own title.
- `logs` totals are all-time: this report's per-session counts needed a hand-written filter over the raw logs. A `--session` filter is a gap.
- The order's own W5 check (`npx --no-install ...@1.4.0` in an empty folder) cannot pass by the kit's own design (d-8).

## Run faults that were this run's, not the kit's

- Evidence first written with the home path, which named the user; rewritten with `~` (d-7).
- One commit attempt failed (`git add` of a path already staged for removal) and a gate started on uncommitted work; it was stopped and run again on the commit.
- Twice a source file was edited through a shell program instead of Edit, so the content laws did not judge those writes (path renames in tests); the rest went through Edit and Write.
- The network dropped several pushes and one `ls-remote`; each was retried until the remote agreed.
