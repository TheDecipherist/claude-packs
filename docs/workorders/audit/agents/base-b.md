# base-b report (W2, 2 items)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U73 | new | base `hooks/agent-model.mts`, `rules/agent-model.md` | refuse an agent spawn with no model, and Opus with no listed reason | `test/hooks/base/agent-model.test.mts`, selftest |
| U74 | new | base `hooks/agent-ledger.mts` | log every agent's model, brief, run time and tokens | `test/hooks/base/agent-ledger.test.mts`, selftest |

Choices: agent-model is opt-in (`optIn` `hooks/agent-model.mjs`; name it in `layout.json` `enable`); agent-ledger is not (it refuses nothing). Reasons list: `guards.agentModel.opusReasons`, default architecture decision, hard debugging, security review, ambiguous spec, cross-file refactor; a reason matches by prefix. The ledger writes `spawn` (PreToolUse), `finish` (SubagentStop) and `usage` (PostToolUse of a foreground agent: tokens and run time come only from tool_response `totalTokens`, `totalDurationMs`, `resolvedModel`; documented as the final request only). SubagentStop's own fields were not confirmed in the docs read (agent_id, agent_type, last_assistant_message are used).
Red proof: with the judge disabled the agent-model selftest fails four rows; with the append disabled the ledger selftest fails four rows.
Rule `agent-model.md` is `# hook:` bound: held with the hook, loads everywhere.
For the lead: README's base hook table needs the two hand-written cells (added in my worktree, not committed): agent-model | Agent | Opt-in. Refuses an agent spawn that names no model, and Opus with no listed `OPUS BECAUSE:` reason; a fork and an agent type with its own model pass. agent-ledger | Agent, SubagentStop | Logs every agent's model, brief, run time and tokens in `.claude/logs/agents.jsonl`; refuses nothing. Without them `counts.test` is red after the merge.
Faults: none refused.
