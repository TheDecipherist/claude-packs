# base-c, W2: the usage logs

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| L1 skill-log | new | base, `hooks/skill-log.mts` (+ `hooks/lib/usage-log.mts`) | one line per skill used (Skill tool, or a `/name` prompt naming an installed skill) in `.claude/logs/skills.jsonl`: t, session, branch, skill, via | `test/hooks/base/usage-log-hooks.test.mts`, `test/integration/usage-logs.test.mts` |
| L2 rule-log | new | base, `hooks/rule-log.mts` | one line per `.claude/rules/*.md` loaded, in `.claude/logs/rules.jsonl`: t, session, branch, rule, file, why, globs, trigger | same |
| logs report | extend | `lib/logs-usage.mts`, `lib/logs.mts`, `prompts/help.txt` | `logs skills` and `logs rules`: uses per installed one, rotated files too, and the never-used list | `test/integration/usage-logs.test.mts` |

## What the docs say (InstructionsLoaded)
Read at code.claude.com/docs/en/hooks.md. The event fires when a CLAUDE.md or `.claude/rules/*.md` is loaded, at session start and lazily. Payload: `file_path`, `memory_type`, `load_reason` (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`), `globs` (only for `path_glob_match`), `trigger_file_path`, `parent_file_path`. No matcher needed, exit code ignored. The docs name `path_glob_match` and `globs` as the `paths:` frontmatter case, so a path-scoped rule is logged when its glob matches; this was not run against a live Claude Code here (the proof is scripted payloads). Not measurable: a rule that never loads leaves no line, so "never loaded" also covers a rule whose paths never matched.

## Notes for the lead
- Both hooks are on the contract (`hook`, `runAsHook`, selftest through `runHook`, `worktreeCase`); the selftest was seen red with the write removed. They write to the main checkout's log (`ctx.projectDir`). Registered: skill-log on PostToolUse matcher `Skill` and on UserPromptSubmit; rule-log on a new `InstructionsLoaded` event (type added to `HookEventName`).
- Worktree cases are in `test/integration/worktrees.test.mts` (base hooks live there; `worktree-cases-packs.mts` is for other packs).
- README: the base-hooks table needs a hand-written cell per hook or counts fails. I added the two rows locally, not committed: `skill-log | Skill call, prompt | Writes one line per skill used to .claude/logs/skills.jsonl, for logs skills; refuses nothing` and `rule-log | Rule loaded | Writes one line per rule file loaded into the context to .claude/logs/rules.jsonl, for logs rules; refuses nothing`. Regenerate after merging; `counts.mts` fails until those rows are in README.
- `lib/logs.mts` now exports `readJsonl` (the rotated-file reader `jsonlRecords` uses); `logs-usage.mts` and `logs.mts` import each other (functions only, used at call time).
- Tests green: usage-logs, usage-log-hooks, unit logs, repo-lint, counts, worktrees (49 pass).
- Faults: none refused. One hook note (the shell write to `lib/logs.mts` was unreadable by the content hooks); the file was written via a script, not to evade a refusal.
