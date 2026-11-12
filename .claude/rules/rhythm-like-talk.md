---
# concepts: public-text
paths:
  - "README*"
  - "**/README*"
  - "**/*.mdx"
  - "docs/manual/**"
  - "docs/guide/**"
  - "docs/guides/**"
  - "manual/**"
  - "content/**"
  - "blog/**"
  - "posts/**"
  - "articles/**"
  - "drafts/**"
---

# Rhythm like talk: no mirrored, tripled or aphoristic shapes

<constraints>
Always do:
- Mix short, medium and long sentences the way talk does, and vary paragraph sizes: pair a long block with a one-liner.
- Reuse the word. Humans hammer the same noun; LLMs rotate synonyms (measured: humans repeat their top content word about 50% more).
- Catch any 3-item list: cut the third or expand past three, unless all three do distinct work.
- Say an idea as an explanation ("the tokens aren't in the query, they're in everything Claude does around it when there's something it doesn't know").

Never do:
- Write uniform sentence lengths, or the overcorrection, the dramatic staccato ("It's not. It's a band-aid.").
- Write "not X, but Y" mirrored constructions: make it a plain statement.
- Write a punchline sentence, the line that sums a paragraph up as an aphorism: "the token tax exists only where there is something to know", "every one of those posts was somebody's evening gone". One exception: a tagline the user chose, as the last line.
</constraints>

## Check
Lesson check for this rule: `no-not-x-but-y`.
