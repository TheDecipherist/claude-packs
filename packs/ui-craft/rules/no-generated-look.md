---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# No generated look: every default is a choice or it goes

Generated UI clusters around the same traits. Each is fine when a brief asks for it; the fault is reaching for it without choosing. The brief's own words and a project's design system always win.

<constraints>
Never do, unless the brief or the design system asks:
- Purple or violet gradients, or cyan on dark (`ui-no-ai-palette`).
- A warm cream ground with a serif display and a terracotta accent; near-black with one acid accent.
- Gradient text (`ui-no-gradient-text`), or one accented word in a headline.
- A tiny uppercase tracked label above a heading (`ui-no-eyebrow`), or a pill badge above the headline.
- Index numbers beside headings: 01, 02, 03 (`ui-no-index-numbering`).
- A thick coloured border down one side of a card (`ui-no-side-tab`).
- Cards inside cards, rows of identical cards, an icon in a rounded tile above every heading.
- The same soft shadow under everything, coloured glows, one border radius regardless of hierarchy.
- Glass panels, floating pill navigation, decorative blobs, grid-line backgrounds.
- Fake dashboards of grey bars, a placeholder where a picture should be: no image is better.
- The overused faces by reflex: Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk.
- The assistant palette: a yellow-cream ground with terracotta or clay (`ui-no-assistant-palette`). It was the published fix for the earlier tells, and became the most recognisable look of all.
- Emoji as icons or bullets (`ui-no-emoji-as-ui`).
- Micro-UI clutter: fake status pills, pseudo-system labels ("00 orchestration layer"), decorative code-like tags, filler metadata rows.
- Box inside box inside box: one framing move, then alignment and space.

Always do:
- Spend your boldness in one place. Let one element be memorable and keep the rest quiet.
- Fill the space ornament leaves with scale, full content or a real picture, not another ornament.
- Use structure that carries information: an outline, a number or a divider earns its place by saying something.
- Replace a tell with a procedure, never a product: derive it from the subject. Every published "use this instead" list becomes the next wave of tells.
- Put an idea in first. A page with every tell removed and nothing in their place is an empty page with good manners, and that is a tell too.
- One icon family and one stroke weight per project; no hand-rolled icon SVG.

On the taste-skill study of 247 sites: those scored 7.5 or higher used icon feature cards 1% of the time against 28% for sites under 6.5, pill badges 14% against 34%, gradients 22% against 52%, shadows 24% against 48%, tiny tracked caps 16% against 57%.
</constraints>

## Check
Lesson checks for this rule: `ui-no-ai-palette`, `ui-no-assistant-palette`, `ui-no-emoji-as-ui`, `ui-no-eyebrow`, `ui-no-gradient-text`, `ui-no-index-numbering`, `ui-no-side-tab`.
