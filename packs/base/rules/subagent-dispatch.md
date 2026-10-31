---
# concepts: claude
paths:
  - "placeholder"
---

# Dispatching subagents: name the model, pass files, demand a status

<constraints>
Always do:
- Set `model` on every agent and dispatch. An omitted model inherits the session's most expensive one.
- Hand work over as files: the brief, the diff and the report path. Don't paste them into the prompt.
- Require the agent to end with exactly one status line, `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`, plus the path of its report.
- Give read-only agents read-only tools, and give writing agents the exact list of files they may write.
- Review an agent's work as unverified claims: read the diff, re-run the verdict. A stated reason never lowers a finding's severity.

Never do:
- Let a worker agent spawn its own reviewer. It doubles the cost and its approval counts for nothing.
- Start an agent for something one script call or one Read can answer.
</constraints>
