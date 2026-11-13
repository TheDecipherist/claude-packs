---
# concepts: markup, styles
paths:
  - "placeholder"
---

# Styles live in stylesheets, mobile-first, and every clickable thing shows a pointer

<constraints>
Always do:
- CSS in `.css` files (or CSS Modules / Tailwind utilities), linked and cached. Runtime values go in as a custom property (`style="--progress: 73%"`) consumed by the stylesheet; only the value is inline.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` on every document that is not Next's app router (which emits it); `html { -webkit-text-size-adjust: 100% }`.
- Mobile-first: base styles small, `@media (min-width: …)` to enhance up. `box-sizing: border-box` globally.
- `min-width: 0` on flex and grid children (the fix for most mysterious horizontal scroll). `pre { overflow-x: auto; max-width: 100% }`, prose `overflow-wrap: break-word`.
- Fluid type with `clamp()`; `max-width`, `%` or `min(800px, 100%)` instead of fixed pixel widths; `width: 100%` never `100vw` (it includes the scrollbar); `img, video, svg { max-width: 100%; height: auto }` with intrinsic `width`/`height` on every `<img>`.
- iOS: `overscroll-behavior: contain` on scroll regions, `100dvh` not `100vh`, `font-size: 16px` on inputs (no focus zoom), pinch-zoom never disabled.
- `cursor: pointer` on everything clickable, in the base stylesheet: `button, [role="button"], [role="link"], [onclick] { cursor: pointer }`, `button:disabled { cursor: not-allowed }`. Buttons do not get it from the browser. The inverse holds: pointer on something inert is a lie.
- Take every `z-index` from one named scale; put a noise or grain overlay on a fixed layer with `pointer-events: none`, never on scrolling content.

Never do:
- `style="…"` attributes or large `style={{…}}` objects in markup (`css-no-inline-style`): they cannot be responsive, hover or animate, and start a specificity war. A single `<style>` block is fine only in a single-file deliverable; email HTML is the one case that requires inline.
- `100vw` (`rcss-no-100vw`); `width`/`min-width` of 500px or more (`rcss-no-fixed-wide-width`).
- A CSS reset that sets `button { cursor: default }` (several popular ones do).
</constraints>

## Check
Lesson checks for this rule: `css-no-inline-style`, `rcss-button-cursor`, `rcss-no-100vw`, `rcss-no-fixed-wide-width`, `rcss-viewport-meta`.
