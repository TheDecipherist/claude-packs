# admiral-fleet: progress

One line per finished item: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. The next session resumes at the first step not marked done.

## Steps

- [x] W0.0 land-branch brings the main checkout up to date
- [x] W0 set up
- [x] W1 full-stack chooses web, go, host-agent, shell-hooks
- [ ] W2 the tenant law judges Go
- [ ] W3 one consistent full-stack layout, with a web folder
- [ ] W4 analyse-reference-look for any page drawn from a picture
- [ ] W5 release
- [ ] W6 prove the consumer's install
- [ ] W7 before calling it finished
- [ ] W8 the report

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
