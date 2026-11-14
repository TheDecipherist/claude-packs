---
name: audit-the-panel
description: Use when a panel is built or rebuilt and every control must be accounted for, or before a panel is called complete, or when a page looks finished but some controls may do nothing.
---

# Audit the panel (one job: every control of a panel accounted for in one table)

A panel looks complete long before it is: buttons with no handler, ids that name no parameter, a page range that disagrees with the real data. One table makes each gap a line.

<constraints>
Always do:
1. List every control of the panel as one row, and give each a status: real (it reaches the sound), an honest stub, or deferred by a decision (name it).
2. Resolve every parameter id a control references against the parameter layout; an id that resolves to nothing is a row marked red.
3. Give every button a handler: find each button and show what its press calls.
4. For each page backed by a stored byte, compare the page's range with the corpus minimum and maximum of that byte.
5. Render the panel with each menu open, and read each render.
6. Label a stub on the panel as a stub, in the table and on screen.

Never do:
- Draw a stub so it looks like it works.
- Mark a control real without its handler and id resolved.
</constraints>

Report: the table, with the open rows listed first.
