---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# Render the widest and narrowest machine, at opening size

<constraints>
Always do:
- Render the widest and narrowest machine, at opening width, on both axes, against a declared minimum display.
- Give each parameter exactly one page.
- Build a reproduction with its own sections, fractional positions, control types and labels, drawn your own way, unless `"guards": { "instrument": { "artwork": "verbatim" } }` says the brief asks for the machine's own look.
- Use pages only on machines designed with them.
- Render the page-select and hit regions from the first frame: a page select carries an off-default mark, and every hit region is live at once.
- Walk the overflow check over every row container, and render art at 75 and 200 per cent.
- When a panel scrolls sideways, check its design width against the minimum display first: a design wider than the display cannot show whole at any height.

Never do:
- Copy the artwork without that setting.
</constraints>
