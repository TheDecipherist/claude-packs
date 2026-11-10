---
name: write-the-page
description: Use when a page needs its words: a landing page, a product page, a headline, or copy that reads as templated.
---

# Write the page before building it (one job: an argument, not sections)

<constraints>
Always do:
1. Answer in one line each: who is reading, and what do they already know? What is this, said the way its maker would say it to a friend? What one thing should they believe after one screen? What would make them believe it? What do they do next?
2. List the page as claims, one per section, each with its proof. A section with no claim is filler. The order of the argument is the order of the page.
3. Budget the headline: characters per line is about line width divided by (font size x 0.5). About 32 characters, four to six words, survives every width at a confident size. Up to about 42 if the phone size comes down. Past that, you are writing a sentence: move the rest to the supporting line.
4. Pick the plainest shape that is true: the name; what it is ("Furniture for small rooms"); the claim ("Your bank won't do this"); the instruction ("Understand your money").
5. Control the break: `max-width` in `ch`, `text-wrap: balance`, an authored `<br>` where it matters, checked on the phone. Section headings are two to five words.
6. Keep a statement a paragraph: an intro sentence set large is a `<p>` of about 25 words, at 36px or less on desktop and 24px on a phone.
7. List sample details for the owner to confirm. Proof is never invented.

Never do:
- Fix a long headline only by shrinking it: five words at 64px beats nine at 28px.
- Leave a single orphan word on line two: cut a word.
</constraints>
