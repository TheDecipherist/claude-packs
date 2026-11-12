---
# concepts: markup, styles
paths:
  - "placeholder"
---

# Accessibility is built in with the right element, never bolted on

Most of it costs nothing if the right element is used from the start. The defaults that break screen readers and keyboards (clickable divs, missing labels, removed focus rings) are expensive to retrofit.

<constraints>
Always do:
- The native element: `<button>` for actions, `<a href>` for navigation, `<nav>`, `<ul>`, `<label>`, `<input>`, `<dialog>` with `showModal()`. ARIA only when no native element does the job; bad ARIA is worse than none.
- An accessible name on every interactive thing: descriptive `alt` (or `alt=""` for decorative, never omitted: that reads the filename); a real `<label>` tied to each field (a placeholder is not a label); `aria-label` on icon-only buttons.
- Keyboard: `:focus-visible` styles that replace, never remove, the focus ring; focus moved to the new view's heading on route change and into a modal on open.
- Structure: one `<h1>`, then `<h2>`/`<h3>` in order (never skipped for size); landmarks `<header>`, `<nav>`, one `<main>`, `<footer>`, a skip-to-content link; `<section>` only with a heading.
- Contrast 4.5:1 (3:1 large text), meaning never by colour alone, zoom never disabled, `prefers-reduced-motion` respected, dynamic changes announced with `aria-live`.
- Vendor stylesheets (editors, pickers, charts): force `svg, svg * { fill: currentColor; stroke: currentColor }` inside the wrapper, and verify the surface **rendered, in both colour schemes**: the colour is in node_modules, not in your markup.
- Contrast is verified rendered (both schemes) by a Playwright check, never by grepping colour classes: a grep passes cleanly in exactly the failing case.

Never do:
- `<div onClick>` / `<span onClick>` (`a11y-no-clickable-div`): not focusable, no Enter/Space, announced as nothing.
- `tabindex` above 0 (`a11y-no-positive-tabindex`): it hijacks the tab order.
- `outline: none` or `outline: 0` (`a11y-no-bare-outline-none`) without a `:focus-visible` replacement in the same rule.
- `<img>` without `alt` (`a11y-img-needs-alt`).
</constraints>

## Check
Lesson checks for this rule: `a11y-img-needs-alt`, `a11y-no-bare-outline-none`, `a11y-no-clickable-div`, `a11y-no-positive-tabindex`, `key-from-index`.
