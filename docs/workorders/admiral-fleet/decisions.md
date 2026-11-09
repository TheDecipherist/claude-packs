# admiral-fleet: decisions

Each choice made with nobody there: the question, the options, what was chosen and why. The user can overturn any of them.

## d-1: does straight-on-and-aligned travel with analyse-reference-look into base?

Decided in W4 (the work order names this one d-1).

## d-2: the package-lock.json drift from `npm install`

- Question: `npm install` in W0.0 rewrote package-lock.json (version 1.2.0 to 1.3.1, the `libc` fields dropped by this npm). Commit it now, restore it, or leave it?
- Options: commit on W0.0 (an unrelated change in a hook fix); restore it (git-guard refuses an undo on a dirty tree, and it is not this step's); leave it in the tree and commit it with W5's version bump, where the lockfile's version changes anyway.
- Chosen: leave it, commit it in W5. Easiest to reverse, and it keeps each step's commits to its own change.

## d-3: which hook enforces the main checkout's fast-forward (W0.0 item 3)

- Question: an existing hook or a new one refuses a turn that pushed the trunk while the main checkout's trunk lags the remote's?
- Options: a new Stop hook; git-guard's Stop, which already judges what the repo holds that GitHub does not (lib/pushed.mjs `stopVerdict`).
- Chosen: git-guard's Stop. It already looks up the remote's heads (cached, live before a refusal), counts identical send-backs and ends the session after three, and has its worktree case. A new hook would repeat all of that. The law is in a new lib, `lib/trunk-lag.mjs`, called from `stopVerdict`.
- How "a turn that pushed to the trunk" is read: the remote's trunk head is a commit this repo has (pushed from here: a worktree shares the object store) that the main checkout's trunk does not contain. A trunk commit pushed from another machine, one this repo lacks, is not judged.
- Refused only when the main checkout holds the trunk with no uncommitted change to a tracked file: that is the case the session can fix. With uncommitted work there, or another branch held, the land-branch skill says touch nothing, so the hook tells the user (a system message) and does not send the session back for what it may not do. Untracked files do not count: `merge --ff-only` refuses itself if one would be overwritten, and the work-order runner's own logs are untracked.

## d-4: where the four names go in full-stack's choose list, and what "its hooks merged" means for packs with none

- Question: W1 says languages before stacks, in the list's existing style; and the fixture asserts each pack's hooks were merged into settings.json.
- Chosen: `go` after `js-ts` (the languages), `shell-hooks` after `shell` (its kin), `web` after `react`, `host-agent` after `ci`. None of the four declares a hook in its pack.json today, so the fixture reads each pack.json's `hooks` and asserts every hook file it names is installed and in settings.json: zero today, and it holds the day one is added. Its rules and checks are asserted file by file.

## d-5: how the tenant checks take Go, and the Go repo they are measured on

- Question: a lesson check has one `bad` and one `good`; W2 wants a Go pair for each tenant check, measured on swarmk's daemon-go, with one more public Go repo allowed.
- Chosen, the format: a check may carry `"examples": [{ "bad", "good" }, ...]`, more pairs each proved by the lesson-checks selftest like the first (so doctor proves them). One pattern, the JavaScript and Go forms joined by `|`; `**/*.go` in the globs, `**/*_test.go` excluded. Separate Go check files were the other option; they would split one law into two ids and two rule citations.
- Chosen, the patterns: strict, one call each. A mongo-driver filter (`bson.M`/`bson.D`) or a `database/sql` WHERE whose value is read from the URL (`r.PathValue`, `chi.URLParam`, `mux.Vars`, `c.Param`, `URL.Query()`) on the same call, with no tenant key; a role compared with owner that empties a filter or sets `_id`. The loose form (any WHERE without a tenant column) hits 62 times on HitKeep, nearly all right (the users and tenants tables themselves), so it is not shipped.
- The measurement: daemon-go has none of the shapes (no database driver, no URL reads, no role checks: the agent is stdlib only and the fleet spec gives it no database credentials). The first extra repo tried, go-saas/kit (gorm and protobuf requests), had none either, so it measured nothing. HitKeep (HitKeep/hitkeep at 34a6d0f, MIT, a multi-tenant analytics service with raw SQL) has them: 141 WHERE calls, 142 URL reads, 15 role comparisons. Both checks: 0 hits on all three (1,130 files). The 15 role comparisons were read one by one: guards, defaults, audits, chat roles, none a cross-tenant filter. In HitKeep the URL value goes into a variable in the handler and the query runs in the store, so a one-call pattern cannot see a missing tenant key there. That is the ambiguity W7 lists: the Go patterns are proved on their samples and clean on 1,130 real files, never seen to catch a real fault.

## d-6: what an existing full-stack project gets from the new template, and the `channel` concept

- Question: W3 moves the template under packages/ and drops `channel`. What happens to a project installed with the old template, and to the full-stack pack's `channel` and `ui` concepts, which named that folder?
- Found: `update` wrote the new template's web folders into such a project, beside its own `channel/` (KWB-97). Chosen: a configuration's template seeds folders and concepts on a first install, or when a project takes that configuration; a project already of it owns its layout (lib/layout.mjs `buildLayout`). The other option, listing the three new folders as expected in the noop test, would have shipped the fault.
- The concept keeps its name, `channel`, and now names the `web` folder (so does `ui`). Renamed, an existing project's own `channel` row (pointing at its `channel/`) would no longer be read by the stack rule, and the rule would fall to a folder it does not have. The name is internal; the folder is what a reader sees.
- `pages`, `components` and `client` map onto `web-app`, `web-components` and `web`; the web pack's own globs are added to them, so `**/app/**/page.tsx` still holds anywhere.

## d-7: evidence that names the machine, and this order's own runner logs

- Question: the no-personal-name test failed on this run's own files: the evidence printed the home path, and the runner's session logs (whole transcripts) sat untracked in the order's folder.
- Chosen: the evidence is written with the home folder as `~` (the same path without the user's name), the files already kept rewritten the same way, nothing else in them changed. The runner template now ignores its logs (KWB-98). This order's run.sh is the script running this session, and bash reads a running script as it goes, so it is not regenerated mid-run; its logs folder gets the same one-line `.gitignore` by hand.

## d-1: does straight-on-and-aligned travel with analyse-reference-look into base?

- Question: the skill's first line said "Read `straight-on-and-aligned` first: it governs every decision below". Is that rule needed by a web page too?
- Options: move the rule to base, trimmed of synth words; or trim the skill's line and leave the rule in audio-core.
- Chosen: trim the line, the rule stays in audio-core. Read whole, the rule is about drawing hardware from a photograph: a panel is a flat rectangle, rack ears and screw holes mirror, a knob's cap, skirt, pointer and ticks share a centre, one bend moves everything near it. A web mock-up is already drawn straight on. What a page needs of it is already in the skill (separate the object from the picture, rectify against an anchor, snap to the grid, a measured offset smaller than the spacing is error, geometry checked on its own), and in ui-craft's page rules. The line now reads: where the project has the rule (an editor drawn from a photograph of hardware), read it first. Easiest to reverse: moving the rule later is one file.
- What else the move changes: skill-first's design-reference row applies wherever the skill is installed, so from this release every project that installs base has it. A project with pictures under a `reference/` or `mock-ups/` folder is refused a read of one until the skill is loaded. That is W4's purpose; the CHANGELOG says so.

## d-8: W5's check from a clean folder

- Question: W5's "done when" runs `npx --no-install @thedecipherist/claude-packs@1.4.0 configs` from a clean folder. `--no-install` never downloads (the point of KWB-28), so in an empty folder that command can only fail ("npx canceled due to missing packages").
- Chosen: run it as written and keep its refusal, then the form the kit tells every user: `npm install -D @thedecipherist/claude-packs@1.4.0` in the clean folder, from the registry, and `npx --no-install @thedecipherist/claude-packs configs`, which lists W1's four names under full-stack (build/evidence/W5/npx-clean-folder.txt). Changing the command to `npx -y` would prove the same package, with a download the kit never prescribes.

## d-9: what is admiralmcp's in W6

- The install block cannot install the published kit in admiralmcp as written. `packages/kit-standin` is a workspace package named `@thedecipherist/claude-packs` (0.0.0-standin, exporting `./brief-guard`, imported by `packages/core/src/lifecycle/guard.ts`), and a workspace asks for it by that name. `npm install -D @thedecipherist/claude-packs@1.4.0` links the stand-in and writes `^0.0.0-standin`; with the stand-in taken out, npm cannot resolve the workspace's request. This is the project's: before the install block, the stand-in leaves and `guard.ts` gets its brief-guard from its own code (the kit ships brief-guard as a hook, not as an importable module). Not changed in the kit.
- To prove the kit anyway, the published 1.4.0 was installed beside the clone and run with the block's exact arguments (`init --config full-stack --layout docs/layout.admiral.json` and the 14 packs, then `doctor --strict`).
- `docs/layout.admiral.json` was written from the spec's folder table (build/evidence/W6/layout.admiral.json). It names only the concepts a rule reads by name (schemas, db-gateway, routes, handlers, adapters, pages, components, client, ai); go, host-agent, docker and stored-text load by their packs' own globs, and on a first install a concept the seed names replaces the pack's globs, so naming them would have narrowed them.
- doctor --strict's two problems were the project's: the UI code already in `packages/api/src/ui/` has no a11y or hover gate. The spec leaves `html-ui` out because those pages retire, so the layout declares both gates `"none: <reason>"` until the Next.js app's work order brings real ones. The spec's layout description should gain that `gates` key.
