# W4 slice w4-audio: report

Branch `work/2.0.0-ts-w4-audio`, commit dfb41e2 (pushed). 14 files to `.mts`, each `git rm`'d first; sources written with the Write
and Edit tools only.

## Files (lines before -> after)

| file | before | after | notes |
|---|---|---|---|
| audio-core hooks/lib/realtime-checks | 56 | 63 | typed `RealtimeCheck`, `RealtimeViolation` (beside the module) |
| audio-core hooks/lib/settings-standard | 43 | 46 | `SettingRow` tuple type |
| audio-core hooks/lib/smoothing-checks | 132 | 150 | `SmoothingConfig`, `SmoothingHit`; `guards.smoothing` narrowed from `unknown`; `smoothingConfig(layout)` now takes a `Layout` (no default `{}`) |
| audio-core tools/lib/wav | 60 | 66 | `Wav` type |
| audio-core tools/lib/spectrum | 112 | 131 | `ToneAnalysis` type |
| audio-core tools/tone-report | 47 | 57 | `main(args, out, err)` takes its arguments and its writers; tail reads the process once |
| audio-core hooks/realtime-guard | 113 | 112 | `judgeVerdict`; role judge |
| audio-core hooks/settings-layer | 153 | 158 | `judgeVerdict`; `--status` flag (`status(root)` returns a Verdict); role judge |
| audio-core hooks/param-id-lock | 171 | 185 | `--status` and `--init` flags; `ROOT` from `ctx.projectDir`; role recorder (see concerns) |
| cpp hooks/compile-cache | 63 | 84 | `ctx.env.COMPILE_CACHE_INSTALLED`; selftest's build folders now one table |
| full-stack hooks/stack-guard | 91 | 103 | `parseJson`; role judge |
| postgres hooks/db-wipe-guard | 96 | 112 | `refusal(command, cwd, where)` takes `{ projectDir, cwd }`; `readText` |
| stellix hooks/no-shipped-images | 87 | 110 | `--git-staged` flag; git through `gitLines` with the event's env; role judge |
| zod hooks/schemas-only | 55 | 70 | role judge |

Every hook is `export const hook: Hook = (event, ctx) => ...` (both parameters), ends with `runAsHook(..., { flags })`, exports
`selftest` and `worktreeCase`, and the judges' selftests end with the write-trap row. pack.json rows gained `"role"`.

## Copies taken out
`readText`/`put` (files.mts) for the hand `existsSync`+`readFileSync` in db-wipe-guard, param-id-lock, settings-layer; `walk` for
settings-layer's `cmakeFiles`; `parseJson`/`readJson`/`writeJson` for the raw JSON reads and the lock write; `gitLines` for
no-shipped-images' `execFileSync('git')`; `writeVerdict` for the by-hand modes' output.

## Signatures changed (importers)
`smoothingConfig`, `refusal` (db-wipe-guard), `status`/`problems` (settings-layer): no importer outside the slice. tone-report's
`main` is new-shaped; nothing imports it. `wav.mjs` and `spectrum.mjs` keep every export name (importers: sound-design's
`prove-a-bank.mjs`, `bank-measures.mjs`, `test/prove-a-bank.test.mjs`).

## Proofs
- `npm run build`, `npm run check`: exit 0. Repo lint (7 tests): pass.
- Selftests in scratch installs (`init --config synth-creator cpp audio-core`, `init --config full-stack postgres`,
  `init --config synth-creator stellix`): realtime-guard 40 cases, settings-layer 15, param-id-lock 9, compile-cache 11,
  stack-guard 15, db-wipe-guard 19, no-shipped-images 9, schemas-only 9: all OK. `doctor --fresh` with selftests run: clean on the
  audio-core+cpp and the full-stack+postgres installs. No configuration takes both `stellix` and `zod`, so they were proved apart.
  `--status` (param-id-lock, settings-layer), `--init` (in param-id-lock's selftest) and `--git-staged` ran by hand; tone-report
  ran on a rendered sine (1 kHz: -6.02 dBFS, THD -130 dB) and its usage line exits 2.
- `npm run test:changed -- --base work/2.0.0-typescript` (/tmp/w4-audio-tc.txt): 61 run, 56 pass, 5 fail. Known reds on the base:
  house's two, worktrees' kit-fresh case. New for the lead: both noop tests (stellix, sub37) list
  `.claude/hooks/lib/realtime-checks.mjs` and `.claude/tools/tone-report.mjs` as changed installed files (their emitted text
  differs); the other converted files already were in noop's lists or were byte-equal. audio-packs, cpp-pack, full-stack,
  postgres-pack and kf-fail-open pass.

## Needs the lead
- New emitted files: none new by name (every `.mjs` is the emit of the `.mts` of the same name). Emitted `.mjs` of the 14 are
  already ignored by the build rules.
- noop's changed lists: `.claude/hooks/lib/realtime-checks.mjs`, `.claude/tools/tone-report.mjs` (and the 9 hook/lib files
  noop already tracks by hash, if the fixtures are regenerated).
- JSON ratchet: not measured; the slice's raw JSON reads are all on `json.mts` (`param-id-lock`, `stack-guard`, `settings-layer`'s
  layout read through `readLayout`).
- Types proposed: `Verdict`-returning `status`/`init` need nothing new. `SettingRow`, `IdConfig`, `RealtimeViolation`,
  `SmoothingConfig`, `SmoothingHit`, `ToneAnalysis`, `Wav` are defined beside their modules; none needs to be shared.

## Concerns (DONE_WITH_CONCERNS)
1. `param-id-lock` both refuses (a locked id is gone) and records (it starts the lock and adds new ids). The brief says split. I did not:
   a new hook would not switch on in existing installs (`update` brings a new hook only if `layout.json` "enable" names it), so
   existing projects would stop recording ids silently, and noop's settings fixtures would change. Its pack.json role is
   `"recorder"` though it refuses; the split (judge + `param-id-lock-record`) is the lead's decision.
2. The worktree cases of these hooks stay functions in `test/worktrees.test.mjs` and `test/worktree-cases-packs.mjs`. A non-base
   pack's `.mjs` cannot be imported from `packs/` (its `./lib/` is base's, merged only by an install), so `caseFrom(..., (await
   import('../packs/<pack>/hooks/X.mjs')).worktreeCase)` fails there. Each hook exports its `worktreeCase` data anyway;
   slice 6 should read it from an install. param-id-lock's data case holds only the first step (the lock-file steps stay in the
   test). The hooks of cpp, full-stack, postgres, zod have no entry in the cases at all today (their packs are not in that test's
   install); their data cases are written but unread.
3. compile-cache's selftest runs the hook file directly with `COMPILE_CACHE_INSTALLED` in its env (`runHook` takes no env), not
   through the runner; `contextOf().env` supplies the base env. A fifth `env` parameter on `runHook` would let it use the runner.
4. Faults found, behaviour kept: (a) `param-id-lock` crashed on a malformed lock (JSON.parse threw); kept as a thrown error, so
   the crash policy still applies, rather than treating it as empty (which would overwrite every locked id). (b) `no-shipped-images
   --git-staged` crashed when git failed; with `gitLines` a failed git now means no staged images and exit 0. (c) settings-layer's
   `cmakeFiles` skip regex now also tests file names (a file called `build` would be skipped); `param-id-lock` keeps
   `readdirSync(recursive)` because its skip regex works on paths from the root, which `walk`'s name skip cannot express.
5. `tone-report` keeps its `process.exit` in the `isMain` tail; the repo lint does not hold tools.
