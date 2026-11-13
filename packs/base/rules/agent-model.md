---
# hook: agent-model.mjs
---
# Every agent names its model, and Opus names its reason

An agent spawned with no `model` inherits the session's most expensive one, and the bill follows. Sonnet is the default, Haiku is for lookups, Opus is for the few jobs that need it.

<constraints>
Always do:
- Set `model` on every agent call: `sonnet` by default, `haiku` for a lookup.
- Name Opus only with a line `OPUS BECAUSE: <reason>` in the prompt, the reason one of the project's list (`guards.agentModel.opusReasons` in `.claude/layout.json`; the default list is architecture decision, hard debugging, security review, ambiguous spec, cross-file refactor).

Never do:
- Spawn an agent with no `model`. A fork and an agent type whose own definition sets `model:` are the two exceptions.
- Name Opus because the work feels important: the reason is one of the list.
</constraints>

## Check
`agent-model` (opt-in: name it in `layout.json` `enable`) refuses the spawn; `agent-ledger` logs every agent's model, brief and cost in `.claude/logs/agents.jsonl`.
