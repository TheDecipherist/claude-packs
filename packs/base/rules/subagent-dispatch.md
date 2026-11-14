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
- Pass the instance under test as a parameter: behaviour is proved once on the template, and the generated gate proves the instances are that template (`prove-instances-identical`).
- Quote the `design/shape.json` row of every concept the brief touches, word for word: its shape,
  its generator, its selectors and constants. Name the shape and the generator; an instance appears only on a `seen in:` or
  `example:` line (`brief-guard` refuses any other, KWB-1).
- Choose the model by the work: Sonnet by default, Haiku only for lookups, Opus only as the `agent-model` rule says.
- Partition agents by file, and partition by repo where the work allows. A change in the tree that the agent did not make is another agent's work: leave it.
- Take baseline pass counts before agents touch shared code, so a later red test is told from an old one.
- Ask the agent for its time estimate first. When one goes silent, send it its next step. Keep the queue balanced, so no agent waits behind another.
- Pull before every commit and every push, and retry on rejection, never forcing.
- Run the other agents' tests in the agent's own build.
- For a batch of research agents, give one item per run, a search budget (about five searches), and a give-up-and-record row per item; keep partial work and create no empty folders.
- Tell every agent to stop and report a bug found on the way (a red test it did not plant, a wrong number, a crash): what, how to reproduce, the evidence, and no workaround, retry or carrying on. The controller logs and fixes it, then tells the agent to go on. Put that in every brief's "When to stop" line.
- To pause an agent, stop it, commit and push its worktree (tracked and new files) and note where it stopped; resume by a message saying what changed on the trunk.
- Write into the brief file exactly the excerpts the job needs (the step's line, the bug's row, the laws, the spec section), and never tell an agent to read a whole log or spec.
- End every brief with a FILES list (paths or patterns, one a line): an agent reports a read off the list, and past 10 off-list files stops and asks (files it creates, build folders and /tmp do not count).
- Have the agent restate its estimate and what each part does at the start of each part, treat 1.5x the estimate and 5 minutes over as an alarm, and read `agent-ledger`'s estimates against actuals to tell the agent whether its estimates run long or short.

Never do:
- Let a worker agent spawn its own reviewer. It doubles the cost and its approval counts for nothing.
- Start an agent for something one script call or one Read can answer.
- Never name a fixed instance in a brief ("drive slot 2", "the PAD slot"): a brief that names one instance gets work proved on that
  instance only (one build's B-178: every step proved on slot 2, the other three slots left behind).
- Run two agents that each take the next number from one counter (two ports each taking the next id).
</constraints>
