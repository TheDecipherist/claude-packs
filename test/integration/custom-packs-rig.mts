// What the custom-packs files share: the kit run against a project with a pack cache, a pack's manifest and its source in the lock, and a
// team's pack made by new-pack and pushed to a "host" (a bare repository), with a project to install it in.
import { CLI, assert, fresh, git, join, readFileSync, spawnSync } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';
import type { Lock } from '../../packs/base/hooks/lib/types.d.mts';

interface Manifest { author?: string; hooks?: unknown }

const env = (): NodeJS.ProcessEnv => ({ ...process.env, CLAUDE_PACKS_CACHE: join(process.env.TMPDIR ?? '', 'pack-cache') });
export const kit = (dir: string, ...a: string[]): Spawned => spawnSync('node', [CLI, ...a, '--dir', dir], { encoding: 'utf8', env: env() });
export const manifestOf = (file: string): Manifest => parseJson<Manifest>(readFileSync(file, 'utf8')) ?? {};
export const sourceOf = (dir: string, name: string): NonNullable<Lock['sources']>[string] => {
  const s = lockOf(dir).sources?.[name];
  assert.ok(s, `${name} has a source in the lock`);
  return s;
};

export function team(name = 'acme-internal'): { name: string; repo: string; url: string; project: string } {
  const home = fresh('cp-team-');
  const host = join(home, 'host.git');
  git(home, 'init', '-q', '--bare', '--initial-branch', 'main', host);
  const url = `file://${host}`;
  const r = kit(home, 'new-pack', name, '--repo', url);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const repo = join(home, name);
  git(repo, 'remote', 'add', 'origin', url);
  git(repo, 'push', '-q', 'origin', 'main');
  return { name, repo, url, project: fixture('base') };
}
