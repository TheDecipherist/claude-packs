# Progress: work order typescript

One line per finished item: `- YYYY-MM-DD W<n>.<item>: what was done, evidence path, commit`. A session resumes at the first step not
marked done, at its first unticked item.

- 2026-11-11 W0.1: decisions.md d-1..d-13 written; the order's folders (.claude-plugin, proxy, packs/base/hooks/bin, test/unit, test/hooks, test/tools, test/integration, test/fixtures/profiles, the probes, build/evidence) in .claude/layout.json and the kit updated (`update --dir .` OK); build/ ignored; probes/proxy/ already held the prototype and the four probes (copied with the order); evidence: `git diff` of .claude/layout.json and CLAUDE.md, commit (this line's)
- 2026-11-11 W0.2: origin/work/1.9.1-admiral-skill merged (conflicts: build.md both entries kept; site skills 95, hooks 46); the skill gains "watch a session with get_replies(since) or watch()" and its "A reply never arrives" row; CHANGELOG line under a new 2.0.0 section; a scratch `init admiral` + `doctor --strict` OK; the merge's picked tests (58 of 87 files against 905e6be) are run as W0.5(a)'s whole suite (d-14); commit 32c7474
- 2026-11-11 W0.3: KWB-154, 124, 120, 116 closed with where each was fixed (open-work section 2); KWB-166 stays open; commit 89268a5
- 2026-11-11 W0.4: typescript 7.0.2 and @types/node 22.20.5 pinned (devDependencies, exact) with rows in docs/versions.md; go 1.27.4 row (current stable, local 1.27.0; go.mod's toolchain line at W8); the language server's row waits on W1; commit 0950fce
- 2026-11-11 W0.6: suite-once refused run.sh's prompt (KWB-168, logged first); fixed with GRANTS_FULL and three selftest cases (the grant red before the fix); through the installed hook: run.sh's prompt npm test exit 0, the plain prompt exit 2; evidence build/evidence/W0/suite-once.txt; commit (next)
