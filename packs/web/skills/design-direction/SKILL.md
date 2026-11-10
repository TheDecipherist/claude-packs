---
name: design-direction
description: Use when a feature, page or app gets a user-facing surface and no Design Direction exists yet for it, or when a restyle is asked for. Produces the plan (tokens, type roles, layout, signature element) that the code is then derived from.
---

# design-direction

One thing: write the `## Design Direction` section **before** any UI code, so the look is decided once and every colour and type choice in the build derives from it. Accessibility floors (`accessibility` rule) and the primitives module (`ui-primitives-one-module`) are the frame it works inside; `design-review` judges the rendered result against it.

<constraints>
Always do:
1. Ground it: name the one concrete subject, its audience and the page's single job. If the brief leaves it open, pick and state the choice.
2. Brainstorm a compact plan:
   - **Colour**: 4 to 6 named tokens (surface, text, accent, per-domain colours), each with its dark-scheme pair. They go to `@theme`, nowhere else.
   - **Type**: a characterful display face used with restraint, a complementary body face, a utility face for data if needed; a scale with intentional weights and spacing. Self-hosted.
   - **Layout**: the concept in one sentence plus an ASCII wireframe; the page skeleton (container width, page header, section order, where the primary action sits).
   - **Signature**: the single element this page will be remembered by. Spend the boldness there and keep everything around it quiet.
   - **Risk**: one line on the risk taken.
3. Critique the plan before building: anything that reads like the generic default for this kind of prompt gets revised, with what changed and why. The three defaults to avoid: warm cream + high-contrast serif + terracotta; near-black + one acid accent; the purple-gradient SaaS page with Inter everywhere and a card for everything.
4. Review the plan against the brief before building: work through a similar prompt, and anything you would have arrived at anyway is a default, not a choice. `no-generated-look` lists them when the `ui-craft` pack is here. The brief's own words and a project's design system always win.
5. Write it into the feature doc as `## Design Direction`. The build derives from it; `design-review` checks against it.
6. Words are design material: controls say what happens ("Save changes", not "Submit"), the name survives the whole flow ("Publish" → "Published"), errors say what went wrong and how to fix it, empty states invite the first action. Sentence case, plain verbs, no filler.

Never do:
- Write UI code before the section exists.
- Scatter motion: one orchestrated moment beats many effects, and all of it respects `prefers-reduced-motion`.
- Let the direction override an accessibility floor; it works inside them.
</constraints>

Put the choice through a question only when the brief genuinely supports two directions; otherwise decide and show it.
