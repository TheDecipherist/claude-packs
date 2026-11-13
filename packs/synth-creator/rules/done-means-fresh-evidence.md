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
- Call a visible change done only when the binary the user will launch holds it: build, open it, and look (the `can-the-user-open-it` skill). A picture of the spec is no evidence.
- After a change to a shared package, name every unit that links it and rebuild each one: until then the change reaches nobody.
- When the change is written and committed but not in a binary the user can open, say so: "written and committed; not in a binary the user can open yet".
- Make a probe delete its output before it runs, and fail when the file is not new.

Never do:
- Report success from memory of an earlier run, from a build that only compiled, or from "should work".
- Report a partial pass as a pass.
</constraints>
