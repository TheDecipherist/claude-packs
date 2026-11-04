---
name: design-review
description: Use when a screen, component, mockup or stylesheet is ready for feedback, when a build reaches its verification phase with a browser surface, or when asked to critique layout, typography, colour, contrast or UX. Reviews rendered screenshots, never markup alone.
---

# design-review

One thing: judge the rendered UI, with cited findings, against the `## Design Direction` and the accessibility floors.

<constraints>
Always do:
- Review **screenshots of the running product**, both colour schemes, at phone width and desktop (Playwright, `deviceScaleFactor: 2`). Reading markup proves nothing about colour, contrast or layout; the colour may live in node_modules.
- Cite, never assert: a claim about user behaviour or a contrast failure points to a measurable standard (WCAG AA 4.5:1 body, 3:1 large) or a source; otherwise mark it as opinion.
- Accessibility is pass/fail: contrast; a visible focus state on every interactive element; `cursor: pointer` on every clickable thing and on nothing inert; icon-only buttons labelled; real `<label>`s; reduced motion respected; nothing by colour alone.
- Hierarchy: the most important thing is the most prominent; structure for the scan, not the close read; spacing groups what belongs together.
- Consistency: components and tokens reused before anything new; a one-off that duplicates a primitive is a finding; hardcoded colours or spacing are findings.
- Distinctive over default: name the templated patterns (purple gradient, Inter everywhere, a card for everything, centred everything) as findings, not taste notes; usability beats trend when a fashionable pattern costs the user.
- A surface with zero styling classes, or a list with no designed empty state, is an automatic **blocker**.
- Compare against `design/` reference images when they exist.

Never do:
- Pass a surface from the DOM or the diff.
- Soften a contrast or focus failure into a suggestion.
</constraints>

Output: findings grouped blocker / major / minor, each with the screenshot it was seen in, the standard or source, and the one change that fixes it; then the three things that are working and must not be lost in the fix.
