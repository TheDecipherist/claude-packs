# admiral-fleet: progress

One line per finished item: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. The next session resumes at the first step not marked done.

## Steps

- [ ] W0.0 land-branch brings the main checkout up to date
- [ ] W0 set up
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
