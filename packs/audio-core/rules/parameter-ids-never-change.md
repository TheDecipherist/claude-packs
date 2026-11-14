---
# concepts: params
paths:
  - "placeholder"
---

# Parameter and control IDs never change once assigned

<constraints>
Always do:
- Give every parameter a `juce::ParameterID { "id", versionHint }`. A newly added parameter gets the current version hint.
- Store and recall everything by ID, never by position or index, so lists can be reordered or sorted without breaking patches. The parameter order is not locked: JUCE's VST3 wrapper hashes each ParamID from its string id.
- When a control's meaning changes, add a new ID and migrate old patches in `setStateInformation`. The old ID stays readable.
- Lock the ids of bound panel controls too, with a hand-moved `retired` list: a control id leaves the lock only when a person moves it there.
- Let the first instance of a shared mechanism keep every old id: a mechanism made shared (one control piece, one module) maps its first user's ids unchanged, and takes a prefix or a map for the new ones.
- Reach a module's parameters through a generated per-instance field table, never `base + offset`, so a parameter added after the freeze breaks no address; test that each table row names the id it should.
- When a stored byte is wider than its frozen parameter, keep the full range reachable through the patch byte and the inspector, append a parameter only when someone wants to automate it, and keep the old one as a documented alias of the low values.
- At plan time list every flag a new choice entry would duplicate, and fold each into the one choice: a bool that restates a choice is a second control over one value.

Never do:
- Rename, reuse or delete a released ID. Saved patches, host automation and every preset bank refer to it.
- Change a released parameter's range, step count, scaling or a choice list's members other than by appending. The host stores a normalised 0..1 value, so the same stored value would mean another sound (`release-lock` holds these).
- Put a second control over one byte or one parameter: two controls that write the same value fight over it.
</constraints>

## Check
`.claude/hooks/param-id-lock.mjs` (PostToolUse) collects every parameter ID in the repo and compares it with `.claude/param-ids.lock.json`, which starts at the first release (`node .claude/hooks/release-lock.mjs --release`, or `param-id-lock.mjs --init` for the ids alone), not at the first sighting: before it an id may be renamed or dropped. A locked ID that disappeared fails the edit with the list of missing IDs. New IDs join the lock at the next release. It reads `juce::ParameterID` and `AudioParameter*` declarations in C++ by default. If control IDs also live in `panel.json`, add `.claude/param-ids.config.json` with `"extensions"` and `"patterns"` (regexes with one capture group) to cover them. The rest of what a release freezes is `release-lock`'s.
