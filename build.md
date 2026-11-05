# claude-packs: the build

## Rules for this file

- A step is ticked only when its "done when" was measured or seen in the opened app.
- Every step is built on its own branch and merged when done; its start and finish are in the log.

## Where we are

Started 2026-11-04 (the kit had no build.md before 0.11.0; earlier steps are in CHANGELOG.md and workflow-bugs.md).

## In progress

- 0.11.0, the v7 additions (work/0.10.0-v7-additions), started 2026-11-04 00:50 EST.
  making: the v7 additions merged into the kit without overwriting it (dispatch laws in base, the needs check mode, seven node packs under a node configuration, presets, per-service compose checks); concepts: none (design/shape.json declares no concept: packs, configurations, hooks and checks are each a different thing, addressed by name); reuse: judgeEvent (packs/base/hooks/lib/writes.mjs) for dispatch-once's write frame, hookRun (test/kit-cli.mjs) for the tests' hook calls, inferConfig (lib/configs.mjs) for a preset's configuration.
  done when: npm test all green; the node-api install's checks pass their selftest and doctor --strict is OK; the work branch is on GitHub (blocked: KWB-39).
- KWB-39, git-guard takes SSH ("let git-guard take SSH"), on the same branch.
  making: git-guard's push law accepts a push whose target is an SSH URL under the owner (named in the command, or the URL of the remote it names), the Stop hint offers that form; concepts: none (design/shape.json declares none); reuse: house() and its env (packs/base/hooks/git-guard.mjs), pushCommand (packs/base/hooks/lib/pushed.mjs).
  done when: git-guard's selftest has an SSH case each way (an owner SSH remote and URL pass; another owner's SSH remote and an HTTPS remote are refused), red without the fix; the kit's install updated; work/0.10.0-v7-additions pushed over SSH.

- 0.12.0, the v8 additions (work/0.12.0-v8-additions, from the v7 branch), started 2026-11-04.
  making: the v8 additions merged into the kit without overwriting it (packs web, tui, nginx; fastify's one isProd switch replacing security-always-on; fastify, js-ts and ai additions; eight presets); concepts: none (design/shape.json declares none); reuse: PRESETS and normalisePacks (lib/packs.mjs), the node configuration (configurations/node/config.json) for the new packs, fresh and hookRun (test/kit-cli.mjs) in the v8 test.
  done when: MERGE.md's Verify passes (selftest, doctor --strict, npm test, list); every .incoming reconciled; .incoming-v8/ deleted; the branch on GitHub.

- 0.13.0, the time laws (work/0.13.0-time-laws, from main once v8 has landed), started 2026-11-04 ("yes" to the hook review).
  making: doctor caches a passing selftest by the hash of the hook and its libs; test-changed narrowed (a version bump alone, pack content by pack); a base hook suite-once and six small rules and two skills behind the hooks that cost the most time (KWB-41); concepts: none (design/shape.json declares none); reuse: judgeEvent (packs/base/hooks/lib/writes.mjs), hashFile (lib/manifest.mjs), the "# hook:" rule frontmatter (lib/packs.mjs planFiles), TABLE (scripts/test-changed.mjs).
  done when: a test shows the second doctor runs no unchanged selftest, and a changed hook is proved again; test-changed picks under 34 files for a version bump and for one pack's content; suite-once's selftest each way, seen red; KWB-41 closed.

- 0.14.0, stored text (work/0.14.0-stored-text), started 2026-11-04 (UIs render what comes from a database with \r correct, code highlighted, markdown parsed).
  making: pack stored-text: one renderer for text from a database (line endings, markdown, highlighted code, sanitized), a rule, a skill and four lesson checks, taken by the node and full-stack configurations and the UI presets; concepts: none (design/shape.json declares none); reuse: the lesson-checks hook and its needs mode (packs/base/hooks/lesson-checks.mjs), PRESETS (lib/packs.mjs), fresh and hookRun (test/kit-cli.mjs).
  done when: each check refuses its bad and passes its good through the hook in an install; the UI presets bring the pack; doctor --strict OK; the whole suite green once, committed.

- 0.14.1, MIT license (work/0.14.1-mit-license), started 2026-11-04 ("we should make our license MIT of this project").
  making: the project under the MIT license: a LICENSE file, package.json and the lock say MIT; concepts: none (design/shape.json declares none); reuse: none, no code changes.
  done when: LICENSE at the root, package.json and package-lock.json name MIT, on main.

- 0.15.0, writing (work/0.15.0-writing), started 2026-11-04 (split ./humanize into small pieces in the kit, so text that goes public reads human).
  making: pack writing: the humanize skill split into small rules, one-job skills and lesson checks, with a prose mode in lesson-checks that leaves code and URLs out, in every configuration; concepts: none (design/shape.json declares none); reuse: the lesson-checks hook and its subject blanking (packs/base/hooks/lesson-checks.mjs), a configuration's "always" packs (lib/configs.mjs), hookRun (test/kit-cli.mjs).
  done when: every section of humanize has a home; each check refuses its bad and leaves code and URLs alone, through the hook in an install; every skill passes doctor (Use when, under 8,000 characters); the whole suite green once, committed; ./humanize removed.

- 0.16.0, scan (work/0.16.0-scan, from work/0.15.0-writing), started 2026-11-04 (a SCAN a user runs before choosing to install, on a copy, reporting what to install and every issue found).
  making: claude-packs scan: a copy of the project, the recommended packs installed in it, every check over every file, a report with evidence, and a review prompt for what checks cannot see; concepts: none (design/shape.json declares none); reuse: sync (lib/sync.mjs), coverage (lib/coverage.mjs), the installed lesson-checks and secrets-guard, onceOnlyDoctor (lib/once-only-report.mjs).
  done when: a test proves the scanned project is byte for byte unchanged, .env is never copied and no secret value reaches the report; the recommendation has evidence per pack; no-find-reads catches collection.find(q); the whole suite green once, committed.

- 0.17.0, ui-craft (work/0.17.0-ui-craft, from work/0.16.0-scan), started 2026-11-04 (build the UI/UX additions from the skills found, with taste-skill, and report what came from each).
  making: pack ui-craft: small rules, skills and checks for application and page design, written from Vercel's guidelines, Anthropic's frontend-design, Impeccable and taste-skill, with a rendered-page gate; concepts: none (design/shape.json declares none); reuse: the hover gate generalised (lib/hover-gate.mjs), design-direction and design-review (packs/web/skills), PRESETS (lib/packs.mjs), hookRun (test/kit-cli.mjs).
  done when: each check refuses its bad through the hook in an install; doctor is red for UI code with no page gate; docs/ui-craft-sources.md says what came from each source; the whole suite green once, committed.

- Landing (work/0.17.0-ui-craft), started 2026-11-04 (whenever a work branch is finished it is merged into main and pushed).
  making: rule finished-work-lands and skill land-branch in base; concepts: none (design/shape.json declares none); reuse: the git-guard laws (packs/base/hooks/git-guard.mjs), the "# hook:" rule frontmatter.
  done when: the rule and skill install, and this branch lands by them.

- 0.18.0, hook-proof (work/0.18.0-hook-proof), started 2026-11-04 (whenever a hook is supposed to exit 2 and it exits 0, it is caught).
  making: pack hook-proof and doctor checks: a hook that crashed, one no settings entry runs, and the forms that fail open (exit 1, || true, a catch that allows) are caught; concepts: none (design/shape.json declares none); reuse: readHookLog (packs/base/hooks/lib/hook-log.mjs), the lesson-checks hook, holdToExamples (test/kit-cli.mjs).
  done when: a planted crash and a planted unregistered hook make doctor red; each check refuses its bad through the hook; the whole suite green once, committed; landed.

- 0.19.0, the pack manifest (work/0.19.0-pack-manifest), started 2026-11-04 (pack.json says stock or custom, with a git url, fields like a package.json, and who made it).
  making: every pack.json a manifest like a package.json: type, version, author, license, repository, homepage, keywords, engines; a validator, and `list` showing them; concepts: none (design/shape.json declares none); reuse: readPack and availablePacks (lib/packs.mjs).
  done when: every stock pack passes the validator; a custom pack with no author or git url fails it, by name; `list` shows version, type and author; the whole suite green once, committed; landed.

- 0.20.0, what a real install found (work/0.20.0-install-fixes), started 2026-11-04 (plan and build everything open; admiralmcp/build/kit-review-plan.md Phase 5).
  making: the kit bugs, gaps and tunes AdmiralMCP's install listed, kit-lock adopting its own lease, the ids shape; concepts: none (design/shape.json declares none); reuse: the lesson checks' bad and good examples, holdToExamples (test/kit-cli.mjs), acquire (lib/kit-lock.mjs), localBranches (packs/base/hooks/lib/pushed.mjs).
  done when: each item has a bad or a test that fails without it; the whole suite green once, committed; landed.

- 0.21.0, custom packs (work/0.21.0-custom-packs, on 0.20.0), started 2026-11-04 (someone makes a pack for their team, puts it in a repo, teammates get it).
  making: new-pack scaffolds a team's pack repo; add --from installs a pack from a git url in any configuration; update pulls it; concepts: none (design/shape.json declares none); reuse: readPack, planFiles (lib/packs.mjs), sync (lib/sync.mjs), manifestProblems (lib/pack-manifest.mjs), optIn (lib/switches.mjs).
  done when: a test goes new-pack, git push, add --from, a check fires, its hook held until enable, update pulls a new version, a teammate's project restores it from the lock; the whole suite green once, committed; landed.

- 0.22.0, the depth of ui-craft (work/0.22.0-ui-depth, on 0.21.0), started 2026-11-04 (everything in taste-skill is useful; hover says so; one template, tested once).
  making: rules, skills and checks for app screens, pages, critique, redesign, references, words, pictures and pointer feedback, the page-measure tool, test-the-template-once and a shape_symmetry that scales; concepts: none (design/shape.json declares none); reuse: holdToExamples (test/kit-cli.mjs), swapPairs (packs/base/tools/shape-symmetry.mjs).
  done when: every check refuses through the hook; page-measure is proved in real Chrome; 1000 instances cost under 20 swaps; the whole suite green once, committed; landed.

- 0.22.1, one template all the way through (work/0.22.1-one-template), started 2026-11-04 (asked if his UI points were in; four documents still said to walk every control).
  making: the walks test one control per template and read the rest; concepts: none (design/shape.json declares none); reuse: test-the-template-once (packs/base/rules).
  done when: no law asks to walk every instance; the whole suite green once, committed; landed.

- 0.23.0, template-law (work/0.23.0-template-law), started 2026-11-04 (enforce that anything component used more than once is a template, html, c++, app).
  making: a base hook that refuses a hand-built copy of an element by its shape; concepts: none (design/shape.json declares none); reuse: judgeEvent (packs/base/hooks/lib/writes.mjs), blankCode (lib/cpp-scan.mjs), the walk moved from dispatch-once to lib/elements.mjs.
  done when: its selftest each way, seen red; its worktree case; scan lists them; the whole suite green once, committed; landed.

- 0.24.0, C++ templates and the hover gate (work/0.24.0-cpp-templates), started 2026-11-04 (thoroughly do C++, prove on Stellix; hover gate for ui-craft).
  making: template-law reads repeated code by statement runs and names the differences (the template's parameters), measured on Stellix; a cpp pack and configuration (rules, the walk check, a skill); gates.hover also for ui-craft; concepts: none (design/shape.json declares none); reuse: gateProblems (lib/hover-gate.mjs), shapesOf (packs/base/hooks/lib/elements.mjs).
  done when: template-law finds Stellix's repeated components, with its misfires read and counted; doctor is red for web UI with no hover gate; the whole suite green once, committed; landed.
  measured: Stellix 523 files, 302 repeats, 950 copies; 26 sampled by reading, no false match, 3 borderline; the suite 215 of 216, the one a stale expectation, fixed and run alone 8 of 8.

- 0.25.0, every language, and repetition caught before it is written (work/0.25.0-every-language), started 2026-11-04 (a python and shell pack; every language has repetition and template things; catch repetition before it is written).
  making: one language table for the statement reader (python, shell, go, rust, java, c#, kotlin, swift, ruby, php, lua), near copies and re-made functions judged at the write, what already exists shown at the prompt, python and shell packs; concepts: none (design/shape.json declares none); reuse: statementsOf and codeShapes (packs/base/hooks/lib/code-shapes.mjs), judgeEvent (lib/writes.mjs), repeatedShapes (lib/repeats.mjs).
  done when: each language has a copy refused and data passed, measured on a real repo of it with misfires read and counted; the whole suite green once, committed; landed.
  measured: every language in the table has a copy matched and comments ignored; 13 of 13 Python and shell repeats read were real; near copies 0 on the kit; 3 senior reviews made 30 packs and 290 checks, each held to its examples; the suite 255 of 262, the 7 stale expectations fixed and those files run alone, 17 of 17 and 38 of 38 with the rest.

- 0.25.1, the docs and the licence (work/0.25.1-docs-license), started 2026-11-04 (the README and CLAUDE.md brought up to date; the licence holder is TheDecipherist).
  making: a README that describes the kit as it is, with a test that holds it; concepts: none (design/shape.json declares none); reuse: PRESETS (lib/packs.mjs).
  done when: test/readme.test.mjs green; the whole suite green once, committed; landed.

- 0.26.0, dynamic-data, API versioning and the full-stack split (work/0.26.0-dynamic-data), started 2026-11-04 (a pack from the CMS design docs; versioning in any framework; full-stack into smaller packs).
  making: the dynamic-data pack, versioning checks in http-api, full-stack as a composition of packs; concepts: none (design/shape.json declares none); reuse: hitsOf (packs/base/hooks/lesson-checks.mjs), the pack layout of packs/http-api.
  done when: the checks measured on real repos with hits read; the moved laws reach a full-stack install; the whole suite green once, committed; landed.

- 0.27.0, published text is not code (work/0.27.0-content-sites), started 2026-11-04 (false triggers on content files, dates allowed in articles; the content-site pack; repo-litter).
  making: one content rule for every hook and the scan, a content-site pack, repo-litter, the new http-api checks; concepts: none (design/shape.json declares none); reuse: isContent (packs/base/hooks/lib/content.mjs), gitAdds (packs/base/hooks/lib/git-adds.mjs).
  done when: the site's false secrets and samples are gone from a scan, with real faults still caught; the whole suite green once, committed; landed.

- 0.28.0, the audio packs (work/0.28.0-audio-packs), started 2026-11-04 (from the rebuild playbook: reverse-engineering, midi, sound-design, instrument-shell).
  making: four packs and the firmware hook, measured on real synth repos; concepts: none (design/shape.json declares none); reuse: gitAdds (packs/base/hooks/lib/git-adds.mjs), hitsOf (packs/base/hooks/lesson-checks.mjs).
  done when: every check measured on real repos with its hits read; the whole suite green once, committed; landed.

- 0.29.0, logging (work/0.29.0-logging), started 2026-11-04 (logs rotate and are never cleared; every refusal with its detail, so hooks are judged on evidence).
  making: rotation, an event log, a refusal ledger and the logs command; concepts: none (design/shape.json declares none); reuse: logHook (packs/base/hooks/lib/hook-log.mjs), runAll (packs/base/hooks/run-hooks.mjs).
  done when: no log is ever cut; a refusal keeps its reason and can be judged; the cost per call is measured; the whole suite green once, committed; landed.

- 0.30.0, names first (work/0.30.0-names-first), started 2026-11-05 (the reverse-engineering pack starts from the machine's own names: the manual's list, then strings in the image).
  making: a skill, a rule and a names-sweep tool in the reverse-engineering pack; concepts: none (design/shape.json declares none); reuse: a pack tool as tone-report.mjs is (packs/audio-core/tools), gather-sources (packs/reverse-engineering/skills).
  done when: names-sweep finds a known name under every wrapping the repos met, on a real image too; the whole suite green once, committed; landed.

- 0.31.0, names from the display (work/0.31.0-names-from-the-display), started 2026-11-05 (what the JP-8000 and Virus repos documented about names, which 0.30.0 was written without).
  making: names-sweep reads the display's own forms, Roland's bit order and name pools; a menu-map skill; concepts: none (design/shape.json declares none); reuse: sweep, wrappings (packs/reverse-engineering/tools).
  done when: names-sweep gives the addresses docs/research.md records on the real JP-8000 and Virus images and reads the JP-8000 update; the whole suite green once, committed; landed.

- 0.32.0, what the kit finds (work/0.32.0-what-the-kit-finds), started 2026-11-05 (six real repos checked: false secrets, build output read as source, reverse-engineering projects not recognised, tables found by word and not by density).
  making: suggest and scan read a project as it is; the key pattern stops taking identifiers; names-sweep reports where names sit densest; the lessons of two bug logs in names-first; concepts: none (design/shape.json declares none); reuse: recommend (lib/scan-detect.mjs), repoWeight (lib/repo-weight.mjs), sweep (packs/reverse-engineering/tools/names-sweep.mjs).
  done when: each fault is measured gone on the repo that showed it, with real keys still caught; the whole suite green once, committed; landed.

- 0.33.0, PDF to Markdown (work/0.33.0-pdf-to-md), started 2026-11-05 (a PDF is read with docling).
  making: a base skill pdf-to-md; concepts: none (design/shape.json declares none); reuse: the skill format of packs/base/skills.
  done when: the skill installs in every configuration and its command is measured on a real manual; the whole suite green once, committed; landed.

## Steps

## Log

- 2026-11-04 00:50 EST: 0.11.0 started; merge applied, .incoming files reconciled; commit e17a79d (local, push blocked by KWB-39).
- 2026-11-04: 0.11.0 and 0.12.0 landed on main (964057b): npm test 167 of 167. 0.13.0: the gate ran once on a66749b in 252 s (it took 12 minutes and more before), 170 of 171; the noop list fixed (a rule held with a hook Sub37 does not have), noop 3 of 3 run alone: 171 of 171.
- 2026-11-04: 0.19.0 manifest (192 of 192). 0.20.0 install fixes, 0.21.0 custom packs, 0.22.0 ui-craft depth: the gate ran once in 257 s, 202 of 204; shape.test's message and CLAUDE_PID in the preload fixed, those files alone: 204 of 204.
- 2026-11-04: 0.18.0 hook-proof: the gate ran once in 263 s, 188 of 189; the timing test's fakes are in no settings entry, as doctor now says; it passes alone: 189 of 189.
- 2026-11-04: 0.15.0 writing (178 of 178), 0.16.0 scan and 0.17.0 ui-craft and landing: the gate ran once on 6b26cf0, 186 of 186 in 256 s; landed by land-branch.
- 2026-11-04: 0.29.0 logging: the gate ran once on f64709c, 301 of 305; a rule's `**/*` paths hid doctor's coverage (KWB-46) and the ignore test needed the logs line; the four pass alone on ffc1e16. Cost measured: 12 hooks through the runner, median 76 ms per call.
- 2026-11-05: 0.30.0 names first: the gate ran once on a06a3c9, 319 of 319. Measured on a real EPROM: 255 factory patch names read as stored, 222 of 254 in the manual's order; one real OS update file reads under none of 118 wrappings.
- 2026-11-05: 0.31.0 names from the display: the gate ran once on 1068d09, 324 of 324. Measured on real images: Virus names read 10 to 142 of 226, the pool at 0xC373 as build_menu_map.py has it; the JP-8000 preset chain at 0x562B6, stride 320, as research.md has it; the JP-8000 update decodes to the EPROM, 524,288 of 524,288. One Supernova OS update file still reads under no wrapping.
- 2026-11-05: 0.32.0 what the kit finds: the gate ran once on 24c18f5, 339 of 339. On the repos that showed each fault: one repo's false secrets 11,410 to 2, three others to 0; reverse-engineering projects recognised 5 of 5, a plain DSP library still left out; names-sweep lands on the documented table start at 0xDCC9A, 0x5712F and 0x562B6.
- 2026-11-05: 0.33.0 pdf-to-md: the gate ran once on 9c4ffd6, 339 of 339.
