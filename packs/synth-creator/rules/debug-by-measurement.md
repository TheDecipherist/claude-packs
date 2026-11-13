---
# concepts: cpp, tests
paths:
  - "placeholder"
---

# Debug by measuring, one hypothesis at a time

<constraints>
Always do:
- Reproduce first, then measure: render the case offline, read the numbers (`measure-tone`, a probe, a sanitizer, a log), and only then form a cause.
- State one falsifiable hypothesis ("the click is the filter state reset at voice steal, because the click lines up with sample N of the steal") and test it with one change.
- Treat "the host is wrong", "it's JUCE", "it's the driver" as a hypothesis to disprove with a minimal probe, never as the answer. Assume our code is wrong until a probe proves otherwise.
- When the offender does not move as a constant is swept, the measure is wrong: fix the measure before the code.
- Dump the worst failures, name the shape of each, and put a gate on each shape.
- Bisect the baseline (the last good build) before accusing the host. A third correction on one control means go back to what the control should do.
- After three fixes that didn't work, stop changing code. Report what was tried, what each measurement showed, and whether the design itself is the problem.

Never do:
- Change several things at once, then listen.
- Tweak constants until it "sounds right" without a measurement before and after.
- Start a fourth fix attempt on the same symptom without telling the user.
</constraints>
