# admiral-fleet: progress

One line per finished item: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. The next session resumes at the first step not marked done.

## Steps

- [x] W0.0 land-branch brings the main checkout up to date
- [x] W0 set up
- [x] W1 full-stack chooses web, go, host-agent, shell-hooks
- [x] W2 the tenant law judges Go
- [x] W3 one consistent full-stack layout, with a web folder
- [x] W4 analyse-reference-look for any page drawn from a picture
- [x] W5 release
- [x] W6 prove the consumer's install
- [x] W7 before calling it finished
- [x] W8 the report

## Log

- 2026-11-08 pre: the order's own edits branch (work/1.4.0-admiral-fleet: the order, W0.0, W4 depth, KWB-95) landed on main at 0866039, the gate 462 of 462 (test:changed --base origin/main), ls-remote equal to HEAD.
- 2026-11-08 W0.0.1: KWB-96 logged in workflow-bugs.md before any fix; npm install (up to date); kit lock held by this session (lock status).
- 2026-11-08 W0.0.2: land-branch step 9 fast-forwards the main checkout (fetch, merge --ff-only, rev-parse proof; touches nothing with uncommitted work or another branch held); skill 2,183 characters, doctor --strict OK (build/evidence/W0.0/doctor-strict.txt); 25bb50d
- 2026-11-08 W0.0.3: git-guard's Stop enforces it (d-3; lib/trunk-lag.mjs); selftest red 6 of 9 without the fix, 9 of 9 green with it, the full selftest OK (build/evidence/W0.0/selftest-red-before-fix.txt, selftest-green-with-fix.txt, git-guard-selftest.txt); worktree case red with the old hook (worktree-case-red-old-hook.txt) and green; 25bb50d
- 2026-11-08 W0.0 gate: test:changed --base origin/main on 25bb50d, 489 of 489 (build/evidence/W0.0/gate.txt)
- 2026-11-08 W0.0.landing: landed from work/W0.0-main-checkout at 194a20f; ls-remote, HEAD and the main checkout's rev-parse all 194a20f (build/evidence/W0.0/landing-proof.txt). W0.0 done: KWB-96 dated 17:20, before the fix's first commit 25bb50d; selftest red then green; land-branch within doctor's skill limits; this landing leaves the main checkout equal to origin/main.
- 2026-11-08 W0.1: npm install (up to date); doctor --strict OK on the kit (build/evidence/W0/doctor-strict.txt); swarmk main cloned to ../swarmk-ro at 1f46aaf, 81 .go files under daemon-go/ (build/evidence/W0/swarmk.txt)
- 2026-11-08 W0.2: lock status names this session, 494639ba (build/evidence/W0/lock-status.txt). W0 done.
- 2026-11-08 W1.1: web, go, host-agent, shell-hooks in full-stack's choose list (d-4 for their places); `configs` lists them under "to choose" (build/evidence/W1/configs.txt); bbbe033
- 2026-11-08 W1.2: README full-stack row names the four; readme test green in the gate (build/evidence/W1/gate.txt); bbbe033
- 2026-11-08 W1.3: configurations fixture, green (fixture-green.txt), red with host-agent removed from choose (fixture-red-host-agent-removed.txt); scratch `init --config full-stack web go host-agent shell-hooks` and doctor --strict OK there (scratch-init-doctor.txt); gate 469 of 469 on bbbe033. W1 done.
- 2026-11-08 W1.landing: W0 and W1 landed from work/W1-full-stack-chooses at ecde48c; ls-remote, HEAD and the main checkout all ecde48c (build/evidence/W1/landing-proof.txt)
- 2026-11-08 W2.1: the multi-tenant rule's paths take **/*.go, and it says the tenant comes from the session or connection in Go too; a scratch `init --config go multi-tenant` shows it live on internal/api/handlers.go, doctor --strict OK (build/evidence/W2/coverage-go.txt)
- 2026-11-08 W2.2: both tenant checks take Go (d-5): an `examples` list proved by the lesson-checks selftest; measured on daemon-go, HitKeep and go-saas/kit, 0 hits in 1,130 files, the 15 HitKeep role comparisons read (build/evidence/W2/measure.txt)
- 2026-11-08 W2.3: Go samples in check-speed (green, check-speed.txt) and every-language (the Go pairs refused and taken through the installed hook; the selftest names a planted miss in examples[1]); red on the old kit (tests-red-old-kit.txt) and the planted test red with the old lesson-checks (selftest-red-old-lesson-checks.txt, 0 !== 1)
- 2026-11-08 W2 gate: test:changed --base origin/main on a2bbe6e, 484 of 484 (build/evidence/W2/gate.txt). W2 done: doctor proves each check's Go pairs (the lesson-checks selftest, doctor OK in the scratch go install); the measurement in a2bbe6e's message; the rule live on a .go file.
- 2026-11-08 W2.landing: landed from work/W2-tenant-law-go at f747567; ls-remote, HEAD and the main checkout all f747567 (build/evidence/W2/landing-proof.txt)
- 2026-11-08 W3.1: the template under packages/ with web, web-app, web-components; channel dropped; pages, components, client on the web folders; js on core, api, web, api-tests; the full-stack pack's channel and ui concepts on web (d-6). Scratch init: the packages/ tree, no api/ or channel/ at the root (build/evidence/W3/scratch-init.txt)
- 2026-11-08 W3.2: planner-skills prints the web folders, read as a new reader (planner-web-folders.txt, planner-full-stack-SKILL.md); the preamble names no folder, unchanged
- 2026-11-08 W3.3: KWB-97 found proving the contract (update wrote the new web folders into an old project), logged at dd7427a before the fix; noop test on an install by the kit at f747567, red before (noop-red-before-fix.txt) and green after; full-stack, hover, configurations, layout-owned green (tests-green.txt, 28 of 28)
- 2026-11-08 W3.4: a page.tsx under packages/web/app gets the web pack's pages rules (ui-primitives-one-module, web-performance) live, doctor --strict OK (coverage-page.txt)
- 2026-11-08 W3 gate: test:changed --base origin/main on ab9ea59, 482 of 484 (build/evidence/W3/gate.txt): no-personal-name failed on this run's evidence and the runner's untracked logs, npx-name on a kept gate log quoting its title. KWB-98 and KWB-99 logged (af6c927), fixed with tests red first (356d4b0), the evidence written with ~ (d-7); the failed tests and the fix's run again, 13 of 13 (gate-rerun.txt). W3 done.
- 2026-11-08 W3.landing: landed from work/W3-packages-layout at 8ba6525 (the first push timed out unseen, the second went through); ls-remote, HEAD and the main checkout all 8ba6525 (build/evidence/W3/landing-proof.txt)
- 2026-11-08 W4.1: analyse-reference-look moved to base (5,809 characters, no synth word), its first line trimmed, straight-on-and-aligned left in audio-core (d-1)
- 2026-11-08 W4.2: ui-craft rule page-matches-reference-look, 25 lines: regions, colours by script against the picture's white and black, type scored and its licence, glow and spacing, depth, one look report per page, look-gate named
- 2026-11-08 W4.2b: depth rows in the skill, its report, ui-matches-reference-look and page-matches-reference-look; the proof: a reference card (make_reference.py) and two headless-Chrome renders measured by one script (look_depth.py): flat red on 9 depth rows with its colours passing, drawn green on all 12; edge_light.width's tolerance tightened to 0 first, since 1 px passed a missing 1 px edge; side by side read by eye (build/evidence/W4/depth/)
- 2026-11-08 W4.3: scratch full-stack install, the events through run-hooks.mjs: skill-first refused the reference read and allowed it after the Skill call; look-gate named the look after a build, refused the landing without a report and allowed it with a passing one (build/evidence/W4/hooks/transcript.txt)
- 2026-11-08 W4.4: noop: stellix and sub37 keep the skill after update (MOVED, same place, base's text); full-stack lists the two new files; base-neutral, readme (base 12 skills, audio-core 7, ui-craft 17 rules), site (264 rules), ui-craft, audio-packs, kf-build-laws green, 51 of 51 (tests-green.txt, site run after)
- 2026-11-08 W4 gate: test:changed --base origin/main on abd75c9, 490 of 491 (build/evidence/W4/gate.txt): what-the-kit-finds holds "separate the object from the photograph", which the neutral rewrite had made "from the picture"; the phrase put back in the skill (the test unchanged); that test and the skill's run again, 32 of 32 (gate-rerun.txt). W4 done: full-stack init installs the skill; flat red, drawn green on the depth rows; the two refusals and two allowances; the noop and base-neutral tests green; README counts true.
- 2026-11-08 W4.landing: landed from work/W4-reference-look at e08dba9; ls-remote, HEAD and the main checkout all e08dba9 (build/evidence/W4/landing-proof.txt)
- 2026-11-08 W5.1: CHANGELOG 1.4.0 entry naming W1 to W4, W0.0 and the fleet spec, the unreleased 1.3.2 entries under it; package.json 1.4.0; package-lock.json's version synced (d-2's drift committed here); nothing pinned, so no docs/versions.md row
- 2026-11-08 W5.2: the gate test:changed --base origin/main on d4403a2, 46 of 46 (build/evidence/W5/gate.txt)
- 2026-11-08 W5.3: landed from work/W5-release-1.4.0 at 9056bec (ls-remote, HEAD, main checkout: build/evidence/W5/landing-proof.txt); tag v1.4.0 on 9056bec pushed; npm publish 1.4.0, dist-tag latest (npm-publish.txt, registry-and-tag.txt); from a clean folder the published 1.4.0 lists go, shell-hooks, web, host-agent under full-stack's "to choose" (npx-clean-folder.txt; the literal --no-install form refuses in an empty folder by design, d-8). W5 done.
- 2026-11-08 W6.1: admiralmcp cloned at work/fleet-spec (f18b336) into a scratch folder; the install block as written installs the project's own stand-in, not 1.4.0 (1-install-block-as-written.txt, 2-standin-out-of-the-workspace.txt; d-9, the project's); docs/layout.admiral.json written from the spec's folder table (layout.admiral.json); the published 1.4.0 run with the block's exact init arguments (3-init-and-doctor-strict.txt)
- 2026-11-08 W6.2: doctor --strict read: two problems, both the project's (no a11y or hover gate for its retiring server-rendered UI), declared "none: <reason>" (d-9); doctor --strict --fresh OK with all 14 packs (4-doctor-strict-fresh-ok.txt); nothing committed to the clone, 0 commits on f18b336 (5-clone-state.txt). No finding was the kit's. W6 done.
- 2026-11-08 W7: open-items.md, 12 items, each tagged [deferred] or [gap] with why: d-1, skill-first reaching existing projects, KWB-97's new update behaviour, the Go patterns never seen to catch a real fault, the agent's Go websocket gap, no shipped depth tool, the consumer's stand-in and gates, template folders the project needs. W7 done.
- 2026-11-08 W8: report.md, every section with counts or a stated reason (refusals 2, both right; 1,440 hook calls, 0 crashes; 9 tests seen red; 4 KWBs). W8 done.
- 2026-11-08 W6-W8 gate: test:changed --base origin/main, 48 of 48 (build/evidence/W6/gate.txt)
