---
# concepts: cpp, js, python, tooling, tests
paths:
  - "placeholder"
---

# A fix to a detector is gated against the opposite fault too

A detector fixed for one fault drifts into the other: an onset made earlier starts to clip the attack, and one made stricter starts to fire late. A gate that watches only the fault just fixed passes the new one.

<constraints>
Always do:
- Give every fix to a detector a gate for each direction of the fault: late and clipped, early and missed, too loud and too quiet.
- Measure the finished audio, not the law that produced it. Use a peak over the first millisecond for "loud enough", and an RMS over a window after the transition for "did it stop".
- Write each window in the gate's own comment, so a later change to the window is a visible change to the claim.

Never do:
- Close a fix on the one gate that failed.
- Measure a window that spans the transition: it measures the transition.
</constraints>
