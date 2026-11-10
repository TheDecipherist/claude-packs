---
name: hover-state
description: Use when a button, link, tab, row, card or any clickable element is added or changed in the web app, when something does not react under the mouse, or when a hover gate is written or fails.
---

# Hover state (one job: every clickable thing answers the pointer, and a gate proves it)

The law is the rule `web-hover-every-pressable`: a cursor naming the interaction, and a small visible effect on the hovered element itself.

## Add the hover to a new element
1. Use a real `button` or `a` (or give a custom element a role and both of the next two).
2. Set `cursor` from the interaction: `pointer` for a press or link, `text` for a field, `grab` or a resize cursor for a drag, `not-allowed` only when truly disabled.
3. Add a `:hover` (and `:focus-visible`) style on that element: a lift, a ring, a brighten, an underline; a transition of about 100 ms. Change transform, shadow or colour, never size or margin, so the neighbours stay still.
4. Define it once on the shared component, so every use gets it; do not restyle per page.

## Prove it: the hover walk
A browser test (Playwright, in the project's own test folder) that, for one element of each component and every one-off on each screen (`button, a[href], [role=button], [role=tab], input, select, textarea, [tabindex]`):
1. moves the pointer to its centre;
2. reads `getComputedStyle(el).cursor` and requires the interaction's cursor, never `auto` or `default`;
3. screenshots the element's box and a ring round it before and after: the box changes by a floor, the ring does not;
4. moves away and requires the box back to rest.
Plant the faults so it is seen red: remove the hover style from one component, remove its cursor, leave one clickable `div` bare.

## Declare it
`layout.json`: `"gates": { "hover": "<the command>" }` (for example `npm run test:hover`). `doctor` is red while the web app has code and no gate is declared, or the command names a file that is not there. `"hover": "none: <reason>"` declines with its reason.

## Worked example
Stellix (a drawn window, not a page): `tools/gates/hover_gate.sh`, `lib/app/gates/editor_hoverwalk_read.h`, `tools/gates/hover_judge.py`. The same five steps, with the page's pointer in place of the window's.
