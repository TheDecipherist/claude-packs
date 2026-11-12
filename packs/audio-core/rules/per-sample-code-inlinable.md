---
# concepts: dsp, audio
paths:
  - "placeholder"
---

# Per-sample code can be inlined: no virtual calls per sample

<constraints>
Always do:
- Dispatch by type once per block (or once per voice per block), then run a tight, non-virtual per-sample loop. Oscillator type, filter mode and effect choice are switched at block level.
- Use templates, `final` classes, or a `switch` over a small enum hoisted outside the sample loop when one interface has several implementations.
- Keep per-voice state contiguous (struct-of-arrays or one array of voice structs), not pointers to separately allocated objects.

Never do:
- Call a `virtual` function, a `std::function`, or through a function pointer inside the per-sample loop of 96 voices.
- Use `-march=native` in a build you ship. Users' CPUs differ from yours. (`.claude/checks/no-march-native.json` blocks it.)
</constraints>

## Check
- The benchmark from `cpu-worst-case-per-block.md` shows the gain when the loop is restructured; keep the faster version only if its null test passes.
- Manual review: grep the per-sample loops for `->` calls on interface pointers.
Lesson check for this rule: `no-march-native`.
