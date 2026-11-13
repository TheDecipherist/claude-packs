# Decisions taken in the audit run

## d-1 Evidence under build/ is not committed {#d-1}
- Question: the order puts evidence in `build/evidence/W<n>/`, and `build/` is ignored by git.
- Options: force-add the evidence; move it to a tracked folder; keep it where the order names it.
- Chose: keep it where the order names it (local to this worktree), and put every result that matters (exit codes, counts, verdicts) into `progress.md`, `units.md` and the report, which are committed. Easiest to reverse: a later run can add the folder.

## d-2 Ids SORTED.md lists as DECIDED join the ledger {#d-2}
- Question: W0 sizes `units.md` from DECIDED.md and SORTED.md section 7, but U26 (C16), E2.8, E8.11, E11.3, E13.1, E19.5, E21.1, E21.6, E52.1, E53.1, E61.1, E74.1 and T6 are work the order names (W3 names U26) and are listed only in SORTED.md section 6 as DECIDED.
- Options: leave them out of the ledger; add them.
- Chose: add them, and L1, L2 (W2's two logs) and S1 (W6's shell text), so every piece of named work has a row. The counts of both sources are kept apart in the ledger's header.
