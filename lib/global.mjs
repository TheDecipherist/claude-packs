// `claude-packs global add|remove|doctor`: the only things this package ever puts in ~/.claude.
// Today that is the latest-versions skill and its version-pin-guard hook, because "check for the
// newest release" applies to every project. Same never-overwrite law as project installs.
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
];
const HOOK_REL = 'hooks/claude-packs/version-pin-guard.mjs';
const MATCHER = 'Write|Edit|MultiEdit|Bash';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function paths(home) {
  const claude = join(home ?? homedir(), '.claude');
  return { claude, lock: join(claude, 'claude-packs-global.json'), settings: join(claude, 'settings.json') };
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file} is not valid JSON (${e.message}); fix it first, nothing was changed`); }
}

const ours = (h) => typeof h?.command === 'string' && h.command.includes(HOOK_REL);

function writeSettings(file, settings, add, hookPath) {
  const groups = (settings.hooks?.PreToolUse ?? []).map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !ours(h)) })).filter((g) => g.hooks.length > 0);
  if (add) groups.push({ matcher: MATCHER, hooks: [{ type: 'command', command: `node "${hookPath}"`, timeout: 10 }] });
  settings.hooks = { ...(settings.hooks ?? {}), PreToolUse: groups };
  if (groups.length === 0) delete settings.hooks.PreToolUse;
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
  writeSettings(p.settings, settings, true, join(p.claude, HOOK_REL));
  writeFileSync(p.lock, `${JSON.stringify(lock, null, 2)}\n`);
  log(`OK: latest-versions and new-project skills and version-pin-guard hook installed in ${p.claude}`);
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
  writeSettings(p.settings, settings, false);
  rmSync(p.lock, { force: true });
  log('OK: global latest-versions removed');
  return 0;
}

export function globalDoctor({ home, log = console.log } = {}) {
  const p = paths(home);
  const problems = [];
  for (const [, to] of FILES) if (!existsSync(join(p.claude, to))) problems.push(`missing ${to}`);
  const settings = readJson(p.settings, {});
  const wired = (settings.hooks?.PreToolUse ?? []).some((g) => (g.hooks ?? []).some(ours));
  if (!wired) problems.push('version-pin-guard is not in ~/.claude/settings.json');
  const hook = join(p.claude, HOOK_REL);
  if (existsSync(hook) && spawnSync('node', [hook, '--selftest']).status !== 0) problems.push('version-pin-guard --selftest fails');
  if (problems.length) { problems.forEach((x) => log(`- ${x}`)); return 1; }
  log('OK: global latest-versions');
  return 0;
}
