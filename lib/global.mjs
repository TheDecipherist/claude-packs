// `claude-packs global add|remove|doctor`: the only things this package ever puts in ~/.claude. The global
// part is exactly three pieces; everything else is per project:
//   - latest-versions: the skill and its version-pin-guard hook ("check for the newest release" applies to every
//     project, including new ones with no packs yet);
//   - gnu-shell and shell-traps. Global by design: they fix this machine's shell for Claude, not any project's rules.
// Same never-overwrite law as project installs. A hook already there, byte for byte the package's, is taken over, and
// its settings entry with it, never doubled. The house's hand-installed Python forerunners (~/.claude/hooks/
// shell-traps.py and gnu-shell.py) lose their settings entries to the Node hooks; their files are left where they are.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseJson } from '../packs/base/hooks/lib/json.mjs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = fileURLToPath(new URL('../global/', import.meta.url));
export const FILES = [
  ['skills/latest-versions/SKILL.md', 'skills/latest-versions/SKILL.md'],
  ['hooks/version-pin-guard.mjs', 'hooks/claude-packs/version-pin-guard.mjs'],
  ['../packs/base/hooks/lib/shell-writes.mjs', 'hooks/claude-packs/lib/shell-writes.mjs'],
  ['../packs/base/hooks/lib/program-writes.mjs', 'hooks/claude-packs/lib/program-writes.mjs'],
  ['../packs/base/hooks/lib/program-read.mjs', 'hooks/claude-packs/lib/program-read.mjs'],
  ['../packs/base/hooks/lib/command-prefix.mjs', 'hooks/claude-packs/lib/command-prefix.mjs'],   // shell-writes reads through it (KWB-101)
  ['../packs/base/hooks/lib/shell-lex.mjs', 'hooks/claude-packs/lib/shell-lex.mjs'],   // shell-writes' reader of the text, split out (KWB-118)
  ['../packs/base/hooks/lib/files.mjs', 'hooks/claude-packs/lib/files.mjs'],   // the file helpers shell-writes and program-writes read through (W2.5)
  ['hooks/shell-traps.mjs', 'hooks/shell-traps.mjs'],
  ['hooks/gnu-shell.mjs', 'hooks/gnu-shell.mjs'],
];
// Each hook's settings entry.
const HOOKS = [
  { rel: 'hooks/claude-packs/version-pin-guard.mjs', event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|Bash', command: (claude) => `node "${join(claude, 'hooks/claude-packs/version-pin-guard.mjs')}"`, timeout: 10 },
  { rel: 'hooks/shell-traps.mjs', event: 'PreToolUse', matcher: 'Bash', command: () => 'node "$HOME/.claude/hooks/shell-traps.mjs"', timeout: 10 },
  { rel: 'hooks/gnu-shell.mjs', event: 'SessionStart', command: () => 'node "$HOME/.claude/hooks/gnu-shell.mjs"', timeout: 10 },
];
// The Python forerunners: their settings entries are the package's to replace.
const FORERUNNERS = ['hooks/shell-traps.py', 'hooks/gnu-shell.py'];
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function paths(home) {
  const claude = join(home ?? homedir(), '.claude');
  return { claude, lock: join(claude, 'claude-packs-global.json'), settings: join(claude, 'settings.json') };
}

const BROKEN = Symbol('not JSON');

/** The user's own JSON file, or `fallback` when it is missing. One that is there and broken stops the command: the kit never
 *  writes over a user's file it could not read (the never-throwing reader is the hooks lib's readJson). */
function userJsonOrStop(file, fallback) {
  if (!existsSync(file)) return fallback;
  const value = parseJson(readFileSync(file, 'utf8'), BROKEN);
  if (value === BROKEN) throw new Error(`${file} is not valid JSON; fix it first, nothing was changed`);
  return value;
}

const ours = (h) => typeof h?.command === 'string' && [...HOOKS.map((x) => x.rel), ...FORERUNNERS].some((rel) => h.command.includes(`.claude/${rel}`));

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
  const settings = userJsonOrStop(p.settings, {});
  const lock = userJsonOrStop(p.lock, { files: {} });
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
  log(`OK: latest-versions (skill and version-pin-guard), gnu-shell and shell-traps installed in ${p.claude}`);
  return 0;
}

export function globalRemove({ home, log = console.log } = {}) {
  const p = paths(home);
  const settings = userJsonOrStop(p.settings, {});
  const lock = userJsonOrStop(p.lock, { files: {} });
  for (const [, to] of FILES) {
    const dest = join(p.claude, to);
    if (existsSync(dest) && lock.files[to] === sha(dest)) rmSync(dest);
    else if (existsSync(dest)) log(`kept ${to}: you edited it`);
  }
  for (const dir of ['skills/latest-versions', 'hooks/claude-packs/lib', 'hooks/claude-packs']) {
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
  const settings = userJsonOrStop(p.settings, {});
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
