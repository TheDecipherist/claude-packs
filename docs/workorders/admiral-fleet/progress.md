# admiral-fleet: progress

One line per finished item: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. The next session resumes at the first step not marked done.

## Steps

- [x] W0.0 land-branch brings the main checkout up to date
- [x] W0 set up
- [ ] W1 full-stack chooses web, go, host-agent, shell-hooks
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
