// `claude-packs global add|remove|doctor`: the only things this package ever puts in ~/.claude, because
// they apply to every project, including new ones with no packs yet: the latest-versions and new-project
// skills, version-pin-guard, and the house's machine-wide shell hooks (build-guard: every compile through
// the build queue; shell-traps: the shell traps of this Mac; gnu-shell: bash 5 and the GNU tools first).
// Same never-overwrite law as project installs. A hook that is already there, byte for byte the package's
// (the house's hand-installed ~/.claude/hooks/*.py), is taken over, and its settings entry with it.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = fileURLToPath(new URL('../global/', import.meta.url));
const FILES = [
  ['skills/latest-versions/SKILL.md', 'skills/latest-versions/SKILL.md'],
  ['skills/new-project/SKILL.md', 'skills/new-project/SKILL.md'],
  ['hooks/version-pin-guard.mjs', 'hooks/claude-packs/version-pin-guard.mjs'],
  ['hooks/build-guard.py', 'hooks/build-guard.py'],
  ['hooks/shell-traps.py', 'hooks/shell-traps.py'],
  ['hooks/gnu-shell.py', 'hooks/gnu-shell.py'],
];
// Each hook's settings entry. The python ones keep the exact commands the house wrote by hand, so an
// existing entry is recognised as this one and never doubled.
const HOOKS = [
  { rel: 'hooks/claude-packs/version-pin-guard.mjs', event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|Bash', command: (claude) => `node "${join(claude, 'hooks/claude-packs/version-pin-guard.mjs')}"`, timeout: 10 },
  { rel: 'hooks/build-guard.py', event: 'PreToolUse', matcher: 'Bash', command: () => 'python3 "$HOME/.claude/hooks/build-guard.py"' },
  { rel: 'hooks/shell-traps.py', event: 'PreToolUse', matcher: 'Bash', command: () => 'python3 "$HOME/.claude/hooks/shell-traps.py"' },
  { rel: 'hooks/gnu-shell.py', event: 'SessionStart', command: () => 'python3 "$HOME/.claude/hooks/gnu-shell.py"' },
];
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function paths(home) {
  const claude = join(home ?? homedir(), '.claude');
  return { claude, lock: join(claude, 'claude-packs-global.json'), settings: join(claude, 'settings.json') };
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file} is not valid JSON (${e.message}); fix it first, nothing was changed`); }
}

const ours = (h) => typeof h?.command === 'string' && HOOKS.some((x) => h.command.includes(`.claude/${x.rel}`));

function writeSettings(file, settings, add, claude) {
  settings.hooks = { ...(settings.hooks ?? {}) };
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = (settings.hooks[event] ?? []).map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !ours(h)) })).filter((g) => g.hooks.length > 0);
  }
  if (add) {
    for (const h of HOOKS) {
      const groups = (settings.hooks[h.event] ??= []);
      let group = groups.find((g) => g.matcher === h.matcher && g._claudePacks);
      if (!group) groups.push((group = { ...(h.matcher ? { matcher: h.matcher } : {}), _claudePacks: true, hooks: [] }));
      group.hooks.push({ type: 'command', command: h.command(claude), ...(h.timeout ? { timeout: h.timeout } : {}) });
    }
    for (const groups of Object.values(settings.hooks)) for (const g of groups) delete g._claudePacks;
  }
  for (const event of Object.keys(settings.hooks)) if (settings.hooks[event].length === 0) delete settings.hooks[event];
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

export function globalAdd({ home, force = false, log = console.log } = {}) {
  const p = paths(home);
  const settings = readJson(p.settings, {});
  const lock = readJson(p.lock, { files: {} });
  for (const [from, to] of FILES) {
    const src = join(SRC, from);
    const dest = join(p.claude, to);
    mkdirSync(dirname(dest), { recursive: true });
    const theirs = existsSync(dest) && sha(dest) !== sha(src) && lock.files[to] !== sha(dest);
    if (theirs && !force) {
      copyFileSync(src, `${dest}.pack-new`);
      log(`kept your ${to}; the package version is beside it as ${to}.pack-new`);
      continue;
    }
    copyFileSync(src, dest);
    lock.files[to] = sha(dest);
  }
  writeSettings(p.settings, settings, true, p.claude);
  writeFileSync(p.lock, `${JSON.stringify(lock, null, 2)}\n`);
  log(`OK: latest-versions and new-project skills, version-pin-guard, build-guard, shell-traps and gnu-shell installed in ${p.claude}`);
  return 0;
}

export function globalRemove({ home, log = console.log } = {}) {
  const p = paths(home);
  const settings = readJson(p.settings, {});
  const lock = readJson(p.lock, { files: {} });
  for (const [, to] of FILES) {
    const dest = join(p.claude, to);
    if (existsSync(dest) && lock.files[to] === sha(dest)) rmSync(dest);
    else if (existsSync(dest)) log(`kept ${to}: you edited it`);
  }
  for (const dir of ['skills/latest-versions', 'skills/new-project', 'hooks/claude-packs']) {
    const d = join(p.claude, dir);
    try { rmSync(d, { recursive: false }); } catch { /* not empty or gone */ }
  }
  writeSettings(p.settings, settings, false, p.claude);
  rmSync(p.lock, { force: true });
  log('OK: global latest-versions removed');
  return 0;
}

export function globalDoctor({ home, log = console.log } = {}) {
  const p = paths(home);
  const problems = [];
  for (const [, to] of FILES) if (!existsSync(join(p.claude, to))) problems.push(`missing ${to}`);
  const settings = readJson(p.settings, {});
  for (const h of HOOKS) {
    const wired = (settings.hooks?.[h.event] ?? []).some((g) => (g.hooks ?? []).some((x) => x.command?.includes(`.claude/${h.rel}`)));
    if (!wired) problems.push(`${h.rel} is not in ~/.claude/settings.json (${h.event})`);
    const hook = join(p.claude, h.rel);
    const r = existsSync(hook) && spawnSync(h.rel.endsWith('.py') ? 'python3' : 'node', [hook, '--selftest'], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    if (r && r.status !== 0) problems.push(`${h.rel} --selftest fails`);
  }
  if (problems.length) { problems.forEach((x) => log(`- ${x}`)); return 1; }
  log('OK: global latest-versions');
  return 0;
}
