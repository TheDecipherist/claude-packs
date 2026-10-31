Survey this repository and write `docs/project.md`: a complete, factual description of how the project is laid out and how its code is written. It will be used to tailor the claude-packs rules, checks, hooks and skills so each one triggers exactly where it's needed.

<constraints>
Always do:
- Read the code. Every statement in project.md comes from files you opened, with the path cited. Where something isn't in the repo, write "not present", never a guess.
- Treat this as read-only: the only file you create or change is `docs/project.md`.
- Use real paths and real names: folders, files, classes, namespaces, CMake targets, test names.
- Keep it complete but plain: tables and short lists, no essays.

Never do:
- Change, move, format or "fix" any code, config, rule or skill while surveying.
- Describe what the spec *plans* as if it exists. Mark planned-but-absent things as planned, with the spec section.
- Run builds, installers or anything that writes files (reading `git log`, `ls`, `cmake --help`-style queries is fine).
</constraints>

## What project.md must contain

### 1. Folder tree
The full directory tree (folders only, to depth 4, excluding `build*`, `.git`, `node_modules`, `JUCE`, `_deps`, vendored libraries), and for every folder: what lives there, file count, main languages, and one example file.

### 2. Where each concern lives
A table with one row per concern: the folders and files that hold it, the main classes, and whether it runs on the audio thread, the message thread, the render thread, or offline.
Concerns: plugin/standalone entry and processor; voices and voice allocation; sound engines (each oscillator kind); filters; effects (each); dynamics (EQ, compressor, limiter); the world (travellers, hits, pushes, tick); the world snapshot and handoff; the seeded random generator; parameters and IDs; patches, presets, state save/load, reset; records (layout and state); the painter / GPU code; shaders; UI input, gestures, camera, picking; undo; MIDI, MPE, note tracking, sustain; tempo and clock; tests and gates; benchmarks; tools and scripts; research data.

### 3. How code is written
- C++ standard, compiler flags (from CMake), warnings, sanitizer presets.
- Naming conventions (files, classes, members, constants, namespaces), with examples.
- File-size distribution: largest 15 source files with line counts, and how many exceed 300 lines.
- Error handling style, ownership style (unique_ptr, raw, references), use of `juce::` vs `std::` types.
- How modules are structured (base classes, registries, "everything extends from core"), with the base class names.
- Threading model: which threads exist, and what communicates between them (atomics, FIFOs, snapshots, locks — name the files).
- How parameters are declared and how their IDs are made.

### 4. Build, dependencies, tests
- Build system and targets (CMake target names, formats built: standalone/VST3/AU/CLAP).
- JUCE version (read it from the repo), Dawn or other GPU library and version or commit, every other third-party library with version and licence.
- Test framework, test target names, how gates and planted faults are run, golden files and where they live.
- CI, if any.

### 5. Claude setup already in the repo
- Contents of `CLAUDE.md` and any nested `CLAUDE.md` (summarise, quote headings).
- Every file in `.claude/` (rules with their `paths:`, skills with their descriptions, hooks and what they block, settings), and any `build.md`, `bugs.md`, `step.py`, work orders and laws files.
- Anything that duplicates or conflicts with another rule, skill or hook.

### 6. Proposed layout for claude-packs
Finish with this JSON block, filled from what you found (use the real folder paths; add folders that exist and matter; mark a folder `"planned": true` if the spec calls for it but it doesn't exist yet):

```json
{
  "folders": {
    "app":     { "path": "", "purpose": "" },
    "audio":   { "path": "", "purpose": "" },
    "engines": { "path": "", "purpose": "" },
    "dsp":     { "path": "", "purpose": "" },
    "params":  { "path": "", "purpose": "" },
    "world":   { "path": "", "purpose": "" },
    "records": { "path": "", "purpose": "" },
    "painter": { "path": "", "purpose": "" },
    "shaders": { "path": "", "purpose": "" },
    "ui":      { "path": "", "purpose": "" },
    "tests":   { "path": "", "purpose": "" },
    "bench":   { "path": "", "purpose": "" },
    "docs":    { "path": "", "purpose": "" },
    "tools":   { "path": "", "purpose": "" }
  },
  "extra_folders": {},
  "files_to_move": [ { "from": "", "to": "", "why": "" } ],
  "special_files": {
    "seeded_random": "",
    "world_math": "",
    "render_thread": "",
    "snapshot": ""
  }
}
```

`files_to_move` lists source files that sit outside any folder above, or in the wrong one (for example drawing code in an audio folder). List them; don't move them.

### 7. Open questions
Anything you couldn't determine, as a numbered list.

When done, reply with one line: the path of project.md and how many open questions it has.
