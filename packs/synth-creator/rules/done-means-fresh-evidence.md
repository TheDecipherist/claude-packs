---
# concepts: tests, build
paths:
  - "placeholder"
---

# "Done" means evidence from this turn

<constraints>
Always do:
- Before saying done, fixed, passing, faster or "sounds the same", run the command that proves it in this turn and quote its verdict: test-verdict JSON, null-test result in dBFS, benchmark p99, golden-image score.
- Say exactly what was not verified, and why ("not run on Windows", "listened only, not measured").
- Treat a subagent's report as a claim. Check its diff and re-run its verdict before passing it on.

Never do:
- Report success from memory of an earlier run, from a build that only compiled, or from "should work".
- Report a partial pass as a pass.
</constraints>
