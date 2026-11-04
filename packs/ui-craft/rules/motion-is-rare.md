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

Never do:
- `transition: all` (`ui-no-transition-all`).
- Bounce or elastic easing (`ui-no-bounce-easing`).
- Fade-and-slide every section in, loop a marquee, or pulse a status dot for decoration.
- Hide content until an animation reveals it: the text must be there at rest.
</constraints>
