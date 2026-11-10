---
name: prove-hidden-is-idle
description: Use when a layer, a pop-up, a settings page or a full-panel page opens over a panel, when the panel's CPU use is high while it looks still, or when proving `hidden-under-a-layer-is-idle`.
---

# Prove what a layer hides is idle (one job: every opaque layer leaves 0 paints and 0 ticks beneath it)

The law is `hidden-under-a-layer-is-idle`. A layer is any page that sits over the panel and closes back to it; in a project with a route table, its pulldowns and windows (`menu-is-one-route-table`) are the list to walk.

<constraints>
Always do:
1. Count, in one place the views share: each view's paints, each timer's ticks, each animation's frames, by view. In JUCE, one counter the views' base class bumps in `paint` and the timer base bumps in `timerCallback`; in a browser, a wrapper round `requestAnimationFrame` and a `PerformanceObserver` or paint counter per subtree. Test builds only.
2. Walk every layer, from the route table or the project's list of them: open it through the real input path, wait for its opening motion to end, then count for one second.
3. Require 0 paints and 0 ticks from every view the layer covers fully. Work out "covered" from the real rectangles after layout and the layer's opacity, never from a list written by hand.
4. Require what shows through a translucent layer to keep drawing, at its own rate, and nothing it fully hides.
5. Close the layer, and require each view beneath to paint once within a frame at its current values, then resume its own rate.
6. Require the model to have run meanwhile: a meter's value, an LFO's phase or a playing note moved on while its picture was hidden.
7. Plant the fault and see it red: one covered meter whose timer is left running must fail step 3 by name.
8. Walk one layer of each template, not every instance of one (`test-the-template-once`), and keep the counts in the gate's output.

Never do:
- Call a view idle because it is not visible: count its paints and ticks.
- Count only paints: a timer or a ticking animation that paints nothing still spends the CPU.
- Measure while the layer's opening animation runs, or call a stale page after close a pass.
</constraints>
