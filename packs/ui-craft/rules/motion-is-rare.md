---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# Motion is rare, interruptible and optional

<constraints>
Always do:
- Honour `prefers-reduced-motion`: a reduced variant, or none.
- Animate `transform` and `opacity` only, and list the properties in a transition.
- Let input interrupt any animation.
- Spend motion on one moment: a single page-load sequence or one reveal lands better than an effect on every section. Decelerate smoothly.
- Give anything that moves on its own for over 5 seconds a pause, stop or hide control.
- Ask first: how often is it seen (hundreds of times: no animation), and what is it for? "It looks nice" is valid only for one signature moment.
- Use ease-out for what enters or leaves, ease-in-out between two places, linear for scroll-linked motion. Never ease-in: the first frames barely move.
- Time it: press 100-160ms, hover 150-200ms, menus 150-250ms, dialogs 250-450ms, reveals 500-900ms. Leaving takes about 70% of arriving.
- Reduce motion to fewer and gentler, not none: keep opacity and colour, drop travel, scale, parallax and autoplay.
- Paint the headline, the sentence and the picture on the first frame. Vary entrances with the content, in reading order, and fire them once.
- Pause loops when off screen or when the tab is hidden.

Never do:
- `transition: all` (`ui-no-transition-all`).
- Bounce or elastic easing (`ui-no-bounce-easing`).
- Fade-and-slide every section in, loop a marquee, or pulse a status dot for decoration.
- Hide content until an animation reveals it: the text must be there at rest.
- Animate layout properties (`ui-no-animate-layout`): width, height, top, left, margin and padding force layout on every frame.
- Capture the wheel or lock scrolling (`ui-no-scroll-hijack`). No preloader, no counter, no gate.
- Move anything across text being read.
</constraints>
