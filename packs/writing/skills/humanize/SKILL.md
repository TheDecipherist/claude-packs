---
name: humanize
description: Use when text is about to go public or to someone else, a manual page, a README, an article, a post, a reply, an email, a bio, or when asked whether something sounds like AI or to make it sound human.
---

# Humanize: the last pass on anything that goes public

The rules on public text set the cadence (`cut-the-padding`, `rhythm-like-talk`, `no-stock-language`, `no-scaffolding`, `no-time-or-date`, `ascii-no-em-dash`, `write-from-your-own-corner`, `direct-voice`, `no-cargo-cult`). This is the pass over the finished draft. Not for code, commit messages, config or internal specs, logs and briefs: those stay plain.

Why it matters: readers trust a voice that sounds like a person, generic text sinks in a crowded channel, and moderators remove what reads as slop.

<constraints>
Always do:
1. Before publishing for an employer or a client, run their review track. Cadence and voice stay here.
2. Run the cadence check:
   - em dashes gone; no "not X but Y"; triads cut; no summary close (end on the ask or the last point); no punchline sentences; no colon drama; no stock connectors or slop words;
   - sentence and paragraph shapes varied, no staccato performance; repeated terms NOT thesaurus-varied;
   - more I/we than you/your unless the medium demands otherwise, and "I" not "we" for the author's own projects;
   - padding cut: could it be said in half the words; self-contained; ASCII only; no invented time or date.
3. Run the spot tests on any suspect sentence:
   - **Deletion test:** remove it. Paragraph loses nothing: it was filler.
   - **Genericity test:** swap the names, tool and subject for any other. Sentence still reads fine: it says nothing; make it specific or cut.
4. Run the substitution sweep: any "serves as / stands as / boasts / features" that survives an is/has swap gets swapped; any trailing "-ing" commentary after a comma goes; any unnamed "experts / studies" gets a name or the claim goes.
5. Deliver it clean. Reasoning, stance checks and notes stay OUTSIDE the final text. The text the author will use goes in its own fenced code block with NOTHING else in it. Longer deliverables go out as .md files, never as artifacts.

Never do:
- Mix draft and explanation in one block.
</constraints>
