---
name: seo-audit
description: Use when asked to audit a URL or page for SEO, indexing, structured data, LLM citability, or why a page does not rank. Runs the 27 checks in checks.md against the live DOM and writes a severity-grouped report file.
---

# seo-audit

One thing: run the 27 technical SEO and LLM-readability checks in `checks.md` (beside this file) against the live page and write `seo-audit-<domain>-<date>.md`.

<constraints>
Always do:
1. Read `checks.md` first and run its JavaScript **verbatim** through the browser (Playwright, or the `playwright` MCP server if the project has it); never from memory. If `checks.md` is missing, say so up front and derive each check from its description, noting in the report that the canonical snippets were unavailable.
2. Navigate, wait for `document.readyState === 'complete'`, then run the categories in order: A identity and indexing (title, H1, heading hierarchy, meta, canonical, robots.txt fetched separately); B structured data (JSON-LD types, FAQ, chunk extractability: H2/H3 followed by a self-contained paragraph); C content semantics (alt audit, links, P vs SPAN census, landmarks, nav quality, article metadata); D accessibility and E-E-A-T as LLM signals (LLMs parse like screen readers); E performance and security (reload **before** console checks: timing, script and third-party counts, protocol, preloads, console errors including React hydration #418/#423); F cross-page internal linking.
3. Severity: P0 blocks indexing or throws errors; P1 major ranking, security or LLM impact; P2 clear degradation; P3 LLM/GEO gaps; P4 quick wins.
4. Report: title/URL/date; a 3 to 5 sentence summary naming the single most important fix; findings P0→P4 with the measured value; "What Google most likely ranks this page for" from the signals found; "Prerequisites before content work" when P0/P1 exist.
5. Save the file in the working directory and send it.

Never do:
- Guess a check's output.
- Skip the reload before capturing console errors.
- Report a finding without the measured value behind it.
</constraints>
