# Progress: work order audit

Session 1 started 2026-11-13. `workorder check audit`: OK.

- 2026-11-13 W0.1: npm ci && npm run build in .claude/worktrees/audit, exit 0.
- 2026-11-13 W0.2: baseline: doctor exit 0 (OK: base, js-ts), counts --check exit 0, units per pack; build/evidence/W0/baseline.md.
- 2026-11-13 W0.3: units.md with 362 rows (107 DECIDED ids, 248 section-7 ids, 346 together, 16 added per d-2); build/evidence/W0/baseline.md.
- 2026-11-13 W0 done when: measured (baseline.md holds doctor, the counts exit code, the per-pack counts and both id counts).
- 2026-11-13 W1.1: 21 new units (U1-U21, N1, N2) in packs/reverse-engineering by agents re-a, re-b, re-c (merged, read, N1 and N2 rewritten by the lead); tools dump-triage and byte-profile with planted-fault tests seen red; commits 3aceb77, 6e95f7b, 3c7f57c.
- 2026-11-13 W1.2: re-toolchain step 1 names its processors from identify-the-cpu's proved answer (re-a, 3aceb77).
- 2026-11-13 W1.3: E1-E18 by re-d (E1.6 dropped; E6.1, E6.2, E9.5, E9.13, E9.14 reworded; C4, C10, C11, C17 decided wording) and the new skill prove-a-disassembler (C4); names-sweep --run/--index, source-ledger --hash, new unwrap modes with tests in names-modes.test.mts; merged aded97d.
- 2026-11-13 W1 done when: units.md W1 rows filled (105 rows); pressure tests build/evidence/W1/pressure/ (routing.md: 21 of 21 skills fire 3/3 and stay silent 3/3; follow.md: 21 of 21 followed); rule paths build/evidence/W1/rule-paths.md (3 of 3 match); dump-triage red without its stuck line, byte-profile red with its profile changed; test:changed --base origin/work/2.0.0-typescript: 646 pass, 0 fail (build/evidence/W1/test-changed.log); counts --check exit 0. Also KWB-next fixed: the person lint leaves out a work order's sources/ (ea45e3c).

## FOR THE USER

- `packs/base/rules/unattended-runs.md` has no frontmatter, so the conformance gate (R1) refuses any edit to it; a `# concepts:` or `# hook:` line would change when it loads. E28 went to plan-and-logs instead (d-5). [deferred: the lead, because it changes how the kit loads a rule]

## BLOCKED BY KIT
