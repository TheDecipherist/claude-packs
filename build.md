# claude-packs: the build

## Rules for this file

- A step is ticked only when its "done when" was measured or seen in the opened app.
- Every step is built on its own branch and merged when done; its start and finish are in the log.

## Where we are

Started 2026-11-04 (the kit had no build.md before 0.11.0; earlier steps are in CHANGELOG.md and workflow-bugs.md).

## In progress

- 2.0.0 audit (work/2.0.0-audit), started 2026-11-13: the audit work order (docs/workorders/audit/workorder.md), W0 onward.
  making: the audit's micro units (rules, skills, checks, hooks, tools) in packs/<pack>/, the units.md ledger, evidence under build/evidence/W<n>/; concepts: none (design/shape.json declares none); reuse: scratchProject/runHook/verdicts (packs/base/hooks/lib/selftest.mts), runAsHook (hook-log.mts), writesOf (writes.mts), scripts/counts.mts, the lesson-check format.

- 2.0.0 w89-top (work/2.0.0-ts-w89-top), started 2026-11-13: W8.9 item 4, `claude-packs top`.
  making: the terminal monitor as `hook-proxy top` (Go, proxy/top*.go) plus the `top` command in lib/; concepts: none (design/shape.json declares none); reuse: newSampler and chooseSource (proxy/sample.go), jobFor and exchange (proxy/client.go), build-proxy.mts and lib/proxy-binary.mts (the binary and its cache), the daemon's `status` reply (resident.mts).

- 2.0.0 session 4 (work/2.0.0-typescript), started 2026-11-13: W11 row (a) filled, KWB-218 and KWB-219 (stale tests, a runs-alone marker), d-38, then W8.9 (one row per project, the stale agent rows, the lagging status.json, `claude-packs top`).
  making: one status-line row per project (run-projects.mts), a runs-alone marker for timing tests (run-tests.mts), W8.9 items 2 and 3 in run-status.mts; concepts: none (design/shape.json declares none); reuse: projectGroups (run-tree.mts), runRows (run-rows.mts), workLine (run-live.mts), runHeld (scripts/run-held.mts).

- 2.0.0 w11-report (work/2.0.0-ts-w11-report), started 2026-11-13: W11 items 2 and 3, report.md finished, showcase.md, whats-new-in-2.0.md and the test that holds their rows.
  making: report.md rows with ids, showcase and whats-new lines tied to rows, a test that reads the three; concepts: none (design/shape.json declares none); reuse: readText and scratchDir (packs/base/hooks/lib/files.mts).

- 2.0.0 w11-measure (work/2.0.0-ts-w11-measure), started 2026-11-13: W11 item 1, the after-measurements into build/evidence/W11/after.md and numbers.json.
  making: probes that replay the fixture with totals, count node starts, time a scripted feature task, read the daemon's RSS; concepts: none (design/shape.json declares none); reuse: makeScratch, settingsCommandOf, payloadOf (scripts/replay-lib.mts).

- 2.0.0 w11-ab (work/2.0.0-ts-w11-ab), started 2026-11-13: W11 item 0, the five A/B tasks compared with the originals in docs/workorders/typescript/ab.md.
  making: ab.md assembled from scripts/ab-compare.mts rows, the clones' gate runs and logs; concepts: none (design/shape.json declares none); reuse: compareRow and summariseTranscript (scripts/ab-compare.mts, ab-transcript.mts).

- 2.0.0 kwb216 (work/2.0.0-ts-kwb216), started 2026-11-12: KWB-216, a hook past the deadline sends the whole event to the TypeScript path, never a partial verdict.
  making: resident/event.mts overDeadline, scripts/soak-verdict.mts (the soak counts a partial verdict as a difference); concepts: none (design/shape.json declares none); reuse: logCall, overTime, the fallback reply.

- 2.0.0 kwb215 (work/2.0.0-ts-kwb215), started 2026-11-12: KWB-215, making-check judges only the lines a turn added, comments blanked, and a making line's prose is no concept.
  making: addedConceptText in hooks lib making-concepts.mts used by making-check-turn.mts, and unknownConcepts reading only single-word items; concepts: none (design/shape.json declares none); reuse: languageOf/blank (hooks lib languages.mts), gitRun (git-run.mts).
- 2.0.0 ab-prep (work/2.0.0-ts-ab-prep), started 2026-11-12: W11.0's preparation, the five bandwarp tasks picked and set up.
  making: scripts/ab-pick.mts (list, seed, draw) and scripts/ab-compare.mts (one task's row) with lib/ab-*.mts parts and test/unit/lib/ab-compare.test.mts; concepts: none (design/shape.json declares none); reuse: readJson/isRecord (hooks lib json.mts).
- 2.0.0 gov-route (work/2.0.0-ts-gov-route), started 2026-11-12: W8.8 items 3, 4 and 5: `governed`, the Bash routing by updatedInput and the Agent slot, the watchdog's pause and resume; `load ask` answered by the Go client.
  making: packs/base/tools/governed.mts, packs/base/hooks/governor-route.mts (heavy-form table in hooks lib governor-route-table.mts), resident/governor-pause.mts, the daemon's `load` message and `hook-proxy load`; concepts: none (design/shape.json declares none); reuse: take/free/queueUp/settingsFor/pauseOrder/resumeOrder/setPaused (hooks lib governor.mts), napSync (governor-store.mts), the shell segment reader (hooks lib), machineHost (governor-budget.mts).
- 2.0.0 gov-core (work/2.0.0-ts-gov-core), started 2026-11-12: W8.8 items 0, 1, 2 and 6, the load governor's owner, `load ask|take|free`, the build queue folded in, the status line's field.
  making: packs/base/hooks/lib/governor.mts (budget, ask, take, free, jobs, settingsFor) and its CLI (lib/load-cli.mts), buildq on it, the status line's governor segment, the `load` skill; concepts: none (design/shape.json declares none); reuse: alive (hooks lib daemon-find.mts), capJobs/budgetEnv (hooks lib core-budget.mts), readJson/isRecord (hooks lib json.mts).
- 2.0.0 pool (work/2.0.0-ts-pool), started 2026-11-12: the daemon's pool at 2 warm, grown to 8, idle 2 minutes.
  making: resident/pool.mts (clock and growth step as options), resident.mts + options.mts (--pool is the maximum, --warm the start), tests in resident-parts, live-event-speed bounds; concepts: none (design/shape.json declares none); reuse: startPool (resident/pool.mts), the FLAGS table (resident/options.mts).

- 2.0.0 commit-cost (work/2.0.0-ts-commit-cost), started 2026-11-12: git-guard's and kit-fresh's commit/push/merge calls without a process.
  making: lib/git-config.mts (remote URLs and branch upstreams read from the config files, no process), git-guard and kit-fresh read HEAD, refs and the common dir from the git dir's files; concepts: none (design/shape.json declares none); reuse: gitDirsOf/currentHead/refSha (lib/git-files.mts), refsFingerprint.
- 2.0.0 w10b-soak (work/2.0.0-ts-w10b-soak), started 2026-11-12: W10b items 1 and 2, the soak and the leak checks.
  making: scripts/soak.mts (+ soak-client, soak-probe, soak-inspect, soak-heap parts), scripts/replay-lib.mts taken out of replay-play, a sampler memstats line (proxy/sample_memstats.go), test/integration/soak-leaks.test.mts; concepts: none (design/shape.json declares none); reuse: makeScratch/payloadOf from replay-play (now scripts/replay-lib.mts), daemonsOf (hooks lib daemon-find.mts), proxyRig/fire/pidOf (test/integration/proxy-fire-rig.mts).

- 2.0.0 w11-graph (work/2.0.0-ts-w11-graph), started 2026-11-12: W11 item 4, the README's performance graph.
  making: scripts/counts-graph.mts (numbers.json to two SVGs and a table), their GENERATED files and the README's performance block; concepts: none (design/shape.json declares none); reuse: between/renderAll (scripts/counts-render.mts), readJson (hooks lib json.mts).

- 2.0.0 session 2 reds (work/2.0.0-ts-reds), started 2026-11-12: the four reds of the gate, made to measure what they mean.
  making: tests and one selftest judged by counts and by the slow GitHub's own end instead of wall time; concepts: none (design/shape.json declares none); reuse: slowGitHub (lib/stop-cache-selftest.mts), proxyRig (test/integration/proxy-fire-rig.mts).
- 2.0.0 session 2 kwb208-210 (work/2.0.0-ts-kwb208-210), started 2026-11-12: KWB-208 and KWB-210 fixed, selftest cases red first.
  making: kit-fresh's newer-work list leaves out a later-version branch stacked on this checkout's branch; no-polling passes a wait on a process (`tail --pid=N -f /dev/null`); concepts: none (design/shape.json declares none); reuse: kitVerdict (lib/kit-fresh-look.mts), pollingIn (lib/polling.mts), kitRepo in the selftest.

- 2.0.0 w10b-owners (work/2.0.0-ts-w10b-owners), started 2026-11-12: W10b findings 1 to 7, one owner per shared constant.
  making: packs/base/hooks/lib/proxy-wire-table.mts (the one table), scripts/wire-gen.mts (proxy/wire_gen.go and the second-copy check), resident/options.mts (the daemon's flag table); concepts: none (design/shape.json declares none); reuse: daemonFiles/cacheFolder (lib/proxy-wire.mts), alive (lib/daemon-find.mts), hookLogLine (lib/hook-log.mts).
- 2.0.0 w10b-paths (work/2.0.0-ts-w10b-paths), started 2026-11-12: W10b review findings 8 to 20, each test red first.
  making: the daemon's closed error paths and owned state (serve/stop, socket deadlines, gathered frames, start lock, killGroup, Go client death, spawn errors, buildOne temp, usage store); concepts: none (design/shape.json declares none); reuse: startPool/listen/takeStartLock (resident/), askDaemon/startDaemon (lib/proxy-client.mts), the resident selftest rig (resident/selftest-rig.mts).
- 2.0.0 w10b-fuzz (work/2.0.0-ts-w10b-fuzz), started 2026-11-12: W10b item 3 (fuzz of the wire, go test -race, vet, staticcheck) and review finding 21 (the macOS sampler's start check).
  making: proxy/fuzz_test.go, test/unit/hooks-lib/proxy-wire-fuzz.test.mts, the sampler's self-check in proxy/sample_darwin.go; concepts: none (design/shape.json declares none); reuse: newRig/serve (proxy/selftest.go), listen (resident/socket.mts), encodeRequest/decodeRequest (lib/proxy-wire.mts).

- 2.0.0 w10-rows2 (work/2.0.0-ts-w10-rows2), started 2026-11-12: KWB-137, KWB-135, KWB-115 fixed, each test red first.
  making: inside-the-project's enclosing main checkout, idle-wake's soft import or a hook-level needs, protect-vendor's delete of a buildOutput; concepts: none (design/shape.json declares none); reuse: insideProject/checkoutRoot (packs/base/hooks/lib/project.mts), switches (lib/switches.mts), writesOf (lib/writes.mts).

- 2.0.0 KWB-199 (work/2.0.0-ts-kwb199), started 2026-11-12: agents-held lets a background agent start and refuses the end of a turn while one is pending.
  making: packs/base/hooks/lib/background-agents.mts (pending background agents of a transcript) and agents-held's Stop judge, the rule and skill text; concepts: none (design/shape.json declares none); reuse: readText/lines (lib/files.mts), pass/refuse (lib/verdict.mts), the Stop shape of making-check.
- 2.0.0 session 2 budgets (work/2.0.0-ts-budgets), started 2026-11-12: doctor --strict green on the live install's event budgets.
  making: git-guard's law 9 off the network, kit-fresh and repo-litter kept answers, the daemon's indexes built at start, once-only-index's Post cost in a worktree; concepts: none (design/shape.json declares none); reuse: refreshLater (lib/stop-look.mts), remoteHeads (lib/remote-heads.mts), the proxy fire rig (test/integration/proxy-fire-rig.mts).

- 2.0.0 KWB-204 (work/2.0.0-ts-kwb204), started 2026-11-12: polling in a sleep loop refused in every project.
  making: packs/base/hooks/no-polling.mts and its shared function, build-guard without its polling part, the pack row, the worktree case, the test; concepts: none (design/shape.json declares none); reuse: blankQuotes/dropHeredocs (lib/shell-lex.mts), judgeVerdict (lib/writes.mts), the no-find hook's shape, the build-guard polling plants.
- 2.0.0 session 2 rss (work/2.0.0-ts-rss), started 2026-11-12: the daemon's RSS with 16 workers after 1,000 events, measured and brought down.
  making: the measuring probe (build/rss-probe, scratch), the pool's and worker's memory changes in packs/base/hooks/resident/, the RSS case of test/integration/live-event-speed.test.mts, agents/rss.json and rss-report.md; concepts: none (design/shape.json declares none); reuse: startPool (packs/base/hooks/resident/pool.mts), fire/fireAsync/pidOf (test/integration/proxy-fire-rig.mts), the live rig (test/integration/live-event-speed.test.mts).
- 2.0.0 W8.6 (work/2.0.0-ts-w86-status), started 2026-11-12: the status line served by the daemon.
  making: packs/base/hooks/lib/agent-board.mts (the live agents, kept as events arrive), resident/status.mts (the daemon's render), packs/base/tools/statusline-agents.mts and statusline-version.mts (the agent rows, the red dot), proxy/status.go (`hook-proxy status`), the picker's status case, refreshInterval 1; concepts: none (design/shape.json declares none); reuse: statusBar (packs/base/tools/statusline.mts), usageOf/agentOwner/sessionOwner (resident/usage.mts), newestOnNpm/compareVersions (hooks/lib/kit-fresh-look.mts), askDaemon (hooks/lib/proxy-client.mts), parseStatusV2 (statusline-work.mts).

- 2.0.0 session 2 (work/2.0.0-typescript; agents work/2.0.0-ts-{w86-status,rss,kwb205,kwb204}), started 2026-11-12: W8 reopened closed on live numbers, W8.6, KWB-199/204/205/206, W10's findings, W11, W12.
  making: briefs/S2-wave1.md, the merges, progress.md lines, the KWB-199 probe (build/evidence/KWB-199), W11's report and showcase; concepts: none (design/shape.json declares none); reuse: the order's existing scripts (scripts/release.mts, scripts/counts.mts, scripts/test-changed.mts).
- 2.0.0 KWB-205 (work/2.0.0-ts-kwb205), started 2026-11-12: a hook past its deadline takes its children with it.
  making: lib/child-group.mts (children spawned detached, killed as a group), the pool's abandon/drop/close kills, the runner's and the selftest rig's group kill, test/hooks/base/hook-children.test.mts; concepts: none (design/shape.json declares none); reuse: startPool and the worker message types (resident/), runHook (lib/selftest.mts), scratchDir/put (lib/files.mts).

- 2.0.0 W9 (work/2.0.0-ts-w9-release), started 2026-11-11: the release in one command, measured on a local registry.
  making: scripts/release.mts and its parts (release-version, release-state, release-steps), their tests, the measuring script scripts/measure-release.mts; concepts: none (design/shape.json declares none); reuse: gitRun/gitOut/gitLines (packs/base/hooks/lib/git-run.mts), readText/put/scratchDir (files.mts), parseJson/readJson/writeJson (json.mts), buildProxy/releaseCheck (scripts/build-proxy.mts), the test picker (scripts/test-changed.mts).

- 2.0.0 W8.5 (work/2.0.0-ts-w8-ts), started 2026-11-11: TypeScript enforced in projects (d-5).
  making: lib/ts-project.mts (devDependency, strict tsconfig, LSP declaration, doctor's problems), packs/js-ts/checks/typescript-only.json and its rule, the sync and doctor calls, tests; concepts: none (design/shape.json declares none); reuse: readJson/writeJson/toJson (packs/base/hooks/lib/json.mts), readSettings (lib/settings.mts), switches (lib/switches.mts), the pack-template check gate.

- 2.0.0 W5 (work/2.0.0-typescript; agents work/2.0.0-ts-w5-{d,a,b,c}), started 2026-11-11: the tests in three tiers on one install per configuration.
  making: test/unit, test/hooks/PACK, test/tools/PACK and test/integration files from the 87 root tests, the fixture builder, the per-version manifest and its noop, repo-lint's readers, briefs/W5-tier.md; concepts: none (design/shape.json declares none); reuse: fixture (test/fixtures/installs.mts), git, hookRun, projectWith, fresh (test/kit-cli.mts), runHook and verdicts (packs/base/hooks/lib/selftest.mts).

- 2.0.0, the kit in TypeScript (work/2.0.0-typescript, from work/1.9.0-platforms), started 2026-11-11, the order docs/workorders/typescript/ (W0-W12), run unattended from its PROMPT.
  making: W0 set up (decisions d-1..d-13, the order's folders in layout.json, the admiral merge, the four stale KWB rows closed, the version pins, the baseline (a)-(l), suite-once's two planted prompts); then each step as workorder.md says; concepts: none (design/shape.json declares none); reuse: the foundation workorder.md lists (lib/sync.mjs, run-hooks.mjs, selftest.mjs, json.mjs, shell-lex.mjs, scripts/test-changed.mjs, scripts/release.mjs).
  done when: as each step of docs/workorders/typescript/workorder.md says; progress in docs/workorders/typescript/progress.md.

- 1.9.0, the same on Linux, macOS and Windows (work/1.9.0-platforms, stacked on work/1.8.2-agents), started 2026-11-11, from the user: "you need to go over all bash commands and verify what works on windows vs mac and fix all of them in one go" (KWB-152; the audit of 25 places, 2026-11-11).
  making: the status line's git in one `git status --porcelain=v2 --branch`, cached on the index and HEAD; the hooks of one event in one runner process (heartbeat in it); shell-traps refusing a BSD form only where the GNU build is first on PATH; `global add` setting the Bash tool's shell to a bash 5 it finds; quiet-test polling the front app once a second with one call; Windows: `fileURLToPath` in every selftest, no `sh`/`touch` fakes, `shell: true` for `.cmd` programs, `py -3`; a `sed -i` judged in JS where no GNU sed is found; pdf-to-md without `pgrep -c`, the audio rule without `xvfb-run`; `workorder start` (detached on every system); time-guard reading `\` paths; concepts: none; reuse: gnu-shell's `prefix`/`gnubin`, the runner's `throughRunner`, shell-writes' `afterText`.
  done when: each fix has a test that runs it as the other system would (a planted platform, a planted PATH), seen red before the fix; the kit's suite green on the Mac; the tests the branch reaches green against main.
- 1.9.1, the AdmiralMCP skill (work/1.9.1-admiral-skill, from main 7363e73; lands after 1.9.0), started 2026-11-11, from the user: "make an admiralmcp skill in claude-kit so you know how to use it properly".
  making: packs/admiral (a stock pack, chosen with `add admiral`), its skill `drive-a-session-through-admiral`: setting up a machine's channel (built, the user-scope `admiral` entry, the project declared, the signal hook, `server:admiral`), proving the line with one harmless message, one instruction per message with progress and a final, answering a planner question, replies as data, secrets never printed, one session changing the kit at a time; concepts: none; reuse: the kit's skill format (doctor's "Use when" and 8,000-character checks).
  done when: doctor --strict passes the skill on a scratch install of `admiral`; the README lists the pack with its counts; the tests the branch reaches green against main.
- 1.8.1, the runs of other machines (work/1.8.1-remotes, stacked on work/1.8.0-statusline), started 2026-11-10, from the user, as the BANDWARP run moves to the Mac: "but we still need to get some kind of report here for whats happening".
  making: packs/base/hooks/lib/run-remotes.mjs (the machines listed in ~/.config/claude-packs/remotes.json, each asked over ssh for its `status --json` through the kit in a project there, at most 20 s, its runs marked with its name; a machine that cannot be reached is a row that says so); runsReport adds them; runRows names a run's machine before its project; concepts: none; reuse: json's readJson/parseJson, run-status's runsReport and runRows.
  done when: test/run-remotes.test.mjs proves a remote's runs merged and named, the command it runs (BatchMode, a timeout, the kit in the named folder), an unreachable machine reported as a row, a missing or broken config as no remotes, and the status line drawing a remote run; each seen red; the tests the branch reaches green against main.
- 1.8.0, the kit's status line (work/1.8.0-statusline, stacked on work/1.7.3-status), started 2026-11-10, from the user: "the statusline should be part of claude-packs because thats how users going forward will see everything thats working and where it is".
  making: packs/base/tools/statusline.mjs (the bar: first on the top line the kit version this project runs, from its lock beside the tool (the user: "the very first field on the top line should be the claude-packs version number"), then model, effort, context, quotas or session cost, git, the last tool and command from the transcript, then the runs), statusline-paint.mjs (colours, width), statusline-session.mjs (the stdin session), statusline-work.mjs (git and the last tool), statusline-runs.mjs (the RUNS rows from a cache, refreshed detached every 30 s); run-status.mjs and run-discovery.mjs moved from lib/ into the hooks lib with lib/ re-exporting them, so the installed bar and `status` share one reader; `status --json [--out <file>]`; pack.json `statusLine`, written by syncSettings only where the project has none or has the kit's, `layout.disable` switching it off; concepts: none; reuse: the hooks lib's run-status (orderStatus), run-discovery (runningOrders), shell-writes (readText).
  making (2): packs/base/hooks/heartbeat.mjs, async on every tool call before and after, onByDefault, never refusing: each agent's heartbeat (time, before or after, tool, what it works on) in the main checkout's .claude/logs/heartbeats/<worktree>.json, lead.json for the checkout itself, only inside the project; run-status reads it per agent and the rows say what each agent is doing now and how long ago, red after 10 minutes with nothing (the user: "a user will think that its crashed if it doesnt update regularly", "it should be the hooks themselves that do it"); concepts: none; reuse: hook-log's asHook, selftest's scratchProject/runHook, json's writeJson.
  done when (2): heartbeat --selftest plants a call in a worktree, a call naming a worktree path from the main checkout, a call in a sibling project and a broken event (each seen red without its fix); its worktree case; test/statusline.test.mjs proves an agent active seconds ago, one running a long call, one quiet past 10 minutes.
  done when: test/statusline.test.mjs proves the bar's rows from a session payload, a transcript and a runs cache (project, agents, the lead's step, a stale cache dim, a quiet agent red), the refresh writing the cache from a scratch run, a corrupt stdin or cache never breaking a render, and syncSettings writing the statusLine into a project with none, keeping a project's own, and leaving it out when disabled; each seen red; the tests the branch reaches green against main.
- 1.7.3, `claude-packs status` (work/1.7.3-status), started 2026-11-10, from the user: "make that part of the core kit. it reports which projects its working on, how many agents per project, where they are, and how much is left", every 15 minutes.
  making: lib/run-status.mjs (one order's progress: its status.json, else derived from workorder.md and the progress lines of the main checkout and every agent worktree), lib/run-discovery.mjs (the runs alive on this machine, from their processes), lib/status-cli.mjs (`status`, `--all`, `--watch <minutes>`); the PROMPT template asks every run for status.json and each agent for its own file; concepts: none; reuse: lib/workorder.mjs (the order's folder), the hooks lib's git helpers.
  done when: test/run-status.test.mjs proves the counts from a status.json, the same counts derived with no status.json, an agent's file read from its worktree, a finished step counted whole, the discovery of a run from its process, and --watch printing on each tick; each seen red; the tests the branch reaches green against main.
- 1.7.2, smoothing always on (work/1.7.2-smoothing-always), started 2026-11-10, from the user: "smoothing should be completely automatic and never opt in".
  making: realtime-guard's smoothing check on in every project with audio-core, by convention without guards.smoothing, never off; a bypass done in one sample refused; the rule saying so, and that every switch crossfades; KWB-145; concepts: none; reuse: lib/smoothing-checks.mjs's shapes, the hooks lib's conceptGlobs and foldersOfKind.
  done when: realtime-guard --selftest passes 39 cases, the default-on and bypass cases seen red before the fix; the tests the branch reaches green against main.
- 1.7.1, the README step (work/1.7.1-readme-step), started 2026-11-10, from the user: "a final step when the UI is completed that a full pro README.md is made with a screnshot of the unit on top".
  making: base's skill `write-the-readme` (a front page written last, the product's own screenshot on top, never a mock-up); a README step in the plugin, rebuild and generic work-order templates, after the UI and before the last review; concepts: none (design/shape.json declares none); reuse: the `humanize` skill for the last pass, the templates' step form.
  done when: every template has the README step naming the skill, test/workorder.test.mjs holds it (red without it); the skill passes doctor's form (Use when, under 8,000 characters) and base-neutral; the tests the branch reaches green against main.
- 1.6.1, quoted words in image prompts (work/1.6.1-quoted-labels, stacked on work/1.6.1-release), started 2026-11-10, from a mock-up that came back with invented labels: every word an image prompt wants drawn exactly goes in double quotes.
  and: a misspelled word is never a reason to render again; the build draws every word from the order, in code (the user, 2026-11-10).
  making: a law in planner/ui-mockup, the same in the walkthrough's 5.1 and start-from-a-workorder's image prompt; concepts: none (design/shape.json declares none); reuse: the planner test's file readers.
  done when: test/planner.test.mjs holds each of the three places to the quoting law, seen red without it; the tests the branch reaches green against main.
- 1.6.1, release and disclaimer (work/1.6.1-release), started 2026-11-10, from the user's notes on the public GitHub and npm pages: a disclaimer on both, the GitHub link on npm's front page, and a GitHub release made at every publish by one script.
  making: DISCLAIMER.md (shipped) and a README section; the README's GitHub link at the top; scripts/release.mjs (`npm run release`: the checks, npm publish, the tag, the GitHub release from the CHANGELOG's section, each step skipped when already done so a stopped release resumes); concepts: none (design/shape.json declares none); reuse: scripts/test-changed.mjs's form for a kit script, package.json `scripts`.
  done when: the README and the npm package carry the disclaimer; test/release.test.mjs proves the notes taken from the CHANGELOG, the checks that refuse (not on main, a dirty tree, no CHANGELOG section, a tag already pushed) and the order of the steps in a dry run, each refusal seen red with its check taken out; the tests the branch reaches green against main.
- 1.7.0, a menu is one route table (work/1.7.0-route-table), started 2026-11-10, from the user: a menu system like the V-Synth's must be ironclad, and a Mermaid diagram fits its shape. The table is the source; Mermaid is drawn from it.
  making: instrument-shell's rule `menu-is-one-route-table`; its tool `route-table.mjs` (check: one outcome per page and input, every page reached, every page has a way back to the start, every input routed or declared inert, every overlay closes; mermaid: one diagram per branch); menu-map's routes read from the firmware with the manual as the check; KWB-141 (the picker's planner row); concepts: none (design/shape.json declares none); reuse: source-ledger.mjs's form for a pack tool, test/kit-cli.mjs.
  and: what a layer hides does no work (the user, 2026-11-10: "everything under the layer that is not visible should no longer be rendered/moved/animated"): instrument-shell's rule `hidden-under-a-layer-is-idle` and skill `prove-hidden-is-idle` (the gate: paints and ticks of what an opaque layer covers counted over a second, 0, with a planted fault; what shows through a translucent layer still drawn; one repaint at close; sound untouched); reuse: gpu-painter's `gpu-frame-pacing-and-power` (the editor-level law), hit-the-painted-control's form.
  and: the settings layer owns the devices (the user, 2026-11-10: a plugin whose own settings set MIDI and audio shows no JUCE "OPTIONS" button; the layer chooses the MIDI source, has "Enable QWERTY", scrolls, tabs on top): audio-core's rule `settings-layer-owns-the-devices` (a custom standalone app round `StandalonePluginHolder`, its one `AudioDeviceManager`, the standard rows, tabs along the top, each tab scrolling); ui-mockup gains the settings layer as a screen of every plugin; reuse: synthcore's QWERTY (synth-creator's `timing-from-synthcore`), audio-core's `house-control-behaviours` form.
  done when: test/route-table.test.mjs plants each fault (two outcomes, an unreached page, a trap, an unrouted input, an overlay with no close, a route to no page, an input no page has) and sees each red, a clean table green, and the Mermaid output parsed back to the same edges; the tool's --selftest plants its own faults; the tests the branch reaches green against main.
- 1.6.0, the planner (work/1.6.0-planner), started 2026-11-09, from the user's brief: the order docs/workorders/planner/ (W0-W9) run to its release, in the public repo.
  making: the order's PROMPT held to the kit's laws and the user's holds (one branch, no agents while the GT run holds the slots, the changed-tests gate, evidence under the order, release 1.6.0 since research-gaps took 1.5.0, W0.2 already in the first public commit); then its steps W0-W9 as workorder.md says; concepts: none (design/shape.json declares none); reuse: as each step names (lib/workorder.mjs `newWorkorder`, lib/claude-ai-skill.mjs `zipOf`, the pack skills design-a-preset and synth-cost).
  done when: as each step of docs/workorders/planner/workorder.md says; 1.6.0 published and installed clean with doctor --strict green.
  W0-W8 done; W9 landing and the release (1c63cff gate 575 of 575). W1 making: prompts/workorder/templates/{generic,plugin,rebuild}.md chosen by `workorder --template`, generic by default, an unknown name refused with the list; PROMPT.md template one branch per order and the changed-tests gate (KWB-128); concepts: none; reuse: lib/workorder.mjs `newWorkorder`, `workorderTemplates`.

- 1.6.0, the public repo (work/1.6.0-public), started 2026-11-09, after the user's "go public": the kit becomes a new public repo with one fresh commit; the private repo, with every branch, is renamed claude-packs-history.
  making: the public tree (main at d624b82, the planner branch's files, `planner` registered in the layout and package.json first, the old work orders and build/evidence left out), checked for secret values, names and emails, tested, then committed parentless as me@thedecipherist.com; package.json's repository link; KWB-132 fixed (`chart` kept through updates); concepts: none (design/shape.json declares none); reuse: lib/layout.mjs `OWNED`.
  done when: the public tree passes the tests its changes reach, no secret value, name or email is in it, the new repo's main is that one commit, and the private repo answers as claude-packs-history.

- 1.5.0, research-gaps (work/1.5.0-research-gaps), started 2026-11-09, from the user's brief `docs/workorders/planner/inputs/research-gaps-order-prompt.md` (work/1.5.0-planner, 76589d9): the order written and run to its release.
  making: the order `docs/workorders/research-gaps/` (workorder.md from the brief, PROMPT.md held to the kit's laws: one branch, no agents while the GT run holds the slots, the changed-tests gate, the release's yes); then its steps W0-W5: pluginval in gates-from-commit-one, editor-destruction-order with its check, chart-first with its hook, no-html-prototype, ui-drawn-in-code on by default, the house design laws as rules and design-a-preset; concepts: none (design/shape.json declares none); reuse: no-shipped-images and ui-drawn-in-code as the models, writesOf, insideProject, checkoutRoot, isContent.
  done when: as each step of `docs/workorders/research-gaps/workorder.md` says; 1.5.0 published and installed clean with `doctor --strict` green.

- 1.5.13, outside docs (work/1.5.13-outside-docs), started 2026-11-09 (KWB-127).
  making: `packs/base/hooks/lib/audience.mjs`, the `<!-- audience: outside -->` marker that makes shape-law and brief-guard skip a .md or .txt page addressed outside the project; concepts: none new; reuse: `writesOf`, the two guards' own selftest harness.
  done when: the selftests of both guards are red without the fix and green with it, and the gate `npm run test:changed -- --base origin/main` is green.
- 1.5.11, the rebuild template (work/1.5.11-rebuild-template), started 2026-11-09, after the user's "make me a workorder.md template based on all the workorders we have done to start a project that matches what we are doing so its easy to reuse for other builds".
  making: `prompts/workorder/workorder-rebuild.md`, a work order for rebuilding a hardware instrument as a plugin, drawn from the four rebuild orders (MPX 500 R, Matrix-12 M, CS6x, V-Synth GT) and what their runs taught; `workorder <name> --template rebuild` writes it in place of the blank steps; base's `start-from-a-workorder` skill (a finished order and its 16:9 design into the run) and `write-a-workorder` starting from the template; `claude-ai-skill`, a zip of `workorder-writer`, a guided interview for claude.ai that belongs to no pack, carries both templates and holds the order to the kit's laws (the user, 2026-11-09: "one big skill only since its for claude.ai", "literally a guided walkthrough", mock-ups always 16:9 with Nano Banana Pro, the OpenArt connector offered when present); README's Getting Started from idea to app; concepts: none (design/shape.json declares none); reuse: lib/workorder.mjs `newWorkorder` (the same three files, the same name and date filled in), its templates read by lib/claude-ai-skill.mjs `skillFiles`.
  done when: `workorder x --template rebuild` writes the rebuild steps with the name and date filled in, and the plain form still writes the blank ones; an unknown template is refused naming the ones there are, and nothing is written; every skill, rule and tool the template names exists in the kit (a test reads them); the README says how; the tests the branch reaches green.

- 1.5.10, agents held (work/1.5.10-agents-held, stacked on work/1.5.9-runner-waits), started 2026-11-09 (KWB-125, KWB-124), after the user's "so fix them when needed" and "go".
  making: run.sh waits out a usage limit (KWB-125) and says it runs unattended (`CLAUDE_PACKS_UNATTENDED=1`); a base hook, agents-held: refuses an Agent or Task call with `run_in_background: true` in a session with nobody there (that variable, or a `claude -p` parent), whose end stops every background agent; a base rule stating the law; concepts: none (design/shape.json declares none); reuse: selftest.mjs `scratchProject`, `runHook`, `verdicts`, `put`; writes.mjs `readPayload`; hook-log.mjs `asHook`.
  done when: the runner test red on the old runner and green; the hook's selftest red with a planted hook that refuses nothing and green; its worktree case; README counts; the tests the branch reaches green; vsynthgt updated and its layout enabling the hook.

- 1.4.8, names-sweep in one pass (work/1.4.8-sweep-speed), started 2026-11-09 (KWB-120), after the user's "so fix them when needed".
  making: one multi-pattern finder (tools/lib/multi-find.mjs: an index of every needle's first four bytes, one pass over the image, the full needle checked where four match) used by names-sweep's exact and shifted searches; the distance buffer made once per image; the results the same; concepts: none; reuse: unwrap.mjs `shiftedHits` and names-sweep `found` keep their contracts.
  done when: a planted 8 MB image with thousands of names sweeps in seconds, red against the old search under the same budget; every existing names-sweep test unchanged and green; the tests the branch reaches green.

- 1.4.7, a path names a file (work/1.4.7-paths-name-files), started 2026-11-09 (KWB-117, first logged as KWB-105, a number another branch took first), after the user's "so fix them when needed".
  making: in brief mode the instance reader blanks paths and file names before judging, so a brief listing files named for the machine's pages passes; concepts: none; reuse: shape-prose.mjs, where blankMessages lives.
  done when: brief-guard's KWB-117 case red without the fix and green with it, a path never excusing the instruction beside it; shape-law's selftest unchanged; the tests the branch reaches green.

- 1.4.6, inside-the-project leaves sibling projects alone (work/1.4.6-inside-siblings), started 2026-11-09 (KWB-104).
  making: inside-the-project judges a worktree command's target only when the git command acts on this project's repo; concepts: none; reuse: the hook's own gitFolder and insideProject.
  done when: the selftest's two sibling cases red without the fix and green with it; the real refused command passes from the claude-packs session; the tests the branch reaches green.

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
- 2026-11-09: KWB-125 (logged first as KWB-122) and KWB-124 landed from work/1.5.10-agents-held at 6f1802d, holding work/1.5.9-runner-waits: the runner waits out a usage limit, and agents-held keeps an unattended session's agents in the foreground. The gate 493 of 496 on c327232's parent, its three failures fixed (base named a product, the kit's own install lacked the hook, the page's counts) and run again green; after merging origin/main (making-check) the tests where the two sides meet, 34 of 34. Taken into vsynthgt at b16cc98. KWB-123 (test-verdict --help runs the whole suite) stays open.
- 2026-11-09: 1.5.11, from an idea to an app (the rebuild work order template, start-from-a-workorder, the claude.ai walkthrough skill and claude-ai-skill), landed from work/1.5.11-rebuild-template at bf3cd10; the gate 508 of 508 on bf3cd10. The user is rewriting the walkthrough in claude.ai: that text comes back into prompts/workorder/claude-ai-skill.md as its own change.
- 2026-11-09: 1.5.0 research-gaps (work/1.5.0-research-gaps), unattended: the gate (test:changed against origin/main) ran on 0937057, 503 of 503; landed on main at 856aef6 by land-branch, the main checkout fast-forwarded; published 1.5.0 and tagged v1.5.0; the published package installs clean and `new scratch --config synth-creator` passes doctor --strict. Report: docs/workorders/research-gaps/report.md.
- 2026-11-09 23:15 EST: 1.6.0 the planner (work/1.6.0-planner, order docs/workorders/planner): the gate `test:changed --base origin/main` ran once on 1c63cff, 575 of 575 in 1,458 s; landed on main by a fast-forward push; the main checkout left to fast-forward (KWB-137).
