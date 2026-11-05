---
paths:
  - "**/*"
---

# Every refusal is judged: right or wrong, with why

A project cannot tell which hooks earn their place from what people complained about. Bug logs recorded a handful of one hook's false refusals; it had refused 89 times.

<constraints>
Always do:
- Mark a refusal you met, once you know: `npx --no-install @thedecipherist/claude-packs logs mark <id> right|wrong "<why>"`. `logs refusals --open` lists them.
- Mark it wrong when correct work was refused, and report the hook.
- Read `logs` before changing or retiring a hook.

Never do:
- Delete or edit a log. Logs rotate, and `.claude/logs/` keeps them all.
- Mark a refusal right or wrong without reading what it refused.
</constraints>
