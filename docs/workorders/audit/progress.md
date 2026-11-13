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
- 2026-11-13 W2.1: U22, U23, U24 (check), U25, U73 agent-model (opt-in hook), U74 agent-ledger, L1 skill-log, L2 rule-log and `logs skills|rules` (agents base-a, base-b, base-c; merged 875fb84..); the agent hooks moved to the Agent|Task group (KWB-next, hook-matchers test, 7ec0313); rules' concepts corrected to load beside gates and code (92ae1e4).
- 2026-11-13 W2.2: pdf-to-md C7 (backup read at use, the user told) and C15 (a governor slot, no polling) (base-d).
- 2026-11-13 W2.3: E19 (E19.1 reworded, E19.5 not added), E20 (E20.3 reworded), E21-E29, E80 (E22.3 dropped; E28 in plan-and-logs, d-5) (base-a, base-d).
- 2026-11-13 W2 done when: units.md rows filled; agent-model selftest 9 cases incl. a fork and a self-defined model passing and Opus with no reason refused (build/evidence/W2/agent-model-selftest.txt); usage-logs.test prints a skill-use row, a rule-applied row and the never-used lists from a scripted session (build/evidence/W2/unit-proofs.log, 24 pass 0 fail); rule paths build/evidence/W2/rule-paths.md (7 of 7 match); test:changed 1175 pass 6 fail, each fixed and rerun (build/evidence/W2/rerun.log), the runs-alone kit-install test (KWB-219) left for a quiet machine; counts --check exit 0. Kit's own install updated (aa10af9), the three logs on by default (d-6).
- 2026-11-13 W3.1: U26 workflow-bugs (base, C16), U27 can-the-user-open-it + can-open tool, U28 fault-logged (opt-in Stop hook), U29, U30 docs-current tool and rule (run-twice test); U31 dropped (agents sc-a, sc-b; f05de62).
- 2026-11-13 W3.2: E30-E36 (sc-a).
- 2026-11-13 W3 done when: can-open.test names a stale binary and a RelWithDebInfo leftover, each red without its check; fault-logged.test refuses an admitted fault with no log and passes the planted-fault and expected-failure phrasings; pressure tests build/evidence/W3/pressure (6 of 6 fire 3/3, silent 3/3, followed); test:changed 1319 pass 5 fail (build/evidence/W3/test-changed.log), each fixed and rerun green except the runs-alone kit-install test (KWB-219); counts --check exit 0.
- 2026-11-13 W4.2 (midi): U47-U50, E50-E56 with C6, C9, C9a, clock-law.md restored (E51.2a and E51.2c dropped, E51.3 reworded), the open-default probe tool and test (agent midi; f05de62); concepts per d-7.
- 2026-11-13 W7.1: T1-T10 (T1, T3, T9 reworded; T11 dropped), C8 and C12 lines, the processors line driving re-toolchain; 13 rebuild and 5 generic Done whens given a count and a test path (agent tpl; f05de62).
- 2026-11-13 W7 done when: three fresh orders (generic, plugin, rebuild) through workorder check: 0 Done-when refusals each (build/evidence/W7/summary.md, templates.log); workorder tests 30 pass 0 fail; test:changed in the W3 run above.

## FOR THE USER

- The five midi rules extended in W4 now load by concepts (`cpp, js, python, tooling`) instead of raw globs (d-7): a project with loose Python files, no python pack and no tool folder no longer gets them on those files. [deferred: the lead; forced by the conformance gate R1]

- `packs/base/rules/unattended-runs.md` has no frontmatter, so the conformance gate (R1) refuses any edit to it; a `# concepts:` or `# hook:` line would change when it loads. E28 went to plan-and-logs instead (d-5). [deferred: the lead, because it changes how the kit loads a rule]

## BLOCKED BY KIT
