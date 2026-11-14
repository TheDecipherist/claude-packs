---
# concepts: params, presets
paths:
  - "placeholder"
---

# At the first release, what a saved patch or a song depends on is locked, and only additions pass

A patch and a DAW song store each parameter as a normalised 0..1 value beside its ID. Change a range, a step count, a skew or the order of a choice list and the same stored value means a different sound; renumber a factory program and a host's program list points at the wrong patch. Before the first release nobody has stored anything, so everything may change.

<constraints>
Always do:
- Run `node .claude/hooks/release-lock.mjs --release` before tagging the first release, and again at each later release. It writes `.claude/release.lock.json` (every parameter's kind, range, step and skew, each choice list in order, the patch format, the factory bank's program numbers) and the id lock `.claude/param-ids.lock.json`. Commit both.
- Append: a new parameter, a new choice at the end of a list, a new program at the next number. They pass, and the next release locks them.
- Say where the patch format and the factory bank are read in `.claude/release-lock.config.json` when the defaults do not fit: `patchFormat` (regexes with one group: a version constant, a field list) and `programs` (`file`, and the `number` and `name` columns; default `data/factory.csv`).
- Give a control whose meaning must change a NEW parameter, and migrate old patches on load (`parameter-ids-never-change`).
- Give an appended parameter a default that leaves every released patch rendering bit-identically, and prove it by rendering the factory bank before and after.

Never do:
- Change a released parameter's range, step count, skew or kind, insert, move or remove a choice, change the patch format, or renumber or remove a program.
- Lock the parameter ORDER: JUCE's VST3 wrapper makes each ParamID from a hash of the string id, so a parameter that moves in the list breaks nothing.
</constraints>

## Check
`.claude/hooks/release-lock.mjs` (PostToolUse) refuses a write that changes a locked fact after the release, naming the first one; with no lock file it judges nothing. `--status` says when a `v*` tag exists and the release step was never run. `param-id-lock` holds the ids against the same release.
