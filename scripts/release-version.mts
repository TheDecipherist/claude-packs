// The release's pure parts (typescript order W9): the next version, the CHANGELOG section a release dates and reads its notes from,
// and what is refused about a registry. No git, no npm: judged in test/unit/release.test.mts.

export type Kind = 'patch' | 'minor' | 'major';
export const KINDS: readonly Kind[] = ['patch', 'minor', 'major'];

/** The version after `version` for a kind of release; only plain x.y.z is bumped. */
export function bump(version: string, kind: Kind): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`"${version}" is not x.y.z: a release bumps plain versions only`);
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const escaped = (version: string): string => version.replace(/\./g, '\\.');

/** The release notes: the CHANGELOG's "## <version>" section, up to the next "## " heading. */
export function notesFor(changelog: string, version: string): string {
  const lines = changelog.split('\n');
  const heading = new RegExp(`^## ${escaped(version)}(\\s|$)`);
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) throw new Error(`CHANGELOG.md has no "## ${version}" section: write it before releasing`);
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  const notes = lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
  if (!notes) throw new Error(`CHANGELOG.md's "## ${version}" section is empty`);
  return notes;
}

/** The CHANGELOG with the version's heading dated: "## 2.0.0 (unreleased: branch)" or a bare "## Unreleased" becomes "## 2.0.0 (date)".
 *  A heading already dated is left as it is (the step is done). A missing or empty section throws. */
export function datedChangelog(changelog: string, version: string, date: string): { text: string; changed: boolean } {
  const lines = changelog.split('\n');
  const own = new RegExp(`^## ${escaped(version)} \\(unreleased[^)]*\\)\\s*$`, 'i');
  let at = lines.findIndex((l) => own.test(l));
  if (at === -1) at = lines.findIndex((l) => /^## unreleased\s*$/i.test(l));
  if (at === -1) { notesFor(changelog, version); return { text: changelog, changed: false }; }
  lines[at] = `## ${version} (${date})`;
  const text = lines.join('\n');
  notesFor(text, version);
  return { text, changed: true };
}

const PUBLIC = /(^|\.)(npmjs\.(org|com)|yarnpkg\.com)(:|\/|$)/i;

/** Why a registry or a remote may not take a rehearsal: a measured release never reaches the real npm or GitHub. */
export function scratchProblems(registry: string, remoteUrl: string): string[] {
  const host = registry.replace(/^[a-z]+:\/\//i, '');
  return [
    PUBLIC.test(host) && `--registry ${registry} is a public registry: a rehearsal publishes to a local one only`,
    /github\.com/i.test(remoteUrl) && `the remote (${remoteUrl}) is GitHub: with --registry the landing, tag and push act on a scratch remote only`,
  ].filter((p): p is string => typeof p === 'string');
}
