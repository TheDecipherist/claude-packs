---
# concepts: claude
paths:
  - ".claude/skills/**"
  - "**/.claude/skills/**"
  - ".claude/agents/**"
  - ".claude/rules/**"
---

# Skills, rules and agents: one job, triggers in the description, short

<constraints>
Always do:
- One job per skill, so its use can be counted and an unused one retired.
- Start the description with "Use when", and list only the situations that trigger it.
- Keep SKILL.md under 8,000 characters. After compaction, Claude Code re-attaches an invoked skill cut at 20,000, and anything past the cut is gone.
- Put long references in files the step itself re-reads at the moment it needs them.
- Make anything a regex or a script can check into a hook or lesson check, not a sentence.
- Write a rule that runs only when its condition applies (a path, a changed file type, a flag). A lesson from one failure must not become a step every task pays for.
- Before trusting a new skill, run it once without the skill and once with it (`pressure-test-skill`).

Never do:
- Summarize the skill's steps in its description. Claude follows the summary and skips the body, and the usage count lies.
- Write a router skill that loads every mode.
- Ask Claude to update status bars, logs or checklists by hand inside a loop. A hook can see every tool call for free; each manual call is a full turn.
</constraints>
