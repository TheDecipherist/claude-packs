// A pack.json is a manifest like a package.json (0.19.0: it says stock or custom, has a git url, and who made it). A custom pack comes
// from somebody else's repository, so these fields are how a project knows what it is running: what it is, who made it, where it lives.
import { join, relative } from 'node:path';
import { slash, walk } from '../packs/base/hooks/lib/files.mts';
import type { PackManifest } from '../packs/base/hooks/lib/types.d.mts';

const TYPES: readonly string[] = ['stock', 'custom'];
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const GIT_URL = /^(?:https?:\/\/|ssh:\/\/|file:\/\/|git@)\S+$/;

/** A pack.json as read: outside data, so every field may be missing or of another type. */
export type PackFields = Partial<PackManifest>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
/** An author is a string, or an object with a name (a package.json's two forms). */
const authorName = (author: unknown): string => (author !== null && typeof author === 'object' && 'name' in author ? text(author.name) : text(author));

const FIELDS: Record<string, (p: PackFields) => true | string> = {
  version: (p) => SEMVER.test(text(p.version)) || 'needs a version like 1.2.0',
  description: (p) => Boolean(text(p.description).trim()) || 'needs a description',
  type: (p) => TYPES.includes(text(p.type)) || `needs a type: ${TYPES.join(' or ')}`,
  author: (p) => Boolean(authorName(p.author).trim()) || 'needs an author: who made it',
  license: (p) => Boolean(text(p.license).trim()) || 'needs a license',
  repository: (p) => GIT_URL.test(text(p.repository?.url)) || 'needs repository.url: the git url it lives at',
};

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** The configurations a pack may join (its `fits`): this is what a configuration's list of packs to choose from is made of. */
export const fitsOf = (pack: PackFields): string[] => stringList(pack.fits);

/** The pack's `tests`: each code file of the pack (its path inside the pack) and the test files that cover it. */
export const testsOf = (pack: PackFields): Record<string, string[]> => Object.fromEntries(Object.entries(pack.tests ?? {}).map(([file, tests]) => [file, stringList(tests)]));

/** The keys every stock pack.json has, so a pack is one shape and a reader never asks whether a key is there (W7 b). */
export const STOCK_KEYS: readonly string[] = ['concepts', 'folders', 'hooks', 'skillsIn', 'tests', 'requires', 'fits'];

/** The stock keys a pack.json lacks. A custom pack is its author's own shape, so it is not held to them. */
export const missingKeys = (pack: PackFields): string[] => (pack.type === 'custom' ? [] : STOCK_KEYS.filter((key) => !Object.hasOwn(pack, key)));

/** A code file of a pack: what its hooks, libs and tools are written in (the emitted .mjs beside a .mts is not one, nor a .d.mts). */
const CODE_FILE = /(?<!\.d)\.mts$|\.(?:py|sh|h|cpp)$/;

/** The code files of a pack (its path inside the pack) that its `tests` does not name: each needs a key, a list of tests or an empty one. */
export function unnamedCodeFiles(packDir: string, pack: PackFields): string[] {
  const named = new Set(Object.keys(pack.tests ?? {}));
  return ['hooks', 'tools'].flatMap((dir) => walk(join(packDir, dir)))
    .map((abs) => slash(relative(packDir, abs)))
    .filter((rel) => CODE_FILE.test(rel) && !named.has(rel));
}

/** The problems of one manifest; `folder` is where it was found, and its name must say the same. */
export function manifestProblems(pack: PackFields, folder: string = text(pack.name)): string[] {
  const said = Object.values(FIELDS).map((check) => check(pack)).filter((r): r is string => r !== true).map((r) => `pack ${folder} ${r}`);
  return pack.name === folder ? said : [`pack ${folder} says its name is ${pack.name}`, ...said];
}
