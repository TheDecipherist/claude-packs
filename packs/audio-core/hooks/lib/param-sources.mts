import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from './files.mts';
import { matchesAny } from './glob.mts';
import { parseJson, readJson, writeJson } from './json.mts';
import { readLayout } from './layout.mts';

// Where a plugin's parameters are read from, and the id lock they are held against. param-id-lock and release-lock share it.
// Where IDs are read: .claude/param-ids.config.json, else layout.json "paramIds", else JUCE ParameterID / AudioParameter* string literals.
// Both forms: { "extensions": "<regex>", "patterns": ["<regex with one group>"] }. A pattern is a JavaScript regex, with ^ and $
// matching at each line. One that cannot compile is reported by name, never a crash (KF-18).
// The project's build output (layout.json "buildOutput") is never read: ids in a library's sources are not the unit's (KF-15).

// .claude is skipped so the worktrees under .claude/worktrees/ never stand in for this checkout's code.
const SKIP_DIRS = /^out(\/|$)|(^|\/)(build|Builds|_deps|JuceLibraryCode|JUCE|node_modules|\.git|\.claude|cmake-build[^/]*)(\/|$)/;
export const PARAMETER_WORDS = /\b(?:ParameterID|AudioParameter(?:Float|Int|Bool|Choice)|AudioProcessorValueTreeState|addParameter)\b/;
export const CONFIG = join('.claude', 'param-ids.config.json');

const DEFAULT_PATTERNS = [
  'ParameterID\\s*(?:[A-Za-z_]\\w*\\s*)?[({]\\s*"([^"]+)"',
  'AudioParameter(?:Float|Int|Bool|Choice)\\s*>?\\s*\\(\\s*"([^"]+)"',
];

/** Where ids are read: the files they are in, and the patterns that find them. */
export interface IdConfig { extensions: RegExp; patterns: RegExp[] }

/** What a settings file or layout.json "paramIds" says: each key only when it is the right kind. */
function idSettings(value: unknown): { extensions?: string; patterns?: string[] } {
  if (value === null || typeof value !== 'object') return {};
  const { extensions, patterns } = value as Record<string, unknown>;
  const found: { extensions?: string; patterns?: string[] } = {};
  if (typeof extensions === 'string') found.extensions = extensions;
  if (Array.isArray(patterns)) found.patterns = patterns.map(String);
  return found;
}

/** The settings, or { error } saying what cannot be read and where. `hook` names the caller in the error. */
export function loadConfig(root: string, hook = 'param-id-lock'): IdConfig | { error: string } {
  const file = join(root, CONFIG);
  try {
    let cfg: unknown = readLayout(root).paramIds ?? {};
    if (existsSync(file)) {
      const parsed = parseJson<unknown>(readText(file));
      if (parsed === null) throw new Error(`${CONFIG} is not JSON`);
      cfg = parsed;
    }
    const { extensions, patterns } = idSettings(cfg);
    return {
      extensions: new RegExp(extensions ?? '\\.(cpp|h|hpp|cc|mm)$'),
      patterns: (patterns ?? DEFAULT_PATTERNS).map((p) => new RegExp(p, 'gm')),
    };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { error: `${hook} could not read its settings (${CONFIG}, or layout.json "paramIds"), so no parameter id was checked: ${why}\n` };
  }
}

export function* sourcesOf(root: string, extensions: RegExp): Generator<string> {
  const output = readLayout(root).buildOutput;
  const skipped = Array.isArray(output) ? output.map(String) : [];
  for (const entry of readdirSync(root, { recursive: true })) {
    const rel = String(entry);
    if (!SKIP_DIRS.test(rel) && extensions.test(rel) && !matchesAny(rel, skipped)) yield join(root, rel);
  }
}

export function collectIds(root: string, { extensions, patterns }: IdConfig): Set<string> {
  const ids = new Set<string>();
  for (const file of sourcesOf(root, extensions)) {
    const text = readText(file) ?? '';
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) ids.add(m[1] ?? '');
    }
  }
  return ids;
}

/** The id lock: the ids the last release held. Written by `--init` or `release-lock --release`, never by a first sighting. */
export const lockFile = (root: string): string => join(root, '.claude', 'param-ids.lock.json');
const save = (root: string, ids: Iterable<string>): void => { writeJson(lockFile(root), [...ids].sort(), { pretty: true }); };
/** The locked ids; a lock that is no list of ids is a fault, never an empty lock (it would be written over and every id forgotten). */
export function lockedIds(root: string): string[] {
  if (!existsSync(lockFile(root))) return [];
  const ids = readJson<unknown>(lockFile(root));
  if (!Array.isArray(ids)) throw new Error(`${lockFile(root)} is not a list of parameter ids`);
  return ids.map(String);
}

/** The release step for ids: the lock becomes what it held plus what the sources hold now (additions join, nothing leaves). */
export function lockIds(root: string, config: IdConfig): Set<string> {
  const ids = new Set([...lockedIds(root), ...collectIds(root, config)]);
  save(root, ids);
  return ids;
}
