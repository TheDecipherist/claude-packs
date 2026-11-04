---
name: humanize
description: Use when text is about to go public or to someone else, a manual page, a README, an article, a post, a reply, an email, a bio, or when asked whether something sounds like AI or to make it sound human.
---

# Humanize: the last pass on anything that goes public

The rules on public text set the cadence (`cut-the-padding`, `rhythm-like-talk`, `no-stock-language`, `no-scaffolding`, `no-time-or-date`, `ascii-no-em-dash`, `write-from-your-own-corner`, `direct-voice`, `no-cargo-cult`). This is the pass over the finished draft. Not for code, commit messages, config or internal specs, logs and briefs: those stay plain.

Why it matters (corrected 2026-08): "getting tagged as AI kills a post" did NOT survive the data; LLM-flagged posts score the same as human ones (median 3 vs 3). The real reasons: differentiation (target subs run 17-23% obvious slop: claudeskills 23%, rag 21%, mcp 17%, mongodb 16%), trust (one "this is AI" comment under a MongoDB-badged account is a brand hit votes don't measure), and mod removals that never show in scraped data.

<constraints>
Always do:
1. Before publishing anywhere but Reddit (Dev.to, partner channels, LinkedIn, anywhere public), run the review track and approvals in `mongodb-content-policy`. Dev.to article STRUCTURE follows `devto-writing`; cadence and voice stay here.
2. Run the cadence check:
   - em dashes gone; no "not X but Y"; triads cut; no summary close (end on the ask or the last point); no punchline sentences; no colon drama; no stock connectors or slop words;
   - sentence and paragraph shapes varied, no staccato performance; repeated terms NOT thesaurus-varied;
   - more I/we than you/your unless the medium demands otherwise, and "I" not "we" for the author's own projects;
   - padding cut: could it be said in half the words; self-contained; ASCII only; no time or date anywhere; nothing that reads as negative about MongoDB.
3. Run the spot tests on any suspect sentence:
   - **Deletion test:** remove it. Paragraph loses nothing: it was filler.
   - **Genericity test:** swap the names, tool and subject for any other. Sentence still reads fine: it says nothing; make it specific or cut.
4. Run the substitution sweep: any "serves as / stands as / boasts / features" that survives an is/has swap gets swapped; any trailing "-ing" commentary after a comma goes; any unnamed "experts / studies" gets a name or the claim goes.
5. Deliver it clean. Reasoning, stance checks and notes stay OUTSIDE the final text. The text the author will use goes in its own fenced code block with NOTHING else in it. Longer deliverables go out as .md files, never as artifacts.

Never do:
- Mix draft and explanation in one block.
</constraints>
