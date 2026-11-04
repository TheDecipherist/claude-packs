---
# concepts: cpp, tests
paths:
  - "placeholder"
---

# Gates, probes and tests share one reader: find, press, drag and read are written once

Measured on a real C++ repo: the same find, press, drag and read lambdas were written at the top of five gates, and the same render loop and WAV writer in a dozen probes. A fix to one reached none of the others.

<constraints>
Always do:
- Keep one harness header for the project's gates and probes: finding a control by its ID, pressing, dragging, reading a value, rendering, writing a file.
- Start a new gate from the harness: it holds only what this gate measures.
- Move a helper into the harness the second time it is needed, and take the first copy out in the same change.
- Walk one control of each template. Prove the rest with a read of the table (`test-the-template-once`).

Never do:
- Open a gate with its own lambdas for what the harness does.
- Copy a gate to start the next one.
- Press, drag or render every instance of one template in a loop: `one-walk-per-template` refuses it.
</constraints>
