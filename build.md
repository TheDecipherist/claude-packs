# claude-packs: the build

## Rules for this file

- A step is ticked only when its "done when" was measured or seen in the opened app.
- Every step is built on its own branch and merged when done; its start and finish are in the log.

## Where we are

Started 2026-11-04 (the kit had no build.md before 0.11.0; earlier steps are in CHANGELOG.md and workflow-bugs.md).

## In progress

- 1.4.5, two conversions at once (work/1.4.5-pdf-cap), started 2026-11-09, after the user's "add that to our pdf skill so its capped at 2" (seven docling runs at once loaded the PC to 16).
  making: pdf-to-md step 3 caps docling at two runs per machine at low priority, with one wait-for-a-slot command form for the lead and every agent; concepts: none; reuse: the skill's own step 3 command.
  done when: doctor's skill checks pass (under 8,000 characters, "Use when"); the command form waits while two run and starts at the third's turn, measured; the tests the branch reaches green.

- 1.4.4, inside the project (work/1.4.4-inside-the-project), started 2026-11-09, after the user's "claude-packs needs an explicit hook that makes sure that can never ever happen" and "the hook needs to be explicit that work for a project happens in that project always" (KWB-103).
  making: a base hook, inside-the-project: refuses `git worktree add`/`move` to a path outside the project, and any write, `cd`, `git -C` or `make -C` into a checkout of this repo (a worktree, or a clone of the same origin) that lies outside it; a base rule stating the law; concepts: none (design/shape.json declares none); reuse: project.mjs `ROOT`, `insideProject`, its common-dir reader (exported), writes.mjs `writesOf`/`readPayload`, command-prefix.mjs `bareWords`.
  done when: the selftest red on each planted escape without the law and green with it; its worktree case; README and page counts; the tests the branch reaches green.

- 1.4.2, screen images (work/1.4.2-screen-images), started 2026-11-09, after the user's "we need to update the circuit reader skill to also include screen/images ... its important we replicate screen/panel menues exactly".
  making: a reverse-engineering skill, read-a-screen-image (one screen, one report: every string exactly, its position, font, colour and state, the gesture that reaches it, the firmware's copy of each string, and a side-by-side against the rebuilt screen); read-a-circuit-diagram routes a screen page to it; menu-map takes its reports as the manual's display drawings; concepts: none (design/shape.json declares none); reuse: read-a-circuit-diagram's tiling and report form, menu-map's [FW]/[MAN] join.
  done when: doctor's skill checks pass (under 8,000 characters, "Use when"); README and page counts; the tests the branch reaches green.

- KWB-100, the runner reads progress.md before it exists (work/1.4.1-runner-progress), started 2026-11-08, seen in admiral-fleet's runner log.
  making: prompts/workorder/run.sh `moved` reads progress.md only when it exists, and the KWB-98 runner test asserts the runner's stderr is clean; concepts: none (design/shape.json declares none); reuse: the KWB-98 test's stand-in claude run (test/workorder.test.mjs).
  done when: the test is red on the old run.sh and green on the new; the tests the branch reaches green.
- KWB-101, a wrapper in front of git hid a token push -u from git-guard (same branch), found by the KWB-100 gate's doctor token sweep.
  making: hooks/lib/command-prefix.mjs `bareWords`, the one reader of command wrappers, used by git-guard `problem` and shell-writes `judge`; concepts: none; reuse: shell-writes' wrapper list, moved into the new lib and widened.
  done when: git-guard's selftest red on the wrapped token pushes without the fix, green with it; shell-writes' selftest green; the gate green.

- 1.3.2, the editor's frame laws (work/1.3.2-look-gate), started 2026-11-07, after the user's "update the skills so we get a handle on all ui related things that were missed".
  making: audio-core laws for a plugin's editor drawn with the toolkit: editor-paints-what-changed (paint only what changed, paced to the display at 60 Hz idle and up to 120 while dragging, 0 when static, compute only the moved screen, cache what does not move, the renderer named, a frame budget measured), the lesson check editor-repaint-on-change, the skill editor-frame-bench, audio-ui-thread-handoff corrected, ui-matches-reference-look given the typeface and live-means-live; concepts: none (design/shape.json declares none); reuse: gpu-frame-budget and gpu-frame-pacing-and-power (packs/gpu-painter/rules) for the pacing law, the lesson-check format and its bad/good proof.
  done when: the check refuses its bad example and passes its good one; the skill under 8,000 characters and starting "Use when"; README and page counts; the tests the branch reaches green.

- 1.3.2, look-gate (work/1.3.2-look-gate), started 2026-11-07, after the user's "why dont we have a skill that when you run a build it after the build has run always compares the ui ... you should have caught this automatically".
  making: a base hook, look-gate: after a build whose branch changed the code a reference picture is drawn by, it says which looks are due; at a landing it refuses a branch whose look code changed unless each look's report, committed on the branch, passed for a commit at or after that code's last change; looks declared in layout.json `looks`; concepts: none (design/shape.json declares none); reuse: readPayload (lib/writes.mjs), readLayout (lib/layout.mjs), checkoutRoot and claudeRoot (lib/project.mjs), the selftest helpers (lib/selftest.mjs) and git (lib/selftest.mjs) for the scratch repos.
  done when: its selftest red without the law and green with it (a landing refused with no report, a failing one and a stale one; passed with a fresh passing one; a branch that touched no look code passed; the build reminder named the due look); its worktree case; analyse-reference-look writes the report; README and page counts; the tests the branch reaches green.

- 1.3.1, skill-first (work/1.3.1-skill-first), started 2026-11-07, after the user's "that means we need a hook to enforce that skill as well" (analyse-reference-look, which two Edit-layer pages skipped).
  making: one base hook, skill-first, from a table: a read of circuit material needs read-a-circuit-diagram, a read of a design reference needs analyse-reference-look, each row only where its skill is installed, a project's own rows in layout.json; it replaces circuit-skill-first; concepts: none (design/shape.json declares none); reuse: the transcript reader and refusal of circuit-skill-first (moved, not copied), readLayout (lib/layout.mjs), checkoutRoot and claudeRoot (lib/project.mjs), matchesAny (lib/glob.mjs), the selftest helpers (lib/selftest.mjs).
  done when: its selftest red without the law and green with it (each row refused unloaded and passed loaded, a row whose skill is not installed passes, a layout row honoured); its worktree case; the rules for both rows; README and page counts; the tests the branch reaches green.

- 1.3.0, the changed-tests gate (work/1.3.0-changed-gate), started 2026-11-07, after the user's "full complete runs should only be if I notice something truly off".
  making: the gate before landing and before a release becomes the tests the branch's changes reach from the trunk, and suite-once refuses a whole-suite command unless the user's prompt that turn asks for a full run (test-only-what-changed, finished-work-lands, land-branch, pick-tests, fix-from-scan, bug-fix-starts-red, fix-plan, build-guard's message, the kit's CLAUDE.md); concepts: none (design/shape.json declares none); reuse: tailEntries and promptText (packs/base/hooks/lib/turn.mjs) for lastPrompt, refusal's command reading in suite-once, judgeEvent's refusal form (lib/writes.mjs), the selftest helpers (lib/selftest.mjs).
  done when: suite-once's selftest is red without the law and green with it (a whole-suite command refused when committed and unasked, passed when the prompt asks); its worktree case and KF-23 updated; every statement of the old law changed; the tests the branch reaches green.

- 1.3.0, circuit-skill-first (work/1.3.0-circuit-skill-hook), started 2026-11-07, after the user's "you need to make a hook for this to enforce the skill being used".
  making: a reverse-engineering PreToolUse hook that refuses a Read of, or a shell command that renders, a schematic, service manual or data sheet image or PDF until the transcript shows read-a-circuit-diagram loaded (a Skill call, or a Read of its SKILL.md); concepts: none (design/shape.json declares none); reuse: readPayload and judgeEvent's refusal form (packs/base/hooks/lib/writes.mjs), readLayout (lib/layout.mjs) for layout guards, checkoutRoot and claudeRoot (lib/project.mjs), matchesAny (lib/glob.mjs), scratchProject, runHook and verdicts (lib/selftest.mjs), asHook and isMain (lib/hook-log.mjs).
  done when: its selftest is red without the law and green with it (a sheet read with no skill refused; after a Skill call or a Read of SKILL.md passed; a render command naming a service manual refused; a plain source file passed; a layout glob honoured); its worktree case; README and CHANGELOG; the whole suite green.

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

- 0.34.0, a new reverse-engineering project (work/0.34.0-a-new-re-project), started 2026-11-05 (the MPX 500 test: a new project could not get the pack, and a banked ROM crashed names-sweep).
  making: the base configuration offers reverse-engineering; names-sweep reads banked ROMs; concepts: none (design/shape.json declares none); reuse: pointerTable (packs/reverse-engineering/tools/names-sweep.mjs).
  done when: init --auto gives a new project with firmware findings the pack, and names-sweep finds the MPX 500 program directory unaided; the whole suite green once, committed; landed.

- 0.35.0, the foundation (work/0.35.0-the-foundation), started 2026-11-05 (the kit never named synthcore, so nothing stopped a unit writing its own clock).
  making: a rule and a check that time comes from synthcore, and an opt-in check that the UI is drawn in code; concepts: none (design/shape.json declares none); reuse: lesson checks (packs/base/hooks/lesson-checks.mjs).
  done when: both checks fire through the hook and the timing check has no hit on seven real units; the whole suite green once, committed; landed.

- 0.35.1, a view is no override (work/0.35.1-an-estimate-is-no-override), started 2026-11-05 (KWB-47).
  making: making-check judges what a turn did, not a view or a quotation; concepts: none (design/shape.json declares none); reuse: OVERRIDE (packs/base/hooks/making-check.mjs).
  done when: both cases seen red, then green, and the real override cases still refused; the whole suite green once, committed; landed.

- 0.36.0, straight on (work/0.36.0-straight-on), started 2026-11-05 (the MPX 500 panel copied its photograph's angle and damage).
  making: a rule for basic UX on any UI, and analyse-reference-look learns the object from the photograph; concepts: none (design/shape.json declares none); reuse: analyse-reference-look (packs/audio-core/skills).
  done when: the rule loads on UI code and the skill carries the steps; the whole suite green once, committed; landed.

- 1.0.0, public (work/1.0.0-public), started 2026-11-05 (the first public release on npm).
  making: the package made public, with what assumed one machine taken out; concepts: none (design/shape.json declares none); reuse: DEFAULTS (packs/base/hooks/git-guard.mjs).
  done when: the tarball holds nothing personal; the whole suite green once, committed; landed; published and read back from npm.

- 1.0.1, node_modules (work/1.0.1-node-modules), started 2026-11-05 (found by installing the published package in an empty folder).
  making: suggest leaves installed dependencies out; concepts: none (design/shape.json declares none); reuse: INSTALLED (lib/scan-detect.mjs).
  done when: the test seen red then green; the whole suite green once, committed; landed.

- 1.1.0, what fails silently or fails open (work/1.1.0-fail-open), started 2026-11-05 (the faults the MPX 500 build found).
  making: a hook's crash is its own entry and refuses once, a crash can be cleared honestly, doctor names an installed rule whose test nothing answers to, param-id-lock protects from the first id and leaves build output alone, suite-once sees the project's wrapper, a new install gets git-guard's house laws; concepts: none (design/shape.json declares none); reuse: logCall (packs/base/hooks/lib/event-log.mjs), hookProofProblems (lib/hook-proof.mjs), coverage (lib/coverage.mjs), buildLayout (lib/layout.mjs).
  done when: each fault's test seen red then green; the whole suite green once, committed; landed.

- 1.1.0, false refusals (work/1.1.0-false-refusals), started 2026-11-05.
  making: shape-law, making-check, code-shape, git-guard, lesson checks, once-only, dispatch-once and protect-vendor stop refusing what the MPX 500 build showed was correct, held against its real refusals both ways; concepts: none (design/shape.json declares none); reuse: findInstanceLiterals (packs/base/hooks/lib/shape.mjs), statementsOf (packs/base/hooks/lib/code-shapes.mjs), lastTurn (packs/base/hooks/lib/turn.mjs), kindsSwitched (packs/base/hooks/dispatch-once.mjs).
  done when: each fault's test seen red then green; every real refusal marked wrong passes and every one marked right stays refused, the stated exceptions apart; the whole suite green once, committed; landed.

- 1.1.0, new projects (work/1.1.0-new-projects), started 2026-11-05.
  making: a new project gets what it needs on its first day: the build queue the kit sends it to, suggest from its notes, a lock of every pack, doctor --strict that can pass, rules that agree with each other and with a reproduction's brief, a law for an unattended run; concepts: none (design/shape.json declares none); reuse: recommend (lib/scan-detect.mjs), coverage (lib/coverage.mjs), toDo (lib/doctor.mjs).
  done when: each fault's test seen red then green; doctor --strict passes on a new project; the whole suite green once, committed; landed.

- 1.1.0, what the build taught (work/1.1.0-build-laws), started 2026-11-05.
  making: the build's lessons as laws: a control is proved through its own input path, in a rule and in prove-control, and analyse-reference-look and the look gate hold what the MPX 500 panel had to work out alone; concepts: none (design/shape.json declares none); reuse: prove-control and analyse-reference-look (packs/audio-core/skills), ui-matches-reference-look (packs/audio-core/rules).
  done when: each law's test seen red then green; the whole suite green once, committed; landed; docs/1.1-report.md and docs/1.1-DONE written.

- 1.1.0, no silent red (work/1.1.0-no-silent-red), started 2026-11-05 (update on a copy of mpx500 turned doctor red through 21 rules: a new law must not).
  making: the ruleTests key is the choice, written on a first install; concepts: none (design/shape.json declares none); reuse: buildLayout (lib/layout.mjs).
  done when: an installed project stays green with a note, a new one is held; the whole suite green once, committed; landed.

- 1.1.0, the rust pack and the README for a new reader (work/1.1.0-rust-pack), started 2026-11-05 ("yes", and the review of "claude-packs through new eyes").
  making: a `rust` pack and configuration (rules, lesson checks measured on real crates, skills, a lint template, suggest and scan reading Cargo.toml), what the language table and blankers need to read Rust right, an install that works in a project with no package.json, and a README that starts from what a new reader needs; concepts: none (design/shape.json declares none); reuse: blanker and LANGUAGES (packs/base/hooks/lib/languages.mjs), blankCode (packs/base/hooks/lib/cpp-scan.mjs), ROWS and LEADS (lib/scan-detect.mjs), PRESETS (lib/packs.mjs), fresh and hookRun (test/kit-cli.mjs).
  done when: every check measured on real crates with its hits read; `suggest`, `init --auto`, `doctor --strict` and `scan` work on a real crate with no package.json; a refusal in the README is the exact text of a real run; npm test green once on committed work.

- 1.1.0, the postgres pack (work/1.1.0-rust-pack), started 2026-11-05 ("make a pack for that as well").
  making: a `postgres` pack: five rules, lesson checks measured on 1,937 real migrations and 2,903 source files, three opt-in checks that are right only on a live table, a `db-wipe-guard` hook, and suggest reading Postgres from a project; concepts: none (design/shape.json declares none); reuse: hitsOf (packs/base/hooks/lesson-checks.mjs) and its modes, judgeEvent (packs/base/hooks/lib/writes.mjs), holds and ROWS (lib/scan-detect.mjs), PRESETS (lib/packs.mjs).
  done when: every check measured on the corpus with its hits read; the hook's selftest seen red; doctor --strict passes on a Postgres project; npm test green once on committed work.

- 1.1.0, Rust's DRY laws (work/1.1.0-rust-pack), started 2026-11-05 ("we also need DRY rules/skills/hooks for rust as well").
  making: the repetition laws made true on Rust: a trait method is no function made again, `dispatch-once` reads `match`, rows read Rust calls, `once-only` and `dup` read `.rs`, the if-chain checks cover Rust, and a rule and skill say what a Rust repeat becomes; concepts: none (design/shape.json declares none); reuse: withoutTests and itemEnd (packs/base/hooks/lib/rust-scan.mjs), definesOf (near-copies.mjs), switchesOf (dispatch-once.mjs).
  done when: each case met on the scratch crate gives the right answer through the real hooks; scan on ripgrep lists no trait method as made again; npm test green once on committed work.

- 1.1.0, the offline VST3 renderer (work/1.1.0-vst3-host), started 2026-11-05 ("add it to claude-packs with a skill on how to use it").
  making: jp8000's tools/vst3host as a kit tool in the sound-design pack, split by job, on macOS and Linux, with the plugin an argument and no machine in it, and a `bounce-a-plugin` skill holding what it took to learn; concepts: none (design/shape.json declares none); reuse: the VST3 SDK inside a project's JUCE, found by build.sh; render.cpp's logic from jp8000 at 6c93a28.
  done when: it builds on Linux from a JUCE checkout, a real plugin bounces to a WAV twice with the same bytes, a sweep, a sysex file and --dump-params run on it, doctor passes the skill, npm test green once on committed work.

- 1.1.0, rules follow the code (work/1.1.0-rules-follow-code), started 2026-11-05 ("enforces folder structure from the beginning so rules work").
  making: base's cpp and js concepts following the layout's code folders, by a `followFolders` key a first install writes, a first install that adds the folders a project's source already lives in to its layout, and a `new-project` skill; concepts: none (design/shape.json declares none); reuse: filesOf (lib/scan.mjs), SOURCE (packs/base/hooks/lib/dup.mjs), buildLayout's seed (lib/layout.mjs).
  done when: a new install with C++ in lib/ passes doctor --strict with rules on it, folder-law takes a new file there and still refuses a stray one, an installed project's layout is unchanged by update, npm test green once on committed work.

- 1.1.0, work orders and the workflow on the front page (work/1.1.0-workorders), started 2026-11-05 ("a workorder.md template and tell people how they should write them").
  making: a `workorder <name>` command that scaffolds a prompt, steps and a runner, a `write-a-workorder` skill, README sections on what a project keeps and how it is tested, and `new` no longer defaulting to a synth pack; concepts: none (design/shape.json declares none); reuse: the PROMPT.md and runner of the MPX 500 and Matrix-12 runs, prompts/ for what the command prints, readFileSync as `survey` does (bin/claude-packs.mjs).
  done when: the scaffold writes real files and never overwrites, run.sh passes `bash -n`, `new` on no packs installs no synth pack, the README's claims are each a file or a hook that exists, npm test green once on committed work.

- 1.1.0, the web page (work/1.1.0-workorders), started 2026-11-05 ("add a github pages to claude-packs using this design").
  making: site/ on the design of the author's own page, its stylesheet and particles reused, with the kit's numbers held true by a test, and no deploy until the repo's visibility is chosen; concepts: none (design/shape.json declares none); reuse: site/css/main.css and site/js/section-particles.js from that design.
  done when: it renders at desktop and phone widths with no overflow, every file it loads exists, its counts match the kit, and it names no person.

- 1.2.0, comparing with a real machine (work/1.2.0-compare-to-the-machine), started 2026-11-05 ("thats what we usually do and why we made the vstplayer. so make that a skill in the kit").
  making: a `compare-to-the-machine` skill in sound-design: find a recording of the real machine, take its audio, identify the patch by its name on the display, render the same patch, and compare what a performance can show; concepts: none (design/shape.json declares none); reuse: vst3host and bounce-a-plugin (packs/sound-design), measure-a-law (packs/sound-design/skills).
  done when: doctor passes the skill, a test holds its lessons, the README counts are true, npm test green once on committed work.

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
- 2026-11-05: 0.34.0 a new reverse-engineering project: the gate ran once on 3607534, 341 of 341. On the real MPX 500 ROM --banked found the system table at 0x3A568 and the program directory unaided.
- 2026-11-05: 0.35.0 the foundation: the gate ran once on 6d788ad, 341 of 342: the timing check refused the raw byte compare the midi pack gives as correct, so it now judges only a second clock; the test passes alone on c00d581.
- 2026-11-05: 0.35.1 a view is no override: the gate ran once on e78f52d, 342 of 342.
- 2026-11-05: 0.36.0 straight on: the gate ran once on b21697b, 343 of 343.
- 2026-11-05: 0.36.1 git-guard judges a repo by its own remote, not the project's: the suite ran once, 341 of 343, the two reds the noop list, which named the selftest and then passed 3 of 3.
- 2026-11-05: 1.0.0 public: the gate ran once on b24333f, 343 of 343. The 0.35.0 line above this one was lost to a refused command: its gate read 341 of 342, and the test that failed passed alone on c00d581.
- 2026-11-05: 1.0.1 node_modules: the gate ran once on aa0037c, 344 of 344. Landed, not yet published.
- 2026-11-05: 1.1.0 group 1, what fails silently or fails open, landed from work/1.1.0-fail-open at 7e2710d; the gate 371 of 371.
- 2026-11-05: 1.1.0 group 2, false refusals, landed from work/1.1.0-false-refusals at f55d4df; the gate 398 of 398.
- 2026-11-05: 1.1.0 group 3, new projects, landed from work/1.1.0-new-projects at e7bf651; the gate 416 of 416.
- 2026-11-05: 1.1.0 group 4, what the build taught, landed from work/1.1.0-build-laws at f4a3ab6; the gate 429 of 429. 1.1.0 finished, not published.
- 2026-11-05: 1.1.0 no silent red: the gate ran once on e61cc57. Landed, not yet published.
- 2026-11-05: 1.1.0 the rust and postgres packs, Rust's repetition laws, a kit that works outside C++ and JS (KWB-75 to KWB-82), and the README for a new reader, landed from work/1.1.0-rust-pack; the gate 469 of 469 on 613be1c. Not published.
- 2026-11-05: 1.1.0 vst3host and bounce-a-plugin landed from work/1.1.0-vst3-host. The gate read 474 of 475 on 6f6e8d5: the kit's first C++ had no rule, so doctor --strict failed; the kit's layout now reads packs/**/*.cpp and *.h as cpp, and the failed test ran again green. Not published.
- 2026-11-05: 1.1.0 rules follow the layout, a first install reads where the code is, and the new-project skill (KWB-83), landed from work/1.1.0-rules-follow-code; the gate 481 of 481 on d668fb1. Not published.
- 2026-11-05: 1.1.0 work orders, the workflow on the front page and the web page landed from work/1.1.0-workorders; the gate 488 of 488 on 3938f98, then the tests the npm link and site/ reach. Not published, and the page is not deployed.
- 2026-11-06: 1.2.0 compare-to-the-machine landed from work/1.2.0-compare-to-the-machine; the gate 493 of 493 on a9d72b7. Not published.
- 2026-11-06: the on-screen keyboard and control-size laws, and window tests on a virtual display, on work/1.2.0-keyboard-laws.
- 2026-11-06: 1.2.0 keyboard laws, one size per kind and test-quietly landed from work/1.2.0-keyboard-laws; the gate 501 of 501 on 9953386.
- 2026-11-06: DOUBLE and TRIPLE beside KB OCT in house-control-behaviours, on work/1.3.0-keyboard-stops.
- 2026-11-08: 1.3.2 the overnight runs' hook faults (KWB-87 to KWB-91: time-guard judges its own session's processes, git-guard's SSH push and others' worktrees, build-guard's for lists and keywords, suite-once's listing flags, shape-law's picker accessor) landed from work/1.3.2-overnight-faults at 949b75c; the gate 485 of 487 on e42e08a, the two noop reds green run again on the listed change. Not published.
- 2026-11-08: 1.3.2 update keeps a project's looks (KWB-92), found by the Matrix-12 update, landed from work/1.3.2-layout-looks; the gate 124 of 124 on 4e11d3c. Not published.
- 2026-11-08: 1.3.2 shape-law's camelCase concepts and types in strings (KWB-93, KWB-94; Matrix-12 KF-32) landed from work/1.3.2-camel-concepts; the gate 487 of 487 on 4159896. Not published.
- 2026-11-08: 1.4.0 admiral-fleet's edits (the order's W0.0 and W4 depth, KWB-95) landed from work/1.4.0-admiral-fleet at 0866039; the gate 462 of 462 on 0866039. Not published.
- 2026-11-08: W0.0 of admiral-fleet (KWB-96: land-branch fast-forwards the main checkout, git-guard's Stop refuses a main checkout left behind) landed from work/W0.0-main-checkout at 194a20f; the gate 489 of 489 on 25bb50d; the main checkout equal to origin/main. Not published.
- 2026-11-08: W0 and W1 of admiral-fleet (set up; full-stack chooses web, go, host-agent, shell-hooks) landed from work/W1-full-stack-chooses at ecde48c; the gate 469 of 469 on bbbe033; the main checkout equal to origin/main. Not published.
- 2026-11-08: W2 of admiral-fleet (the tenant law judges Go) landed from work/W2-tenant-law-go at f747567; the gate 484 of 484 on a2bbe6e; the main checkout equal to origin/main. Not published.
- 2026-11-08: W3 of admiral-fleet (one full-stack layout under packages/; KWB-97, KWB-98, KWB-99) landed from work/W3-packages-layout at 8ba6525; the gate 482 of 484 on ab9ea59, its two failures fixed and run again 13 of 13; the main checkout equal to origin/main. Not published.
- 2026-11-08: W4 of admiral-fleet (analyse-reference-look in base with depth measured; page-matches-reference-look) landed from work/W4-reference-look at e08dba9; the gate 490 of 491 on abd75c9, its failure fixed and run again 32 of 32; the main checkout equal to origin/main. Not published.
- 2026-11-08: 1.4.0 (admiral-fleet W5) landed from work/W5-release-1.4.0 at 9056bec; the gate 46 of 46 on d4403a2; tagged v1.4.0 and published to npm, dist-tag latest.
- 2026-11-08: W6 to W8 of admiral-fleet (admiralmcp's install proved on 1.4.0; the open items; the report) landed from work/W6-consumer-install at 5fc558f; the gate 48 of 48. The order's final checks: the full suite 517 of 517, doctor --strict --fresh OK, scan and logs kept in build/evidence/final. admiral-fleet DONE.
- 2026-11-09: KWB-100 and KWB-101 landed from work/1.4.1-runner-progress at 7a37c08; the gate 490 of 495 on ff6b7d9, its five failures fixed (global add's lib list, noop's lists) and their files run again, 9 of 9 and 3 of 3. Recorded here late, with the next branch.
