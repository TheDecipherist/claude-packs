// A pack.json is a manifest like a package.json (0.19.0; Tim: it says stock or custom, has a git url, and who made it). A custom pack comes
// from somebody else's repository, so these fields are how a project knows what it is running: what it is, who made it, where it lives.
const TYPES = ['stock', 'custom'];
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const GIT_URL = /^(?:https?:\/\/|ssh:\/\/|file:\/\/|git@)\S+$/;

const FIELDS = {
  version: (p) => SEMVER.test(p.version ?? '') || 'needs a version like 1.2.0',
  description: (p) => Boolean(p.description?.trim()) || 'needs a description',
  type: (p) => TYPES.includes(p.type) || `needs a type: ${TYPES.join(' or ')}`,
  author: (p) => Boolean(String(p.author?.name ?? p.author ?? '').trim()) || 'needs an author: who made it',
  license: (p) => Boolean(p.license?.trim()) || 'needs a license',
  repository: (p) => GIT_URL.test(p.repository?.url ?? '') || 'needs repository.url: the git url it lives at',
};

// The problems of one manifest; `folder` is where it was found, and its name must say the same.
export function manifestProblems(pack, folder = pack.name) {
  const said = Object.values(FIELDS).map((check) => check(pack)).filter((r) => r !== true).map((r) => `pack ${folder} ${r}`);
  return pack.name === folder ? said : [`pack ${folder} says its name is ${pack.name}`, ...said];
}
