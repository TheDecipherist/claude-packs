# Work order: reference-library

Written 2026-11-13, from the user's requests of that night. Runs after 2.0.0 is published and after the 2.1 order (output shaping); it ships as 2.2.0.

**What this is.** The kit learns to use the reference library (`~/projects/reference-library`, private repo `TheDecipherist/reference-library`): one shared place for the Markdown the kit's skills make from datasheets, service manuals and owner's manuals, so a part used by ten instruments is converted, charted and checked once. Finished means: on any project, before a datasheet or a manual is read or converted, the kit looks in the library and hands over the page it already has; whatever a project converts lands in the library with its README and index rebuilt; and the library is there on every machine without anyone remembering it, cloned from the user's GitHub when it exists there, and never required when it does not.

**The position.** Known: the library exists, with 174 chip pages under 37 makers (from matrix12 and vsynthgt), 67 datasheet conversions filed under their parts, 2,295 converted manuals and service documents from the eproms archive, the page images as WebP, an inventory of 73 projects and 740 archive machines, `index.json`, a generated README catalogue and a pre-commit check that keeps it current. Not known: how often a project would have found its part already there (the inventory's "chips named by more than one project" table is the estimate: the SSM2044 is named by 34 projects, the Z80 by 14); whether a part's page from one machine reads right for another (the pages still mix the part's facts with one machine's wiring, the library's d-5). Cannot be proved here: that the PC clones and uses it, until the PC runs it (an open item for the end, through the admiral channel).

**The sources.**
- `~/projects/reference-library`: `README.md` (layout and catalogue), `docs/decisions.md` (d-1 to d-6), `tools/lookup.mjs`, `tools/build-index.mjs` (`--check`), `tools/import-project.mjs`, `tools/import-archive.mjs`, `tools/file-datasheets.mjs`, `tools/images-to-webp.mjs`, `tools/survey.mjs`, `tools/makers.mjs`, `tools/git-hooks/pre-commit`, `index.json`, `inventory/README.md`.
- The kit's skills that convert or read sources: `pdf-to-md`, `firmware-recon`, `start-from-a-workorder`, `analyse-reference-look`, and the audio packs' copy-and-prove and bounce-a-plugin (packs/audio-core/skills/copy-and-prove/SKILL.md, packs/sound-design/skills/bounce-a-plugin/SKILL.md); and `skill-first` (the hook shape this order's refusal copies).
- The user's words, 2026-11-13: "the skills/hooks/rules look there first and if they exist you dont even need to read/find them and remake them"; "the kit looks in the ref library first before it converts on future projects"; "our kit should also add/update the README.md when any additions or changes is made to the library"; "claude-packs must also have reference-library as a dev dependency 'optional' if it exists on the users github. so when we use it on the PC it will automatically clone it from github".
- Missing: the PC's path for the library (taken as `~/projects/reference-library` there too, d-1 below); the GitHub owner on a machine with no `gh` login (read from the library's own setting, then the project's remote owner).

**The foundation.** The library owns its format and its tools: the kit calls `tools/lookup.mjs` and `tools/build-index.mjs` in the library and never keeps a second copy of them. The kit's own pieces reused: `lib/layout.mts` and the user config for the setting, the `skill-first` hook's refusal shape, `kit-fresh`'s once-per-session network check (for the clone and the pull), `git-guard`'s token-by-name rule for every clone and push.

**Models.** `kit-fresh` (W8 of the typescript order) for a network step that says what it could not check and never blocks offline. `skill-first` for a refusal that points at the one thing to read instead. Not to take: npm's `optionalDependencies` for the clone (d-1).

<constraints>
Always do:
- Work the steps in order.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/STEP/`.
- Give every new test or gate a planted fault that turns it red, and show it red.
- Treat the library as optional: every command and hook works, and says so once, on a machine where it is missing and cannot be cloned.
- Read every token by name (`$THEDECIPHERIST_GITHUB_TOKEN`, or the repo's credential helper), never pasted.
- Keep the library's README and `index.json` rebuilt by its own `tools/build-index.mjs` on every change the kit makes there.

Never do:
- Commit a PDF or a vendor's file to the library: only the Markdown, charts, tables, netlists and WebP images the kit makes (the library's d-3).
- Copy the library's tools into the kit.
- Fail an install, an update or a session because the library is missing, private or offline.
- Claim the PC clones the library before the PC has run it.
</constraints>

---

## W0. Set up

This order runs in the kit's own repo, on `work/2.2.0-reference-library`, from the trunk after 2.0.0 and 2.1.0 have landed.

```claude-packs
configuration: base
packs: base
```

1. Rebase nothing: start the branch from the fetched trunk (`git worktree add .claude/worktrees/reference-library -b work/2.2.0-reference-library origin/main`).
2. `npm ci && npm run build`, then `node bin/claude-packs.mjs doctor --strict`.
3. Clone or update the library at `~/projects/reference-library`, run its `node tools/build-index.mjs --check` and `node tools/lookup.mjs CEM3374`.

**Done when:** the build exits 0; `doctor --strict` is OK; the library's `--check` exits 0 and `lookup.mjs CEM3374` prints `chips/curtis/cem3374/` (evidence in build/evidence/W0/).

## W1. Where the library is, and the clone that needs no one to remember it

The setting, recommended and taken: `library` in the kit's user config, `{ "path": "~/projects/reference-library", "repo": "TheDecipherist/reference-library" }`, defaulting to that path and to `OWNER/reference-library`, where OWNER is the library setting's, else the owner of the project's `origin` remote, else `gh api user`.

1. `claude-packs library status|clone|pull`: status says where it is, its commit, and whether it is behind; clone clones the repo when it exists on the owner's GitHub and is missing here; pull fast-forwards it.
2. `init`, `update` and `doctor` run the clone once when the library is missing: if the repo exists and can be read, it is cloned (`git clone`, the token by name, the library's pre-commit hook switched on with `git config core.hooksPath tools/git-hooks`); if it does not exist, cannot be read or the machine is offline, one line says so and the command goes on. Once per day at most, like `kit-fresh`.
3. d-1 (recorded in decisions.md): the clone is the kit's, not npm's. An `optionalDependencies` entry on a private git repo makes npm reach for it on every install of the published package, for every user, and the library is not code the kit imports; the user's "dev dependency, optional" is met by the kit cloning it when it exists, which also works on the PC.

**Done when:** in a scratch HOME with a fake remote (a bare repo named `reference-library`), `update` clones it and switches its hook on (the clone's `core.hooksPath` read back); with the remote missing, `update` exits 0 and prints one line naming the library; offline (an unreachable remote URL), the same; a second `update` within the day makes no network call (counted by a stub). Plants: the clone step removed, the hook path not set, a failing clone turned into an exit 1: each red in `test/library/clone.test.mts`.

## W2. Look in the library first

1. `claude-packs library lookup PART-OR-MODEL`: runs the library's `tools/lookup.mjs` and returns its answer; exit 1 when the part or machine is not there.
2. The hook `library-first` (PreToolUse on Read and Bash): a Read of a `.pdf`, or a conversion command (`docling`, `pdftotext`, the `pdf-to-md` skill's commands) whose file name names a part number or a machine the library's `index.json` holds, is refused with the library's page for it: "the library has CEM3374: chips/curtis/cem3374/CEM3374.md (and its datasheets/). Read that. To convert again on purpose, say why in the prompt." A file the library does not know passes. No library on the machine: it passes, silently.
3. `pdf-to-md`, `firmware-recon`, `start-from-a-workorder` and packs/audio-core/skills/copy-and-prove/SKILL.md gain a first step: list the parts and the machine, look each up, and read what is there before planning any conversion.

**Done when:** `lookup` finds CEM3374, MC6809 (an alias) and `matrix-12`, and exits 1 on `CEM3340`; `library-first` refuses a Read of `docs/CEM3374.PDF` and a `docling CEM3374.pdf` with the library's path in its message, passes `docling CEM3340.pdf`, and passes everything with no library (4 cases in its self-test, each red with its branch removed); the four skills name the lookup in their first step (a pack test, red with the line removed).

## W3. What a project converts goes to the library, README and all

1. `claude-packs library add FILE.md --part NUMBER | --machine BRAND/MODEL --shelf manuals|service-manuals`: files the Markdown (and its WebP images, converting any JPEG or PNG with the library's `images-to-webp` settings) under the right folder, using the library's `tools/makers.mjs` for a part's maker, then runs `tools/build-index.mjs`, so the README catalogue, the machine's folder README and `index.json` follow every addition; commits in the library by name and pushes its branch.
2. `pdf-to-md` ends with `library add` for what it converted, in place of leaving the Markdown in the project.
3. `doctor` reports a library whose `build-index.mjs --check` fails (README or index behind), with the command that fixes it.

**Done when:** `library add` of a planted chip page puts it under `chips/MAKER/PART/`, and the library's `--check` exits 0 after it (README and index rebuilt) and 1 when the rebuild step is planted out; a PDF given to `library add` is refused; a JPEG beside the page arrives as WebP with the link rewritten; `doctor` names a stale README (a planted edit to a page) and is quiet after a rebuild. Each case red with its step removed, in `test/library/add.test.mts`.

## W4. Before calling it finished

Read the finished work as a senior engineer would: the clone's failure paths, the hook's false refusals on a file name that only looks like a part, the cost on a project that never touches a PDF. List what is left, what is unproved and what a person must judge.

**Done when:** every open item is written down in `docs/workorders/reference-library/open.md` with why, including the PC test; `library-first`'s refusals on the kit's own test fixtures are 0 of the cases that name no library part (counted by its self-test).

## W5. The report

Write `docs/workorders/reference-library/report.md`: what was built, what is proved and how, what is not, and what the kit did well and badly, with counts from `logs`.

**Done when:** every section has counts, or a stated reason there are none; the CHANGELOG's 2.2.0 section and the README's library section name `library lookup`, `library add`, `library-first` and the clone, through the writing skill.
