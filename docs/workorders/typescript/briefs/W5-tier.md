# Brief: W5, move the kit's tests into three tiers on one install per configuration

You move one share of the kit's tests, unattended: take the recommended choice and record it in your report. Your prompt names
your share (d, a, b or c), branch, worktree and files. Read first: `CLAUDE.md`; the order's W5 in
`docs/workorders/typescript/workorder.md` (search "## W5"); `docs/workorders/typescript/decisions.md` (d-4, d-6, d-12, d-16);
the tests survey `docs/workorders/typescript/survey/tests.md` sections 2 to 7; the test helpers `test/kit-cli.mts`,
`test/fresh-tmp.mts`, `test/fixtures/installs.mts`, `test/worktree-rig.mts`; the layout's test folders in `CLAUDE.md`
("Project layout").

## The set-up and the rules (from W3 and W4)

Everything in `docs/workorders/typescript/briefs/W4-slice.md` holds: `git worktree add .claude/worktrees/<share> -b
work/2.0.0-ts-w5-<share> work/2.0.0-typescript`, then `npm ci --no-audit --no-fund && npm run build` in it; a file is `git rm`'d as
its own step before its replacement is written (`once-only` judges a command before it runs); strict TypeScript with no `any` and
no silencer; the Write and Edit tools only (never a shell heredoc, `sed -i` or a python rewrite); commit with `git commit -m "..." --
<paths>` after `git diff --cached --name-status`, never an emitted `.mjs` named; push every commit; each refusal read and marked
(`node bin/claude-packs.mjs logs mark <id> right|wrong "<why>"`); a fault reported, never fixed silently; one status line at the end.

## What a moved test keeps

- Its **test names, exactly**. W5's Done when diffs every baseline test name against the new suite: a name may be added, renamed
  (list it in your report as `old -> new`, with the file) or in d-12's replaced set; any other name gone is a red step.
- Its subject. A test proves what it proved: a refusal still refused, through the real path (`hookRun` on an installed hook, never a
  payload pasted into a shell).
- Its install only when the install is the subject (an integration flow). Everything else starts from `fixture(name)` in
  `test/fixtures/installs.mts`, a copy of one install per configuration built once per run. The order's target: under 40 `init`
  call sites in the whole suite (from 161).

## The tiers (CLAUDE.md "Project layout")

- `test/unit/lib/NAME.test.mts` and `test/unit/hooks-lib/NAME.test.mts`: one module, imported from its `.mts` (d-4), no spawn.
- `test/hooks/PACK/HOOK.test.mts`: one hook: its selftest, its exported `worktreeCase`, the refusals the old files held for it, fired
  on a fixture copy; one test asserting the emitted `.mjs` gives the same verdict as the `.mts` source on one case (d-4).
- `test/tools/PACK/TOOL.test.mts`: one tool.
- `test/integration/FLOW.test.mts`: a flow that installs on purpose. No file over 60 s summed in the suite log.

## The shares (each root `test/*.test.mjs` belongs to exactly one; only that share moves it)

- **(d) fixtures, lint, manifest** (merges first): `test/fixtures/installs.mts` (the build lock, `fixture(name)` with W1.4's path
  rewrite, a plant: a copy with a stale absolute path fails), `holdsEachCase` onto one all-packs fixture, `scripts/counts.mts`
  writing `packs/manifest-2.0.0.json` (installed files and hashes) and `noop` as `test/integration/noop.test.mts` against it (a plant:
  an unlisted changed file), the two profiles into `test/fixtures/profiles/` with `--profile` taking a path, the hand numbers gone
  (d-12: json-ratchet as a lint on added lines, kf-refusals' totals as per-row asserts, names-sweep against its generator,
  base-neutral's moved list deleted), `test/repo-lint.test.mts` taking the readers `base-neutral check-speed file-size file-urls
  frame-bench json-ratchet no-personal-name npx-name pack-manifest readme site`, the install-site counter as a lint (under 40), the
  suite's `CLAUDE_PACKS_CACHE` in the run's temp folder and the lint for 0 `resident.mjs` processes after the run. Owns
  `test/kit-cli.mts`, `test/fresh-tmp.mts`, `test/worktree-rig.mts`, `test/fixtures/**`.
- **(a) units**: `example-line fresh-tmp json-helper layout-owned release run-claudes run-remotes`, and a unit test for each `lib/`
  module and each hook lib with logic of its own that has none (compare `ls lib/*.mts` with `test/unit/lib/`).
- **(b) hooks**: `kf-refusals kf-fail-open routes rust-pack lookup review-packs audio-packs structure micro logging instances shape
  once-only cpp-pack content-sites every-language rust-dry sub37-wb other-projects kit-guards install-fixes kf-build-laws stored-text
  ui-craft ui-depth writing core-budget hover vst3host what-the-kit-finds postgres-pack full-stack base-laws`, into one file per hook.
- **(c) tools and integration**: tools `quiet-test source-ledger statusline names-sweep prove-a-bank route-table symmetry` and
  `test/unit/tools/test-verdict.test.mts`; flows `install install-block configs configurations custom-packs doctor-cache
  doctor-timeout gitignore hook-proof hook-timing house kf-new-projects kit-lock lock-release look-report-merge new scan fix-plan
  global planner run-status rule-tests rules-follow-the-code test-changed workorder workorder-check worktrees worktree-twins`
  (`house` split so no file sums over 60 s).

A helper two shares need goes into `test/kit-cli.mts` as a new export appended at its end (the lead merges the ends); never a private
copy. The picker (`scripts/test-changed*.mts`) maps a path to its tests: keep `npm run test:changed` picking the moved files.

## Proofs

`npm run build`, `npm run check` exit 0 (the tests are type-checked by `test/tsconfig.json`); the repo lint; every test file you
wrote or moved, run with `node --import ./test/fresh-tmp.mts --test <files>`, green, with each one's summed seconds; `npm run
test:changed`. Never the whole suite: the lead runs it after the last merge. Your report, `docs/workorders/typescript/agents/
w5-<share>-report.md`: the files moved (old -> new), every renamed test name, the tests in d-12's set you replaced and with what, the
`init` sites left in your share, each refusal and its mark, and the status line `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or
`NEEDS_CONTEXT`.
