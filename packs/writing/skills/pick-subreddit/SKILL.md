---
name: pick-subreddit
description: Use when choosing which subreddit to post in, or asked what culture or length a subreddit expects.
---

# Pick the subreddit

Recommend by matching topic to culture and goal (reach: high median score; discussion: high median comments). For an unlisted sub, skim its top posts of the week and classify by analogy.

## The four cultures

- **Builder/practitioner** (mongodb, Rag, PostgreSQL, node, mcp,
  dataengineering, aws, docker, devops, backend, database, analytics,
  machinelearning, vectordatabase, langchain, llmdevs, etl) ->
  **Template A** (value post, job = upvotes) or **Template B** (question
  post, job = comments).
- **Meme/fan** (ClaudeAI, ClaudeCode, ChatGPT) -> **Template C**: humor,
  praise, shared feeling, sharp collective critique; media welcome.
- **News aggregator** (technology, programming) -> **Template D**: submit a
  link + headline, do NOT write a text body. (Measured: 0% of r/technology
  and 15% of r/programming posts carry body text.)
- **Watercooler/story** (sysadmin, ExperiencedDevs, startups,
  learnprogramming, learnsql) -> Template C in a professional register
  (war story, confession, career question).

Modifiers: LIFECYCLE (a gold-rush sub like claudeskills rewards
self-promo while the rush lasts; a quiet young niche like mcp does not;
check the flop rate, not the age) and FORMAT (self-post subs you write;
link subs you curate).

Schemaless and database-choice arguments live in r/webdev, r/node,
r/ExperiencedDevs and r/devops, not r/mongodb (measured 2026-10: a
Reddit-wide schema/schemaless search put r/node at 24 relevant threads and
r/webdev's 463-point "if NoSQL ends up with schemas anyway" thread at the
top; r/mongodb is where people who already chose it ask how-to). Second
wave for a launch goes there.

## Per-sub cheat table (July 2026 snapshot, ~100 posts/sub)

Medians are directional (n~100). "Slop%" = share of posts machine-flagged
as LLM-written; high slop = easy to stand out by sounding human.

| Sub | Culture | Med score | Med comments | Slop% | Notes |
|---|---|---|---|---|---|
| technology | news | 869 | 48 | 0 | link-only, no body |
| claudeskills | builder/gold-rush | 95 | 16 | 23 | showcase tolerated, huge ceiling |
| learnsql | learner Q&A | 77 | 19 | 18 | question titles: 33 vs 19 comments |
| ExperiencedDevs | watercooler | 71 | 69 | 2 | comment monster; Q-titles 97 vs 54 comments |
| database | builder | 21 | 7 | 0 | Q-titles 38 vs 13 comments |
| programming | news | 15 | 5 | 7 | link sub, text posts rare |
| dataengineering | builder | 15 | 10 | 1 | clean room, human tone lands |
| machinelearning | builder/research | 13 | 17 | 4 | depth expected |
| postgresql | builder | 6 | 7 | 7 | short + newsy wins |
| sysadmin | watercooler | 6 | 13 | 0 | war stories, zero slop tolerance |
| backend | builder | 5 | 26 | 4 | discussion-heavy; Q-titles 31 vs 18 |
| startups | story | 3 | 12 | 0 | first-person stories only |
| rag | builder | 3 | 5 | 21 | code IS the substance here |
| ChatGPT | fan | 3 | 7 | 8 | media/meme, body text rare |
| devops | builder | 3 | 25 | 4 | discussion-heavy |
| node | builder | 2.5 | 5 | 7 | |
| ClaudeCode | fan/builder | 2 | 13 | 8 | meme/manifesto register |
| ClaudeAI | fan | 2 | 5 | 7 | |
| mongodb | builder | 2 | 2 | 16 | small room, human tone stands out |
| mcp | builder/young | 2 | 1 | 17 | quiet niche, no self-promo |
| llmdevs | builder | 1 | 2 | 10 | |
| aws | builder | 1 | 11 | 5 | Q&A rewards questions |
| docker | builder | 1 | 7 | 4 | |
| webdev | builder | 1 | 4.5 | 6 | |
| learnprogramming | learner Q&A | 1 | 10.5 | 3 | |
