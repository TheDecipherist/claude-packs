# Work order: admiral-fleet

Written 2026-11-08, against `main` at 69a86bf (1.3.1 plus the unreleased entries). The `write-a-workorder` skill says how to read it.

**What this is.** Four changes to the kit so that a `full-stack` project with a Go host agent and pages drawn from reference renders (the Admiral fleet, `MDs/ADMIRAL_FLEET_SPEC.md` and `MDs/change-order-CO-2.md` in the admiralmcp repo) can install the kit and be held to every law that spec names, then a release. Finished looks like: a published version where `init --config full-stack` accepts `web`, `go`, `host-agent` and `shell-hooks`; the tenant rule and its checks judge Go files; the `full-stack` layout template is one consistent `packages/` layout with a web folder; `analyse-reference-look` is installed by every configuration so `skill-first` and `look-gate` work on a web page; and the admiralmcp install block runs green under `doctor --strict` in a scratch folder.

**The position.** Known, read from the sources below on 2026-11-08: `full-stack`'s `choose` is `js-ts, stored-text, ui-craft, shell, react, multi-tenant, websocket, ci, dynamic-data, mongo, postgres, ai, nginx, content-site`; the `multi-tenant` rule's paths are `**/*.ts` and `**/*.js`; `analyse-reference-look` lives only in `audio-core`, and `skill-first`'s row for design references applies only where that skill is installed; the `full-stack` layout template puts `core` under `packages/core/src` but `api` at `api/src`, has no web folder, and describes `channel` as "the Next.js web app". Not known: whether `straight-on-and-aligned` must travel with the skill or whether its first line is trimmed for pages; the run decides and records it (d-1). Cannot be proved here: that admiralmcp's own install is green, until the release exists and W6 runs it in a scratch folder.

**The sources.**
- `configurations/full-stack/config.json`: the choose list and the layout template (folders, concepts, kinds, preamble).
- `packs/multi-tenant/rules/no-role-crosses-a-tenant.md`, `packs/multi-tenant/checks/tenant-filter-from-url.json`, `role-sees-all-tenants.json`: the rule and its checks, JS-only today.
- `packs/audio-core/skills/analyse-reference-look/SKILL.md`, `packs/audio-core/rules/ui-matches-reference-look.md`, `packs/audio-core/rules/straight-on-and-aligned.md`.
- `packs/base/hooks/skill-first.mjs` (the table row for design references), `packs/base/hooks/look-gate.mjs` (reads `layout.json` `looks`).
- `packs/web/pack.json` (its `concepts`: `pages`, `components`, `client`, `styles`, `build-config`), `packs/go/pack.json`, `packs/host-agent/pack.json`, `packs/shell-hooks/pack.json`: what each brings.
- `lib/config-cli.mjs`, `lib/configs.mjs`, `node bin/claude-packs.mjs planner-skills`: where the layout skill text comes from.
- `test/readme.test.mjs`, `test/noop.test.mjs`, `test/worktrees.test.mjs`, `test/base-neutral.test.mjs`, `test/every-language.test.mjs`, `test/check-speed.test.mjs`: the invariants.
- For measuring W2's Go patterns: a clone of `github.com/TheDecipherist/swarmk` at `main` (`daemon-go/`, 81 Go files). Missing: no other Go repo of the owner's; the run may add one public Go repo of similar shape and say which.
- The consumer: `github.com/TheDecipherist/admiralmcp`, branch `work/fleet-spec`, `MDs/ADMIRAL_FLEET_SPEC.md` "Install, before WO-0" (the exact command W6 runs) and `MDs/change-order-CO-2.md`.

**The foundation.** Configuration as data: a choose list is one line, a rule's paths one frontmatter line, a skill one folder, a template a JSON block. Nothing new is designed; four things are widened or moved. `test/readme.test.mjs` holds the counts true and `test/noop.test.mjs` proves an `update` changes only what is listed: these are the proof, not a new rig. `pdf-to-md` is the precedent for a skill in `base`.

**Models.** The `rust` and `postgres` additions of 1.1.0 show how a pack enters a configuration's choose list and the README in one change; take their test shape. Do not take their check thresholds: the Go checks of W2 are measured on their own.

<constraints>
Always do:
- Work the steps in order.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/<step>/`.
- Give every new test or gate a planted fault that turns it red, and show it red.
- Measure a new or widened check on a real repo and read the hits before it ships; the hit count and what the hits were go in the commit message.
- Keep `base` free of synth words (`test/base-neutral.test.mjs`); keep every file under 300 lines; name no person.
- Keep the kit lock from the first write to the landing; take it with `lock take` if another session's lease is stale.

Never do:
- Commit anything from the swarmk clone, the scratch installs, or `node_modules`; the clone lives outside the repo.
- Mark a step done when it was not measured, or weaken a test to pass it.
- Claim admiralmcp installs green before W6 has run the install block from a clean folder against the published version.
- Run the whole suite to land or release; the gate is `npm run test:changed -- --base origin/main` on committed work.
</constraints>

**Changes on review (the user's decisions, 2026-11-08, before the first run):**
- **W0.0 added:** `land-branch` is fixed first, so that the order's own landings leave the main checkout up to date.
- **W4 gains depth measures** (shadow, bevel, edge light). They are added measures of the same law, not a new skill.
- **KWB-95 fixed on this branch before the run.**
  - The runner template's log time was `date -Is`, which is GNU's alone, so on macOS the log lines had no time.
  - It is now `date +%Y-%m-%dT%H:%M:%S%z`, in `prompts/workorder/run.sh`, the template `lib/workorder.mjs` copies.
  - This order's `run.sh` was regenerated from it.
  - `test/workorder.test.mjs` "the runner dates its log with a format BSD and GNU date both take", red before the fix.
- **This order is the user's yes for `npm publish` of 1.4.0.** W5 publishes as written, once its gate is green on committed work and the branch has landed.
- **Left out on purpose:**
  - The README-screenshots law gets an order of its own, next.
  - The kit's `xvfb-run` advice for macOS stays on matrix12's list; the fleet proves on WSL first.
  - matrix12's KF-35 and B-71 and vst3host on Windows stay where they are.

---

## W0.0 `land-branch` brings the main checkout up to date

The fault: a landing done from a worktree pushes the branch's commit to the remote trunk (`git push origin HEAD:refs/heads/main`, since the worktree cannot switch to a trunk the main checkout holds), proves it with `ls-remote`, and stops. The main checkout, the folder the user reads, is never fast-forwarded.
- On matrix12, 2026-11-08, it stayed about 30 commits behind GitHub all day, and the user saw none of the day's work.
- The user: "WHY ON EARTH would you only update things on github and not locally? thats a dissater waiting to happen".
- matrix12's `CLAUDE.md` carries the step by hand (its landing step 5b) until the kit has it.

1. Log the fault in `workflow-bugs.md` (the next `KWB-n`) before any fix. This step does W0's `npm install` and takes the lock first.
2. The `land-branch` skill, after its `ls-remote` proof, does three things:
   - fast-forwards the main checkout: `git -C <main checkout> fetch origin`, then `git -C <main checkout> merge --ff-only origin/<trunk>`;
   - proves `git -C <main checkout> rev-parse HEAD` equals the remote trunk;
   - says it did. Where the main checkout has uncommitted work, or holds another branch, it touches nothing, says exactly that, and the landing is not reported done.
3. A hook enforces it. Choose which one, existing or new, and record the choice as `d-n`: a turn that pushed to the trunk is refused at its end while the main checkout's trunk lags the remote's. Its selftest builds a scratch repo with a main checkout and a worktree, lands from the worktree, and sees the refusal. It sees the same turn pass once the main checkout is fast-forwarded. It is red with the hook as it was. It has its worktree case in `test/worktrees.test.mjs`.

**Done when:**
- the `KWB-n` entry is dated before the fix's first commit;
- the hook's selftest is seen red without the fix and green with it;
- doctor's skill limits still pass for `land-branch`;
- this step's own landing leaves the kit's main checkout equal to `origin/main`, proved by `rev-parse`.

## W0. Set up

1. `npm install`; `node bin/claude-packs.mjs doctor --strict` on the kit itself; clone swarmk `main` to a folder outside the repo (`../swarmk-ro`, read-only use) for W2.
2. `lock status`; take the lock.

**Done when:** `doctor --strict` is OK on the kit, the swarmk clone has 81 `.go` files under `daemon-go/`, and `lock status` names this session.

## W1. `full-stack` chooses `web`, `go`, `host-agent`, `shell-hooks`

1. Add the four names to `choose` in `configurations/full-stack/config.json`, languages before stacks, in the list's existing style.
2. Update the README's `full-stack` line and every count `test/readme.test.mjs` reads.
3. Add a fixture to the configurations test that installs `full-stack` with all four chosen into a scratch folder and asserts each pack's rules landed and its hooks were merged into `settings.json`.

**Done when:** `node bin/claude-packs.mjs configs` lists the four under `full-stack`'s "to choose"; `init --config full-stack web go host-agent shell-hooks --dir <scratch>` installs them and `doctor --strict` is OK there; the readme test passes; the fixture goes red with one name removed.

## W2. The tenant law judges Go

1. Widen the `multi-tenant` rule to `.go` files (its `# concepts:` line or an added glob, whichever the rule's frontmatter form takes, so `paths:` regenerates).
2. Give `tenant-filter-from-url` and `role-sees-all-tenants` a Go `bad` and `good` each, with the pattern extended for Go syntax. Measure both on `../swarmk-ro/daemon-go` and read every hit; keep a pattern only when its hits are the fault it names.
3. Add the Go samples to the rows `test/every-language.test.mjs` and `test/check-speed.test.mjs` already run.

**Done when:** `doctor` catches each check's Go `bad` and passes its `good`; the measurement on `daemon-go` is in the commit message with the hit count and what the hits were; a scratch `go` install shows the rule in `doctor --strict` coverage for a `.go` file.

## W3. One consistent `full-stack` layout, with a web folder

1. Rewrite the template so every folder sits under `packages/`: `core` (`packages/core/src`), `schemas` (`packages/core/src/schemas`), `api` (`packages/api/src`), `routes`, `handlers`, `adapters`, `auth`, `api-tests` (`packages/api/test`), `web` (`packages/web`, "the Next.js web app"), `web-app` (`packages/web/app`), `web-components` (`packages/web/components`), `docs`, `tools`. Drop `channel` (it described the web app wrongly; a project that has one adds it in its own `layout.json`). Map the `web` pack's `pages`, `components` and `client` concepts onto the web folders, and `js` onto `core`, `api`, `web`, `api-tests`.
2. Regenerate the `full-stack` planner skill (`planner-skills`) and the preamble; read them once as the project's new reader would.
3. Prove the no-overwrite contract: `test/noop.test.mjs` on an existing `full-stack` install shows its own `layout.json` folders kept and only the listed template files changed.

**Done when:** `init --config full-stack` in a scratch folder creates the `packages/` tree and no `api/` or `channel/` at the root; `planner-skills` prints the web folders; the noop test is green with the new template in its lists; a scratch project with a `page.tsx` under `packages/web/app` gets the `web` pack's `pages` rules in `doctor --strict` coverage.

## W4. `analyse-reference-look` for any page drawn from a picture

1. Move `analyse-reference-look` from `packs/audio-core/skills` to `packs/base/skills` (the precedent is `pdf-to-md`). Read its first line: if `straight-on-and-aligned` is needed by a web page too, move the rule with it, trimmed of synth words; if not, trim the line and leave the rule in `audio-core`. Record the choice as d-1 in `decisions.md`.
2. Add a `ui-craft` rule `page-matches-reference-look`, under 40 lines, stating the law for web pages: regions, colours sampled by script against the picture's own white and black, type scored and its licence recorded, glow and spacing measured, depth measured, one look report per page, and `look-gate` named. `ui-matches-reference-look` stays in `audio-core` for synth editors.
2b. **Depth, as added measures of the same law** (no new skill). `analyse-reference-look` and the look report it writes measure, for each raised or recessed element, against the reference's own:
   - **shadow:** its offset, blur width and darkness against the ground;
   - **bevel:** the widths and contrast of the light and dark edges;
   - **edge light:** the lit edge's brightness and width.

   Today they measure glow and colour, so a flat render passes beside a raised reference. That is what matrix12's pages did on 2026-11-08: flat cards, knobs and screens beside mock-ups with shadows and bevels. Add the measures to `ui-matches-reference-look` (audio-core) and to `page-matches-reference-look` both, as rows of the law each already states.
   - The proof: a reference card with a drop shadow and a bevel, a flat render of it judged red on the depth rows, and the same render with the depth drawn judged green. Keep both reports in `build/evidence/W4/`.
3. On a scratch `full-stack` install: a Read of `design/reference/x.webp` is refused by `skill-first` until the Skill call, and allowed after; a `looks` entry in `layout.json`, a write under its glob, `look-gate` naming the look as due, a landing refused without a passing report and allowed with one. Keep both transcripts as evidence.
4. `test/noop.test.mjs`: an existing `audio-core` install keeps the skill after `update` (moved, not lost), and its lists name the moved files; `test/base-neutral.test.mjs` passes with the skill in `base`.

**Done when:** a `full-stack` init installs the skill; the flat render is red and the drawn one green on the depth rows (item 2b), both reports in `build/evidence/W4/`; the two scratch refusals and two allowances of item 3 are in `build/evidence/W4/`; the audio-core noop test and the base-neutral test are green; the README counts for `base`, `ui-craft` and `audio-core` are true.

## W5. Release

1. `CHANGELOG.md` entry naming W1 to W4 and the fleet spec they serve; bump `package.json` to the next minor; a `docs/versions.md` row for anything pinned.
2. The gate: `npm run test:changed -- --base origin/main` on the committed branch, green.
3. Land with `land-branch`; the release fast-forwards `main`; `npm publish`.

**Done when:** the version is on npm, and from a clean folder `npx --no-install @thedecipherist/claude-packs@<version> configs` shows W1's four names under `full-stack`.

## W6. Prove the consumer's install

1. In a scratch clone of `admiralmcp` at `work/fleet-spec`, run the install block from `MDs/ADMIRAL_FLEET_SPEC.md` ("Install, before WO-0") against the published version, with its `docs/layout.admiral.json` written from the spec's folder table.
2. `doctor --strict`; read every finding; fix in the kit what is the kit's, record in `decisions.md` what is the project's.

**Done when:** `doctor --strict` is OK in the scratch clone, its output is in `build/evidence/W6/`, and nothing was committed to the admiralmcp clone.

## W7. Before calling it finished

Read the finished work as a senior engineer would. List what is left, what is unproved and what a person must judge: the d-1 choice, any check whose Go hits were ambiguous, any template folder a real project will need that the scratch install did not.

**Done when:** every open item is written down, with why.

## W8. The report

Write `docs/workorders/admiral-fleet/report.md`: what was built, what is proved and how, what is not, and what the kit did well and badly, with counts from `logs`: packs touched, rules and checks added or widened, tests added, tests seen red, README counts changed, refusals met and their verdicts.

**Done when:** every section has counts, or a stated reason there are none.
