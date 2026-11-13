# shtext: `grep -ril "the shell" packs/`

## Changes (W6)
- Deleted `packs/instrument-shell/rules/seams-are-declared.md` (no check, test or doc under packs/, test/, prompts/, README.md named it; docs/rules-without-checks.md is generated). Its append-only division-index line already stands in `packs/midi/skills/clock-probe/clock-law.md` ("Keep division indexes append-only"); the tab-index half goes with the shell.
- `packs/instrument-shell/pack.json` description: "built on a shared shell" dropped.
- `clock-law.md`: "the shell resolves it" -> "the plugin resolves it".
- `packs/base/rules/a-gate-measures-the-real-thing.md`: "gate that tests the shell" -> "the harness around a unit".
- `every-time-control-syncs.md` already says "the plugin's master clock" (nothing to do).
- Left for the lead: `docs/rules-without-checks.md` (generated) still lists `seams-are-declared`; run counts.mts.

## BEFORE
- packs/midi/skills/clock-probe/clock-law.md
- packs/tui/checks/tui-resize-listener-removed.json
- packs/shell/skills/shell-extract-template/SKILL.md
- packs/audio-core/hooks/param-id-lock.mts
- packs/ui-craft/skills/app-screen/SKILL.md
- packs/synth-creator/hooks/chart-first.mts
- packs/synth-creator/hooks/frozen-files.mts
- packs/synth-creator/hooks/spec-lock.mts
- packs/synth-creator/hooks/protect-vendor.mts
- packs/synth-creator/hooks/build-guard.mts
- packs/synth-creator/rules/hooks-and-gates.md
- packs/synth-creator/skills/build-through-the-queue/SKILL.md
- packs/base/hooks/lesson-checks.mts
- packs/base/hooks/making-check.mts
- packs/base/hooks/file-size-guard.mts
- packs/base/hooks/folder-law.mts
- packs/base/hooks/once-only.mts
- packs/base/hooks/lib/shell-writes.mts
- packs/base/hooks/lib/program-writes.mts
- packs/base/hooks/lib/making-check-turn.mts
- packs/base/hooks/lib/child-group.mts
- packs/base/hooks/lib/heavy-commands.mts
- packs/base/hooks/lib/shell-writes-selftest.mts
- packs/base/hooks/lib/turn.mts
- packs/base/rules/a-gate-measures-the-real-thing.md

## AFTER
- packs/tui/checks/tui-resize-listener-removed.json
- packs/shell/skills/shell-extract-template/SKILL.md
- packs/audio-core/hooks/param-id-lock.mts
- packs/ui-craft/skills/app-screen/SKILL.md
- packs/synth-creator/hooks/frozen-files.mts
- packs/synth-creator/hooks/chart-first.mts
- packs/synth-creator/hooks/spec-lock.mts
- packs/synth-creator/hooks/protect-vendor.mts
- packs/synth-creator/hooks/build-guard.mts
- packs/synth-creator/rules/hooks-and-gates.md
- packs/synth-creator/skills/build-through-the-queue/SKILL.md
- packs/base/hooks/lesson-checks.mts
- packs/base/hooks/making-check.mts
- packs/base/hooks/file-size-guard.mts
- packs/base/hooks/once-only.mts
- packs/base/hooks/folder-law.mts
- packs/base/hooks/lib/shell-writes.mts
- packs/base/hooks/lib/program-writes.mts
- packs/base/hooks/lib/making-check-turn.mts
- packs/base/hooks/lib/child-group.mts
- packs/base/hooks/lib/heavy-commands.mts
- packs/base/hooks/lib/shell-writes-selftest.mts
- packs/base/hooks/lib/turn.mts

## Why each remaining hit is not a synth shell
- Unix shell / shell commands (hooks reading shell writes, `>`, tee, sed -i, heredocs; a command run "from the shell"): all of `packs/base/hooks/*.mts`, `packs/base/hooks/lib/*.mts`, `packs/audio-core/hooks/param-id-lock.mts`, `packs/synth-creator/hooks/{chart-first,frozen-files,spec-lock,protect-vendor,build-guard}.mts`, `packs/synth-creator/rules/hooks-and-gates.md`, `packs/synth-creator/skills/build-through-the-queue/SKILL.md`.
- `packs/tui/checks/tui-resize-listener-removed.json`: the shell prompt of a terminal.
- `packs/shell/skills/shell-extract-template/SKILL.md`: shell scripts (the `shell` pack).
- `packs/ui-craft/skills/app-screen/SKILL.md`: "Pick the shell": the page's sidebar/top bar layout of a web app screen, not a synth host frame.
