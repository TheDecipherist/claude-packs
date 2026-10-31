---
# concepts: params
paths:
  - "placeholder"
---

# Parameter and control IDs never change once assigned

<constraints>
Always do:
- Give every parameter a `juce::ParameterID { "id", versionHint }`. A newly added parameter gets the current version hint.
- Store and recall everything by ID, never by position or index, so lists can be reordered or sorted without breaking patches.
- When a control's meaning changes, add a new ID and migrate old patches in `setStateInformation`. The old ID stays readable.

Never do:
- Rename, reuse or delete an existing ID. Saved patches, host automation and every preset bank refer to it.
</constraints>

## Check
`.claude/hooks/param-id-lock.mjs` (PostToolUse) collects every parameter ID in the repo and compares it with `.claude/param-ids.lock.json`. A locked ID that disappeared fails the edit with the list of missing IDs. New IDs are added to the lock automatically. Run `node .claude/hooks/param-id-lock.mjs --init` once per repo to create the lock. It reads `juce::ParameterID` and `AudioParameter*` declarations in C++ by default. If control IDs also live in `panel.json`, add `.claude/param-ids.config.json` with `"extensions"` and `"patterns"` (regexes with one capture group) to cover them.
