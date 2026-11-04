// Custom packs (0.21.0; Tim: someone makes a pack for their employer's internals and shares it with their team). A team keeps its packs
// in a small repository of its own, `packs/<name>/` (or a pack.json at the root), which `new-pack` scaffolds. A project adds one with
// `add <name> --from <git-url>`: the repository is fetched to a cache, never run, and the lock records its url and commit, so a teammate's
// checkout restores the same pack and `update` pulls the newest. Who can fetch it is the git host's business. Its hooks stay off until the
// project's "enable" names them (lib/packs.mjs): a hook runs code on every tool call.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readLock } from './manifest.mjs';
import { manifestProblems } from './pack-manifest.mjs';
import { readPack, registerPack } from './packs.mjs';

const cacheRoot = () => process.env.CLAUDE_PACKS_CACHE ?? join(homedir(), '.cache', 'claude-packs');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// The repository at a commit, or at its newest: -> { folder, commit }.
function fetchRepo(url, commit = null) {
  if (url.startsWith('-')) throw new Error(`not a git url: ${url}`);
  const folder = join(cacheRoot(), createHash('sha256').update(url).digest('hex').slice(0, 16));
  if (existsSync(join(folder, '.git'))) git(folder, 'fetch', '--quiet', 'origin');
  else {
    mkdirSync(dirname(folder), { recursive: true });
    git(cacheRoot(), 'clone', '--quiet', '--', url, folder);
  }
  git(folder, 'checkout', '--quiet', '--detach', commit ?? 'origin/HEAD');
  return { folder, commit: git(folder, 'rev-parse', 'HEAD') };
}

function register(name, folder) {
  const nested = join(folder, 'packs', name);
  const root = existsSync(join(nested, 'pack.json')) ? nested : folder;
  if (!existsSync(join(root, 'pack.json'))) throw new Error(`no pack "${name}" in that repository (looked for packs/${name}/pack.json and pack.json)`);
  registerPack(name, root);
  const pack = readPack(name);
  const problems = [...manifestProblems(pack, name), ...(pack.type === 'custom' ? [] : [`pack ${name} says its type is ${pack.type}, not custom`])];
  if (problems.length) throw new Error(problems.join('; '));
  return pack;
}

export function addCustomPack(name, url) {
  if (!name) throw new Error('name the pack: `add <name> --from <git-url>`');
  const { folder, commit } = fetchRepo(url);
  const pack = register(name, folder);
  console.log(`  ${name} ${pack.version} by ${pack.author} from ${url}`);
  return { url, commit };
}

// The custom packs a project's lock names, at their commits, or at their newest for `update`. -> { name: { url, commit } }.
export function loadCustomPacks(projectDir, { latest = false } = {}) {
  const out = {};
  for (const [name, { url, commit }] of Object.entries(readLock(join(resolve(projectDir), '.claude')).sources ?? {})) {
    try {
      const got = fetchRepo(url, latest ? null : commit);
      const pack = register(name, got.folder);
      if (latest && got.commit !== commit) console.log(`  ${name}: now ${pack.version} (${got.commit.slice(0, 7)})`);
      out[name] = { url, commit: got.commit };
    } catch (e) {
      throw new Error(`custom pack ${name} could not be fetched from ${url}: ${String(e.stderr ?? e.message).trim().split('\n')[0]}. Check access to that repository.`);
    }
  }
  return out;
}

const gitConfig = (key) => { try { return git('.', 'config', key); } catch { return ''; } };

const FILES = (name, author, repo) => ({
  'README.md': `# ${name}\n\nOur own claude-packs. Each folder under \`packs/\` is one pack: rules, checks, hooks, skills.\n\nInstall in a project:\n\n\`\`\`\nnpx --no-install @thedecipherist/claude-packs add ${name} --from ${repo}\n\`\`\`\n\nAfter that, \`update\` pulls the newest. A pack's hooks stay off until the project names them in \`"enable"\` in \`.claude/layout.json\`.\n`,
  [`packs/${name}/pack.json`]: `${JSON.stringify({ name, version: '0.1.0', description: `What ${name} is for.`, type: 'custom', author, license: 'UNLICENSED', homepage: repo, repository: { type: 'git', url: repo, directory: `packs/${name}` }, keywords: [], engines: { 'claude-packs': '>=0.21.0' }, folders: {}, concepts: {}, skillsIn: null, hooks: {} }, null, 2)}\n`,
  [`packs/${name}/rules/${name}-example.md`]: '---\n# concepts: js\npaths:\n  - "placeholder"\n---\n\n# State the law in one line\n\n<constraints>\nAlways do:\n- What the rule asks for.\n\nNever do:\n- What it refuses.\n</constraints>\n',
  [`packs/${name}/checks/${name}-example.json`]: `${JSON.stringify({ id: `${name}-example`, why: 'Why this pattern is refused.', rule: `.claude/rules/${name}-example.md`, concepts: ['js'], globs: [], code: true, pattern: '\\bOLD_API_NAME\\b', bad: 'OLD_API_NAME();\n', good: 'newApiName();\n' }, null, 2)}\n`,
  [`packs/${name}/skills/${name}-example/SKILL.md`]: `---\nname: ${name}-example\ndescription: Use when the situation this skill is for comes up.\n---\n\n# One job\n\n<constraints>\nAlways do:\n1. The first step.\n\nNever do:\n- What goes wrong without this skill.\n</constraints>\n`,
});

export function newPack(dir, name, { repo = null } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) throw new Error('name the pack in lower case: `new-pack acme-internal`');
  const root = join(dir, name);
  if (existsSync(root)) throw new Error(`${root} already exists`);
  const url = repo ?? `git@git.example.com:team/${name}.git`;
  for (const [rel, text] of Object.entries(FILES(name, gitConfig('user.name') || 'Your team', url))) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  git(root, 'init', '--quiet', '--initial-branch', 'main');
  git(root, 'add', '.');
  git(root, '-c', 'user.name=claude-packs', '-c', 'user.email=claude-packs@localhost', 'commit', '--quiet', '-m', `${name}: the scaffold`);
  console.log(`A new pack repository: ${root}`);
  console.log(`  1. Edit packs/${name}/ (pack.json says who made it and its git url${repo ? '' : ': set repository.url'}).`);
  console.log(`  2. Push it to your git host.`);
  console.log(`  3. In a project: npx --no-install @thedecipherist/claude-packs add ${name} --from ${url}`);
  return 0;
}
