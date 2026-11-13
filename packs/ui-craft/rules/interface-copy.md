---
# concepts: ui-markup
paths:
  - "placeholder"
---

# Interface copy says what happens, and proof is never invented

UI text talks to the person using it, so it is its own register: second person, active voice. The `writing` pack's rules are for public text about the product, not the words on its buttons.

<constraints>
Always do:
- Name a button for what it does: "Save API key", not "Continue". The name survives the flow ("Publish", then "Published").
- Write errors with the fix, not just the problem.
- Answer the visitor's first question on the first screen, in large type: what this is, and what it costs or does. One supporting sentence directly under the headline, one primary action.
- Keep every headline to two lines at every width: about 32 characters is safe.
- Write the full content. Thin sections are the commonest reason a clean page loses to a busier one.
- Write the argument before the layout: the page is a list of claims, each with its proof. A section with no claim is filler. The `write-the-page` skill is the method.
- Use the number the content has: not three features, three stats and three steps by reflex.
- One label per intent on a page: no two buttons with the same intent and different words. A button label stays on one line at desktop width.
- Write every visible string with ASCII dashes, never the em dash (`ascii-no-em-dash`).

Never do:
- Invent customers, quotes, reviews, press, logos or statistics. Sample details are fine when listed for the owner to confirm; proof is not.
- Use marketing filler (`ui-no-marketing-buzzword`), or "Get started" and "Learn more" as labels (`ui-no-stock-labels`).
- Use furniture text: "Est. 2024", coordinates, "Scroll to explore", "Available for work", labels pretending to be editorial like "Field notes" (`ui-no-furniture-text`). "Pricing" can simply say Pricing.
- Write captions that narrate the design, or ship placeholder copy (`ui-no-lorem`).
</constraints>

## Check
Lesson checks for this rule: `ui-no-furniture-text`, `ui-no-lorem`, `ui-no-marketing-buzzword`, `ui-no-stock-labels`.
