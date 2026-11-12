---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# App screens and pages are different things

A page is read once and must be remembered. A screen is read every day and must stay out of the way. The rules that make a page distinctive break a working screen, so each keeps its own.

<constraints>
Always do, on an app screen (from taste-skill's study of 23 product screens):
- Allow what work needs: 1px borders on cards and controls, row rules in tables, small sentence-case labels above values, pills inside rows, identical cards for peer objects, monospace for IDs and code.
- Keep colour for data, status and the one primary action. One hue per chart, four at most on a screen. Red is a signal: one red mark per object at most.
- Use a noun title at 18-32px, and figures at 16-40px; nothing at 48px.
- Use one filled primary per screen, usually near-black. Toggles are green or near-black, not the brand accent.
- Move density as three settings together: row pitch, padding and type size.
- Put destructive actions last, with the consequence in words and a confirmation that names the object. Use one save model per view.

Never do, on an app screen:
- The dashboard tells: a dark navy sidebar with a coloured active pill; "Welcome back" with a wave; an icon in a tinted circle on every KPI; a sparkline on every KPI; KPI values at 36-48px in the brand colour; a smoothed gradient area chart; a rainbow palette; a fat donut with slice labels; a zebra table under uppercase tracked headers; saturated status chips; pagination under a five-row list; an equal four-up grid whatever the data.
- Illustrate an empty chart: draw the zero line and one sentence.
- A screen that names no product and offers no action.

Removing every tell leaves a tidy template. What fills the space is the product: its own data at its real size, and a grid whose sums close.
</constraints>

## Check
Lesson checks for this rule: `ui-no-uppercase-table-header`, `ui-no-zebra-rows`.
