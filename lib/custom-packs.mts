// Custom packs (0.21.0: someone makes a pack for their employer's internals and shares it with their team). A team keeps its packs
// in a small repository of its own, `packs/<name>/` (or a pack.json at the root), which `new-pack` scaffolds. A project adds one with
// `add <name> --from <git-url>`: the repository is fetched to a cache, never run, and the lock records its url and commit, so a teammate's
// checkout restores the same pack and `update` pulls the newest. Who can fetch it is the git host's business. Its hooks stay off until the
// project's "enable" names them (lib/packs.mjs): a hook runs code on every tool call.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { childError, put } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import type { GitIdentity } from '../packs/base/hooks/lib/git-run.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import type { Env, Logger, PackManifest } from '../packs/base/hooks/lib/types.d.mts';
import { readLock } from './manifest.mts';
import { manifestProblems } from './pack-manifest.mts';
import { readPack, registerPack } from './packs.mts';

/** What a command of this module reads from outside: the environment (the cache's place) and where its lines go. */
export interface CustomPackOptions { env?: Env; log?: Logger }

/** A custom pack as the lock records it: where it came from and the commit it is at. */
export interface PackSource { url: string; commit: string }

const cacheRoot = (env: Env): string => env.CLAUDE_PACKS_CACHE ?? join(homedir(), '.cache', 'claude-packs');

/** git, trimmed output; a failure throws with git's own words. */
function git(cwd: string, env: Env, args: readonly string[], identity?: GitIdentity): string {
  const r = gitRun(args, { cwd, env, identity });
  if (!r.ok) throw new Error(r.stderr.trim() || `git ${args[0] ?? ''} failed`);
  return r.stdout.trim();
}

// The repository at a commit, or at its newest.
function fetchRepo(url: string, env: Env, commit: string | null = null): { folder: string; commit: string } {
  if (url.startsWith('-')) throw new Error(`not a git url: ${url}`);
  const folder = join(cacheRoot(env), createHash('sha256').update(url).digest('hex').slice(0, 16));
  if (existsSync(join(folder, '.git'))) git(folder, env, ['fetch', '--quiet', 'origin']);
  else {
    mkdirSync(dirname(folder), { recursive: true });
    git(cacheRoot(env), env, ['clone', '--quiet', '--', url, folder]);
  }
  git(folder, env, ['checkout', '--quiet', '--detach', commit ?? 'origin/HEAD']);
  return { folder, commit: git(folder, env, ['rev-parse', 'HEAD']) };
}

function register(name: string, folder: string): PackManifest {
  const nested = join(folder, 'packs', name);
  const root = existsSync(join(nested, 'pack.json')) ? nested : folder;
  if (!existsSync(join(root, 'pack.json'))) throw new Error(`no pack "${name}" in that repository (looked for packs/${name}/pack.json and pack.json)`);
  registerPack(name, root);
  const pack = readPack(name);
  const problems = [...manifestProblems(pack, name), ...(pack.type === 'custom' ? [] : [`pack ${name} says its type is ${pack.type}, not custom`])];
  if (problems.length) throw new Error(problems.join('; '));
  return pack;
}

const authorOf = (author: PackManifest['author']): string => (typeof author === 'object' && author !== null ? author.name : (author ?? ''));

export function addCustomPack(name: string | null | undefined, url: string, { env = process.env, log = console.log }: CustomPackOptions = {}): PackSource {
  if (!name) throw new Error('name the pack: `add <name> --from <git-url>`');
  const { folder, commit } = fetchRepo(url, env);
  const pack = register(name, folder);
  log(`  ${name} ${pack.version} by ${authorOf(pack.author)} from ${url}`);
  return { url, commit };
}

// The custom packs a project's lock names, at their commits, or at their newest for `update`. -> { name: { url, commit } }.
export function loadCustomPacks(projectDir: string, { latest = false, env = process.env, log = console.log }: CustomPackOptions & { latest?: boolean } = {}): Record<string, PackSource> {
  const out: Record<string, PackSource> = {};
  for (const [name, { url, commit }] of Object.entries(readLock(join(resolve(projectDir), '.claude')).sources ?? {})) {
    try {
      const got = fetchRepo(url, env, latest ? null : (commit ?? null));
      const pack = register(name, got.folder);
      if (latest && got.commit !== commit) log(`  ${name}: now ${pack.version} (${got.commit.slice(0, 7)})`);
      out[name] = { url, commit: got.commit };
    } catch (e) {
      throw new Error(`custom pack ${name} could not be fetched from ${url}: ${childError(e)}. Check access to that repository.`);
    }
  }
  return out;
}

const gitConfig = (key: string, env: Env): string => {
  try { return git('.', env, ['config', key]); } catch { return ''; }
};

const README = (name: string, repo: string): string => [
  `# ${name}`,
  '',
  'Our own claude-packs. Each folder under `packs/` is one pack: rules, checks, hooks, skills.',
  '',
  'Install in a project:',
  '',
  '```',
  `npx --no-install @thedecipherist/claude-packs add ${name} --from ${repo}`,
  '```',
  '',
  'After that, `update` pulls the newest. A pack\'s hooks stay off until the project names them in `"enable"` in `.claude/layout.json`.',
  '',
].join('\n');

const PACK_JSON = (name: string, author: string, repo: string): unknown => ({
  name,
  version: '0.1.0',
  description: `What ${name} is for.`,
  type: 'custom',
  author,
  license: 'UNLICENSED',
  homepage: repo,
  repository: { type: 'git', url: repo, directory: `packs/${name}` },
  keywords: [],
  engines: { 'claude-packs': '>=0.21.0' },
  folders: {},
  concepts: {},
  skillsIn: null,
  hooks: {},
});

const CHECK_JSON = (name: string): unknown => ({
  id: `${name}-example`,
  why: 'Why this pattern is refused.',
  rule: `.claude/rules/${name}-example.md`,
  concepts: ['js'],
  globs: [],
  code: true,
  pattern: '\\bOLD_API_NAME\\b',
  bad: 'OLD_API_NAME();\n',
  good: 'newApiName();\n',
});

const EXAMPLE_RULE = [
  '---',
  '# concepts: js',
  'paths:',
  '  - "placeholder"',
  '---',
  '',
  '# State the law in one line',
  '',
  '<constraints>',
  'Always do:',
  '- What the rule asks for.',
  '',
  'Never do:',
  '- What it refuses.',
  '</constraints>',
  '',
].join('\n');

const EXAMPLE_SKILL = (name: string): string => [
  '---',
  `name: ${name}-example`,
  'description: Use when the situation this skill is for comes up.',
  '---',
  '',
  '# One job',
  '',
  '<constraints>',
  'Always do:',
  '1. The first step.',
  '',
  'Never do:',
  '- What goes wrong without this skill.',
  '</constraints>',
  '',
].join('\n');

const FILES = (name: string, author: string, repo: string): Record<string, string> => ({
  'README.md': README(name, repo),
  [`packs/${name}/pack.json`]: `${toJson(PACK_JSON(name, author, repo), { pretty: true })}\n`,
  [`packs/${name}/rules/${name}-example.md`]: EXAMPLE_RULE,
  [`packs/${name}/checks/${name}-example.json`]: `${toJson(CHECK_JSON(name), { pretty: true })}\n`,
  [`packs/${name}/skills/${name}-example/SKILL.md`]: EXAMPLE_SKILL(name),
});

export function newPack(dir: string, name: string | null | undefined, { repo = null, env = process.env, log = console.log }: CustomPackOptions & { repo?: string | null } = {}): number {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('name the pack in lower case: `new-pack acme-internal`');
  const root = join(dir, name);
  if (existsSync(root)) throw new Error(`${root} already exists`);
  const url = repo ?? `git@git.example.com:team/${name}.git`;
  for (const [rel, text] of Object.entries(FILES(name, gitConfig('user.name', env) || 'Your team', url))) put(join(root, rel), text);
  git(root, env, ['init', '--quiet', '--initial-branch', 'main']);
  git(root, env, ['add', '.']);
  git(root, env, ['commit', '--quiet', '-m', `${name}: the scaffold`], { name: 'claude-packs', email: 'claude-packs@localhost' });
  log(`A new pack repository: ${root}`);
  log(`  1. Edit packs/${name}/ (pack.json says who made it and its git url${repo ? '' : ': set repository.url'}).`);
  log(`  2. Push it to your git host.`);
  log(`  3. In a project: npx --no-install @thedecipherist/claude-packs add ${name} --from ${url}`);
  return 0;
}
