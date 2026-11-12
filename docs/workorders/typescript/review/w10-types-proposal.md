# W10 finding 3: `Layout.guards` and `Layout.paramIds` typed once (proposal for `packs/base/hooks/lib/types.d.mts`)

For the lead, who owns `types.d.mts`. Nothing in that file was edited here. The interfaces below are read off the ten readers the review names
(each reader's own restatement of the part of `guards` it reads); every field is optional, because `guards` is the project's own data.

## 1. Exact text for `types.d.mts`

Replace, in `interface Layout`:

```ts
  paramIds?: unknown;
  guards?: Record<string, unknown>;
```

with:

```ts
  paramIds?: ParamIdSettings;
  guards?: LayoutGuards;
```

and add beside `Layout` (before it):

```ts
/** `layout.json` `paramIds`: where param-id-lock reads parameter ids (its default is JUCE ParameterID literals). */
export interface ParamIdSettings { extensions?: string; patterns?: readonly string[] }

/** `guards.git`: the laws of git-guard and what they name (the interface git-guard.mts `GitGuards` and remote-heads.mts hold today). */
export interface GitGuardSettings {
  house?: boolean;
  tokenVar?: string;
  /** "token" names a token variable; "cli" uses this machine's own git and gh login. */
  ghAuth?: 'token' | 'cli';
  trunkNeedsYes?: boolean;
  pushNeedsYes?: boolean;
  trunks?: readonly string[];
  owner?: string;
  repo?: string;
  accountNote?: string;
  safeRestore?: string;
  branchStart?: string;
  refuseTrunk?: boolean;
  neverStage?: readonly string[];
  cachedOnly?: boolean;
  stopCacheMs?: number;
  stopLiveMs?: number;
}

/** `guards.build`: what build-guard and doctor read of the build queue. */
export interface BuildGuardSettings { queue?: string }

/** `guards.buildq`: the build queue's core budget. */
export interface BuildqGuardSettings { cores?: number }

/** `guards.smoothing`: where the smoothing law looks (audio-core). */
export interface SmoothingGuardSettings { module?: readonly string[]; scope?: readonly string[]; namespace?: string }

/** `guards.codeShape`: code-shape's limits (any of the numbers it already has) and exclusions. */
export interface CodeShapeGuardSettings { exclude?: readonly string[]; [limit: string]: unknown }

/** `guards.logs`: how large a kit log may grow before it rotates, in kilobytes. */
export interface LogsGuardSettings { maxKb?: number }

/** `guards.time`: the two commands time-guard may be told about (synth-creator). */
export interface TimeGuardSettings { probePattern?: string; saveCommand?: string }

/** `guards.images`: the folders the no-shipped-images law guards and allows (stellix). */
export interface ImagesGuardSettings { guarded?: readonly string[]; allowed?: readonly string[] }

/** `layout.json` `guards`: every guard's own settings, each optional; a key the kit does not name is the project's own. */
export interface LayoutGuards {
  git?: GitGuardSettings;
  build?: BuildGuardSettings;
  buildq?: BuildqGuardSettings;
  smoothing?: SmoothingGuardSettings;
  codeShape?: CodeShapeGuardSettings;
  /** Globs of published-text folders (content.mts `isContent`). */
  content?: readonly string[];
  logs?: LogsGuardSettings;
  time?: TimeGuardSettings;
  images?: ImagesGuardSettings;
  [guard: string]: unknown;
}
```

The index signature on `LayoutGuards` keeps `guards.skillFirst`, `guards.noFind` and the project's own guards readable by name, as they are today.
Gate 4 of the type tests (each shape defined once) wants `GitGuards` in `git-guard.mts`/`remote-heads.mts` to become `GitGuardSettings` imported
from here: one more edit for the lead (`HeadsOptions` stays where it is, the fields above are what `GitGuards` adds to it).

## 2. The casts and re-narrowings this removes (by file)

Each stays a runtime check where the data is the project's (a layout is hand-written JSON that nothing validates); what goes is the `as` that
restates the type, and the `unknown` that hides it.

| file | today | after |
|---|---|---|
| `packs/base/hooks/git-guard.mts` `gitGuards` | `isRecord(git) ? git as GitGuards : {}` | `guards?.git ?? {}` (one `isRecord` check stays where `readLayout` does not guarantee an object) |
| `packs/base/hooks/code-shape.mts:85` | `(layout.guards?.['codeShape'] ?? {}) as CodeShapeGuard` | `layout.guards?.codeShape ?? {}`; the local `CodeShapeGuard` goes |
| `packs/base/hooks/lib/core-budget.mts` `projectLayout` | `isRecord(layout) ? layout as BudgetLayout : {}` | return `Partial<Layout>`; `BudgetLayout` goes; `layout.guards?.buildq?.cores` reads as typed |
| `lib/build-queue.mts:15` `declaredQueue` | `const build: unknown = layout.guards?.['build']` and an `'queue' in build` test | `layout.guards?.build?.queue ?? ''` |
| `packs/audio-core/hooks/lib/smoothing-checks.mts:30-31` | `declared && typeof declared === 'object' ? declared as Record<string, unknown> : {}` | `layout.guards?.smoothing ?? {}`; `g['module']`, `g['scope']`, `g['namespace']` become `g.module` etc. (`list()` stays: the JSON may hold non-strings) |
| `packs/audio-core/hooks/param-id-lock.mts` `idSettings` | `value as Record<string, unknown>` | typed `ParamIdSettings` in, the two `typeof`/`Array.isArray` checks stay for the settings *file*, which is `unknown` JSON |
| `packs/base/hooks/lib/content.mts:13` | `layout.guards?.['content']` then `Array.isArray(own)` | `layout.guards?.content` is `readonly string[] | undefined`; the `filter` for strings stays |
| `packs/synth-creator/hooks/time-guard.mts:169-171` `timeCfg` | `time as Record<string, unknown>` | `guards?.time`; the two `typeof === 'string'` checks stay |
| `packs/stellix/hooks/no-shipped-images.mts:28-31` `imageGuard` | `images as Record<string, unknown>` and `v as string[]` | `readLayout(root).guards?.images`; the string-list check stays |
| `packs/base/hooks/lib/hook-log.mts:39` `LayoutLogs` | a private `{ guards?: { logs?: { maxKb?: unknown } } }` | `readJson<Layout>` is still a cast by another name: see section 3 |
| `lib/settings-layer.mts` (the review's `settings-layer.mts:50-53`) | per-key reads of `guards` | same: `guards?.<name>` typed |

## 3. `readJson<T>` stays a cast unless it is given a guard

`readJson<Layout>(file)` and `parseJson<T>` return `JSON.parse(text) as T`. The types above only help where the value reached the reader through
`readLayout` (which already builds a `Layout`); a reader that calls `readJson<LayoutLogs>` on `layout.json` directly (hook-log's `maxBytes`, which
must not import `layout.mts`) is still a cast. Two choices for the lead, neither made here:

1. Rename `readJson<T>` to `readJsonAs<T>` so the cast shows at each call (S: about 60 call sites), or
2. give it an optional guard argument: `readJson(file, isLayout)`, with `isRecord` (now in `json.mts`) the first guard (M).

This step took neither (a sweep across installed hooks and the `JSON.parse` lint gate's exceptions list).
