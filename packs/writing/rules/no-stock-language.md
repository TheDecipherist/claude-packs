---
# concepts: public-text
paths:
  - "placeholder"
---

# No stock language: say what is, name who said it

<constraints>
Always do:
- Use is and has. "serves as", "stands as", "functions as", "represents", "marks" are **is**; "boasts", "features", "offers", "maintains" are **has**. If the sentence still works with is or has, it was padding.
- Start a sentence with its subject.
- Name the source, or drop the claim. Honest personal doubt ("I haven't seen good numbers on it") beats borrowed authority.
- Replace filler with the specific version: "it depends on your needs" becomes "under 50 users, use the free tier".

Never do:
- Dramatic colon setups ("The reality: nobody cares."): measured at literal zero in human text.
- Stock connectors ("Here's the thing", "That said", "So here's what happened"): also zero in human text. Delete them, say the thing.
- Slop words, a short list that does not grow: delve, tapestry, testament, landscape, journey, seamless, robust, game-changer, crucial, dive into, unleash, leverage, supercharge.
- Trailing "-ing" commentary: ", highlighting their commitment to...", ", ensuring a smoother experience", ", underscoring / reflecting / showcasing / paving the way for". Cut everything after the comma; a real claim there gets its own sentence with evidence.
- Participial openers ("Leveraging the power of...", "Building on this...", "Drawing from..."): instruction-tuned models open this way at 2-5x the human rate (PNAS 2025).
- Vague attribution: "experts say", "studies have shown", "research suggests", "it is widely regarded".
- Pseudo-wisdom: "The key is finding the right balance", "there's no one-size-fits-all answer", "context is everything". State what happened; delete every clause explaining why it matters to the universe.
</constraints>

## Check
`no-stock-connectors`, `no-slop-words`, `no-dramatic-colon`, `no-copula-dodging`, `no-trailing-ing`, `no-participial-opener`, `no-vague-attribution`, `no-pseudo-wisdom` (lesson checks).
