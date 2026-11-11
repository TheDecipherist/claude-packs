// A configuration is one shared base (configurations/shared.json) plus its own deltas (configurations/<name>/config.json): what every
// kind of project holds is written once, and a configuration says only what it changes. The packs it may take are not listed here: each
// pack's pack.json `fits` names the configurations it may join (W7 b).
//   delta "packs":     { "with": [packs always installed after base], "default": [packs `init --config` takes] }
//   delta "layout":    { "folders", "kinds", "concepts": entries that replace the shared one of that name (null takes it out),
//                        "own": ["folders", ...] the sections the configuration holds wholly itself }
//   delta "preamble":  { "always"|"never": { "replace": { "<index>": line }, "insert": { "<index>": [lines before that one] } } }
//   delta "description", "sourceFiles", "leaveOut": as they are
import type { Configuration, LayoutFolder, LayoutKind } from '../packs/base/hooks/lib/types.d.mts';

/** What a delta changes in a list of house-rule lines. */
export interface LineDelta { replace?: Record<string, string>; insert?: Record<string, readonly string[]> }

type Section = 'folders' | 'kinds' | 'concepts';
type Entries<T> = Record<string, T | null>;

/** `configurations/<name>/config.json`: the deltas over the shared base. */
export interface ConfigDelta {
  name?: string;
  description?: string;
  packs?: { with?: readonly string[]; default?: readonly string[] };
  sourceFiles?: string;
  leaveOut?: readonly string[];
  layout?: { folders?: Entries<LayoutFolder>; kinds?: Entries<LayoutKind>; concepts?: Entries<readonly string[]>; own?: readonly Section[] };
  preamble?: { always?: LineDelta; never?: LineDelta };
}

/** `configurations/shared.json`: what every configuration holds. */
export interface SharedConfig {
  packs: { always: readonly string[] };
  layout: { folders: Record<string, LayoutFolder>; kinds: Record<string, LayoutKind>; concepts?: Record<string, readonly string[]> };
  preamble: { always: readonly string[]; never: readonly string[] };
}

/** The shared entries with the delta's laid over them, in the shared order; a new entry goes last, null takes one out. */
function mergeEntries<T>(shared: Readonly<Record<string, T>> | undefined, delta: Entries<T> | undefined): Record<string, T> {
  const out: Record<string, T> = { ...shared };
  for (const [key, value] of Object.entries(delta ?? {})) {
    if (value === null) delete out[key];
    else out[key] = value;
  }
  return out;
}

/** The house-rule lines of the shared base with a delta's replacements and insertions. */
export function applyLines(base: readonly string[], delta: LineDelta = {}): string[] {
  const out = base.flatMap((line, i) => [...(delta.insert?.[String(i)] ?? []), delta.replace?.[String(i)] ?? line]);
  return [...out, ...(delta.insert?.[String(base.length)] ?? [])];
}

/** The packs a configuration always installs: base first, the delta's own, then the rest of the shared list. */
export function alwaysPacks(shared: readonly string[], own: readonly string[] = []): string[] {
  const [first, ...rest] = shared;
  return [...(first === undefined ? [] : [first]), ...own, ...rest];
}

/** The packs that may join a configuration: every one whose `fits` names it and that it does not install already. */
export function chosenPacks(name: string, always: readonly string[], fits: Readonly<Record<string, readonly string[]>>): string[] {
  return Object.keys(fits).filter((pack) => (fits[pack] ?? []).includes(name) && !always.includes(pack)).sort();
}

/** One configuration: the shared base, its deltas, and the packs that fit it. */
export function mergeConfig(name: string, shared: SharedConfig, delta: ConfigDelta, fits: Readonly<Record<string, readonly string[]>>): Configuration {
  const own = new Set<Section>(delta.layout?.own ?? []);
  const always = alwaysPacks(shared.packs.always, delta.packs?.with);
  const concepts = mergeEntries(own.has('concepts') ? undefined : shared.layout.concepts, delta.layout?.concepts);
  return {
    name,
    description: delta.description,
    packs: { always, choose: chosenPacks(name, always, fits), default: [...(delta.packs?.default ?? [])] },
    layout: {
      folders: mergeEntries(own.has('folders') ? undefined : shared.layout.folders, delta.layout?.folders),
      kinds: mergeEntries(own.has('kinds') ? undefined : shared.layout.kinds, delta.layout?.kinds),
      ...(Object.keys(concepts).length ? { concepts } : {}),
    },
    ...(delta.sourceFiles === undefined ? {} : { sourceFiles: delta.sourceFiles }),
    preamble: { always: applyLines(shared.preamble.always, delta.preamble?.always), never: applyLines(shared.preamble.never, delta.preamble?.never) },
    ...(delta.leaveOut === undefined ? {} : { leaveOut: delta.leaveOut }),
  };
}
