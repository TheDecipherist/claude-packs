---
name: re-deliverables
description: Use when closing a machine, or when asked what a finished reverse-engineering leaves behind.
---

# Leave the record (one job: the next reader can check every claim)

<constraints>
Always do:
1. The research record, with withdrawn findings in place.
2. CSV maps of every parameter, with provenance.
3. The names file, and every table it located: address, stride, count, and the names that proved it. The menu map, with both mismatch lists.
4. The laws reference: each law, its source, and where the code is.
5. The debt ledger of `[EAR]` values, with leads.
6. Tests, including a byte-exact round trip of every patch.
7. The non-negotiables list.
8. State which tags cannot exist here, and which check is lost with no corpus.
9. In every step report, the tag histogram of the laws file: a manual-led machine should read mostly `[MAN]` with a few `[FW]`, and a different shape is worth a look. Add the commands and the table of paths that reproduce each number, with the tables kept as TSV beside.
10. A confidence column on each attribution, marked wired only when the name came from two sources and survived the round trip. Generate the research log from git history, with the commit time as the finding time.
11. At the top of the repo, from day one, the list of findings that are easy to get wrong. For each open question, a falsifiable prediction: what would separate two machines or revisions, and which image would test it.

Never do:
- Leave a verdict with no number behind it.
</constraints>
