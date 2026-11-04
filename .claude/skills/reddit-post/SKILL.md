---
name: reddit-post
description: Use when drafting a Reddit post, or asked whether a post will work on Reddit or is too self-promo.
---

# Draft a Reddit post

## Principles that survived the data check

- **The title is ~80% of the post.** Spend effort there first.
- **One post, one job.** Upvotes OR comments OR community bonding.
  (Measured: an open-question close earns 12 median comments vs 8 without,
  but scores LOWER on votes, 3 vs 4. Question titles: 15 vs 7 median
  comments. The tradeoff is real; pick the job before writing.)
- **Self-promo that leads with itself is punished.** Bury the ask, lead
  with value. Exception: gold-rush subs in their rush window (claudeskills
  now) tolerate showcase posts; check the room's top posts first.
- **Match the emotion of the room.** Practitioner subs reward usefulness
  and curiosity; fan subs reward humor and solidarity. 30-second test:
  skim the sub's top posts of the week; do they solve problems or express
  feelings? Write to that.
- **Do not dump raw code.** Exception: r/Rag, where code IS the substance.
  A five-line snippet that makes the claim concrete is not a dump; dev
  readers scroll for it.
- **Velocity beats ratio.** A >=80% upvote ratio is a survival floor, not a
  driver. Watch the first 3 hours: >6 comments in hour one is the go-viral
  signal; a flat view curve by hour three means it's done, change the
  angle or the hour, don't just repost. Shares (author-only metric) are
  the truest "it landed" signal and can exceed upvotes.
- **Timing:** mid-week or Sunday; avoid Saturday. Best hour isn't reliable;
  use Post Insights' first-hour signal.

For POSTS the sub's length norm overrides the shortness instinct: 300+ word human posts score best (median 5). A value post may run long; it must read human, not short.

## Templates (rebuilt from the human corpus)

**A. Value post (upvotes):** first-person hook stating YOUR situation with
one oddly specific number ("I'm running X with 200k users") -> what you
did/found, receipts woven in prose or one ragged list -> the one insight ->
stop, or one open question if comments also matter. No summary close.
**B. Question post (comments):** greeting optional ("Hi all" opens 19-25%
of real posts) -> your situation in first person, 2-4 sentences, concrete
constraints and numbers -> the actual question as the LAST line, ending
with "?" -> optionally "Thanks!" / "TIA". Nothing after the ask.
**C. Community post (fan/watercooler):** relatable hook or war story in
the room's emotional register, humor or solidarity, short, media where the
sub likes it. No lesson-of-the-day close.
**D. Link post:** headline + link only.
**E. Argument post (the 750k shape):** a claim about the reader's own
setup in the title -> the claim paid off in paragraph one -> who you are
and how you know, second -> one short list of one-liners -> the fix or
the thing you built -> an ask that lets people disagree. Use for
launches and for any opinion piece.

## Workflow

1. Confirm target sub and topic/goal. No sub given: `pick-subreddit`.
2. Pick ONE job, then template A/B/C/D/E. An argument or a launch: `argument-post`, `launch-post`.
3. Draft to the skeleton, tuned to the sub: length from the sub's norm, one link max (none where links hurt), first-person hook, receipts, question-close only if the job is comments. The voice is `post-voice`.
4. Title last, with real effort: `reddit-title`. Flair: pick the value or humor flair; never the self-promo or low-effort-question flair.
5. "Conclusion first" is a REPLY rule, but a title that makes a claim gets that claim paid off in paragraph one; the reader must not wait 70 words through Tim's bio for it. The hook is the reader's own situation; who Tim is and how he knows comes second.
6. Pre-flight: right template for the culture, one job, one link, flair ok, the title got real effort and is a claim about the reader with no product or brand word, the first paragraph pays it off, the sub's length norm respected, receipts specific, ragged list not scaffolding, no em dashes, no summary close, no time or date anywhere, `humanize` passed. Employer disclosed once; no numbers that can't be defended in the thread.
7. Deliver BOTH formats: (1) paste-ready markdown in a fenced code block (title + body); (2) a two-column Field/Content markdown table (Title, Body, Flair, Best time, Sub) with `<br><br>` between paragraphs and `-` + `<br>` bullets so it pastes into Excel/Docs cleanly. Then list the 3 things to watch in the first 3 hours (hour-one comments >6, view curve by hour three, shares). Deliver as .md files, not artifacts.
