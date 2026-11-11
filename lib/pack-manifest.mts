// A pack.json is a manifest like a package.json (0.19.0: it says stock or custom, has a git url, and who made it). A custom pack comes
// from somebody else's repository, so these fields are how a project knows what it is running: what it is, who made it, where it lives.
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

/** The problems of one manifest; `folder` is where it was found, and its name must say the same. */
export function manifestProblems(pack: PackFields, folder: string = text(pack.name)): string[] {
  const said = Object.values(FIELDS).map((check) => check(pack)).filter((r): r is string => r !== true).map((r) => `pack ${folder} ${r}`);
  return pack.name === folder ? said : [`pack ${folder} says its name is ${pack.name}`, ...said];
}
