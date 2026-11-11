// The pins a dependency file holds, read by what kind of file it is: text in, a map of name to version out. version-pin-guard
// compares what a write leaves in a file with what was there.
import { basename } from 'node:path';
import { parseJson } from './json.mts';

/** One dependency and the version it is pinned to. */
export interface Pin { name: string; version: string }

/** A reader of one kind of dependency file. */
export type Extractor = (text: string) => Map<string, string>;

interface PackageJson { packageManager?: string; [section: string]: unknown }

const SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

export function fromPackageJson(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const json = parseJson<PackageJson>(text);
  if (!json || typeof json !== 'object') return out;
  for (const key of SECTIONS) {
    const section = json[key];
    if (section && typeof section === 'object') for (const [n, v] of Object.entries(section)) out.set(n, String(v));
  }
  if (typeof json.packageManager === 'string') out.set(json.packageManager.split('@')[0] ?? '', json.packageManager);
  return out;
}

export function fromCmake(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/FetchContent_Declare\s*\(\s*([\w.-]+)([^)]*)\)/gi)) {
    const v = (m[2] ?? '').match(/\b(?:GIT_TAG|URL)\s+("?)([^\s")]+)\1/i);
    if (v && m[1] && v[2]) out.set(m[1], v[2]);
  }
  for (const m of text.matchAll(/CPMAddPackage\s*\(\s*"(?:gh:)?([\w./-]+)@([\w.+-]+)"/gi)) out.set((m[1] ?? '').split('/').pop() ?? '', m[2] ?? '');
  for (const m of text.matchAll(/ExternalProject_Add\s*\(\s*([\w.-]+)[^)]*?\bGIT_TAG\s+([^\s)]+)/gi)) out.set(m[1] ?? '', m[2] ?? '');
  return out;
}

export function fromRequirements(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z0-9_.\-[\]]+)\s*(==|>=|~=|<=|>|<|===)\s*([^\s;,]+)/);
    if (m) out.set((m[1] ?? '').replace(/\[.*\]/, ''), `${m[2]}${m[3]}`);
  }
  return out;
}

export function fromPyproject(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/["']([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*(==|>=|~=|<=|>|<)\s*([^"',;\s]+)/g)) out.set(m[1] ?? '', `${m[2]}${m[3]}`);
  return out;
}

export function fromCargo(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let inDeps = false;
  for (const line of text.split('\n')) {
    const h = line.match(/^\s*\[([^\]]+)\]/);
    if (h) { inDeps = /dependencies/.test(h[1] ?? ''); continue; }
    if (!inDeps) continue;
    const m = line.match(/^\s*([\w-]+)\s*=\s*(?:"([^"]+)"|\{[^}]*version\s*=\s*"([^"]+)")/);
    const version = m?.[2] ?? m?.[3];
    if (m && m[1] && version !== undefined) out.set(m[1], version);
  }
  return out;
}

export function fromGoMod(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.\-/]+\.[\w.\-/]+)\s+(v[\w.+-]+)/gm)) out.set(m[1] ?? '', m[2] ?? '');
  return out;
}

export function fromDockerfile(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?([^\s:@]+)[:@](\S+)/gim)) out.set((m[1] ?? '').split('/').pop() ?? '', m[2] ?? '');
  return out;
}

export function fromWorkflow(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/uses:\s*["']?([\w.-]+\/[\w.-]+)(?:\/[\w./-]+)?@([\w.-]+)/g)) out.set(m[1] ?? '', m[2] ?? '');
  return out;
}

// The reader for each manifest: by exact file name, else by the first name pattern that fits, else a workflow by its path.
const BY_NAME: Readonly<Record<string, Extractor>> = { 'package.json': fromPackageJson, 'CMakeLists.txt': fromCmake, 'pyproject.toml': fromPyproject, 'Cargo.toml': fromCargo, 'go.mod': fromGoMod };
const BY_PATTERN: readonly (readonly [RegExp, Extractor])[] = [
  [/\.cmake$/, fromCmake],
  [/^requirements.*\.(txt|in)$/, fromRequirements],
  [/^(Dockerfile|Containerfile)(\..+)?$|\.dockerfile$/i, fromDockerfile],
];

/** The reader for a dependency file, or null when the file is not one. */
export function extractorFor(file: string): Extractor | null {
  const name = basename(file);
  const byName = Object.hasOwn(BY_NAME, name) ? BY_NAME[name] : undefined;
  if (byName) return byName;
  const hit = BY_PATTERN.find(([re]) => re.test(name));
  if (hit) return hit[1];
  return /\.github[\\/]workflows[\\/].+\.ya?ml$/.test(file) ? fromWorkflow : null;
}

/** Pins in `after` that are new or different from `before`. */
export function changedPins(extract: Extractor, before: string, after: string): Pin[] {
  const old = extract(before);
  return [...extract(after)].filter(([n, v]) => old.get(n) !== v).map(([n, v]) => ({ name: n, version: v }));
}
