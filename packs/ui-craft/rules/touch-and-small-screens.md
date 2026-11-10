---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# Touch, zoom and small screens are not an afterthought

<constraints>
Always do:
- Make touch targets at least 24 by 24 CSS pixels (WCAG 2.2), and about 44 for a primary action.
- Give drag, swipe and pinch a tap and a keyboard alternative.
- Use `env(safe-area-inset-*)` on full-bleed layouts, `overscroll-behavior: contain` in modals and drawers, and `touch-action: manipulation` on controls.
- Set `color-scheme` and a matching `theme-color`, so scrollbars and inputs follow a dark theme.

Never do:
- Disable zoom (`ui-no-zoom-lock`).
- `autoFocus` on a phone: it opens the keyboard over the page.
</constraints>
