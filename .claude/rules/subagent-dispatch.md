---
# concepts: claude
paths:
  - ".claude/skills/**"
  - "**/.claude/skills/**"
  - ".claude/agents/**"
  - ".claude/rules/**"
---

# Dispatching subagents: name the model, pass files, demand a status

<constraints>
Always do:
- Set `model` on every agent and dispatch. An omitted model inherits the session's most expensive one.
- Hand work over as files: the brief, the diff and the report path. Don't paste them into the prompt.
- Require the agent to end with exactly one status line, `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`, plus the path of its report.
- Give read-only agents read-only tools, and give writing agents the exact list of files they may write.
- Review an agent's work as unverified claims: read the diff, re-run the verdict. A stated reason never lowers a finding's severity.
- Pass the instance under test as a parameter: behaviour is proved once on the template, and the generated gate proves the instances are that template (`prove-instances-identical`).
- Quote the `design/shape.json` row of every concept the brief touches, word for word: its shape,
  its generator, its selectors and constants. Name the shape and the generator; an instance appears only on a `seen in:` or
  `example:` line (`brief-guard` refuses any other, KWB-1).
- Choose the model by the work: Sonnet by default, Haiku only for lookups, Opus only with a stated `OPUS BECAUSE:` reason in the brief.
- Partition agents by file. Pull before committing; a change in the tree that you did not make is another agent's work: leave it.
- Take baseline pass counts before agents touch shared code, so a later red test is told from an old one.
- Ask the agent for its time estimate first. When one goes silent, send it its next step. Keep the queue balanced, so no agent waits behind another.

Never do:
- Let a worker agent spawn its own reviewer. It doubles the cost and its approval counts for nothing.
- Start an agent for something one script call or one Read can answer.
- Never name a fixed instance in a brief ("drive slot 2", "the PAD slot"): a brief that names one instance gets work proved on that
  instance only (one build's B-178: every step proved on slot 2, the other three slots left behind).
</constraints>
