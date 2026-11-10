---
# concepts: dsp, tests, bench
paths:
  - "placeholder"
---

# Every optimisation and refactor of DSP is proven by a null test

<constraints>
Always do:
- Before changing DSP code for speed or structure, save reference renders (golden files) of fixed test patches: notes, sweeps, every row of the matrix moving.
- After the change, render again and require a bit-identical result. If an exact match is impossible, report the maximum difference in dBFS and accept it only below a stated threshold (house choice: ≤ −120 dBFS for a pure refactor).
- Build DSP blocks so they don't depend on the parameter tree: they take a plain parameter struct, so the same sources compile into the plugin, the test executable and the Release benchmark target.
- Keep a "sound revision" string that changes only when the sound changes, separate from the state schema version. A changed sound gets new golden files *on purpose*, logged in the bugs/changes file.

Never do:
- Call a change "faster" or "the same sound" without both a benchmark and a null test.
- Regenerate golden files to make a failing null test pass, unless the sound change was intended and is logged.
</constraints>

## Check
- A CTest render-diff test compares against the golden files.
- `.claude/checks/dsp-without-apvts.json` blocks DSP folders from reaching into the parameter tree.
