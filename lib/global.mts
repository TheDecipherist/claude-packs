// `claude-packs global add|remove|doctor`: the only things this package ever puts in ~/.claude. The global
// part is exactly three pieces; everything else is per project:
//   - latest-versions: the skill and its version-pin-guard hook ("check for the newest release" applies to every
//     project, including new ones with no packs yet);
//   - gnu-shell and shell-traps. Global by design: they fix this machine's shell for Claude, not any project's rules.
// Same never-overwrite law as project installs. A hook already there, byte for byte the package's, is taken over, and
// its settings entry with it, never doubled. The house's hand-installed Python forerunners (~/.claude/hooks/
// shell-traps.py and gnu-shell.py) lose their settings entries to the Node hooks; their files are left where they are.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ensureDir } from '../packs/base/hooks/lib/files.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

const SRC = fileURLToPath(new URL('../global/', import.meta.url));

/** What `global add` copies: [path under global/, path under ~/.claude]. The global test lists what it installs. */
export const FILES: readonly (readonly [from: string, to: string])[] = [
  ['skills/latest-versions/SKILL.md', 'skills/latest-versions/SKILL.md'],
  ['hooks/version-pin-guard.mjs', 'hooks/claude-packs/version-pin-guard.mjs'],
  ['../packs/base/hooks/lib/shell-writes.mjs', 'hooks/claude-packs/lib/shell-writes.mjs'],
  ['../packs/base/hooks/lib/program-writes.mjs', 'hooks/claude-packs/lib/program-writes.mjs'],
  ['../packs/base/hooks/lib/program-read.mjs', 'hooks/claude-packs/lib/program-read.mjs'],
  ['../packs/base/hooks/lib/command-prefix.mjs', 'hooks/claude-packs/lib/command-prefix.mjs'],   // shell-writes reads through it (KWB-101)
  ['../packs/base/hooks/lib/shell-lex.mjs', 'hooks/claude-packs/lib/shell-lex.mjs'],   // shell-writes' reader of the text, split out (KWB-118)
  ['../packs/base/hooks/lib/files.mjs', 'hooks/claude-packs/lib/files.mjs'],   // the file helpers shell-writes and program-writes read through (W2.5)
  ['../packs/base/hooks/lib/json.mjs', 'hooks/claude-packs/lib/json.mjs'],   // shell-writes reads its JSON through it (W3 layer 2)
  ['../packs/base/hooks/lib/shell-sed.mjs', 'hooks/claude-packs/lib/shell-sed.mjs'],   // shell-writes' sed -i, perl -i and ruby -i readers, split out (W3 layer 2)
  ['hooks/shell-traps.mjs', 'hooks/shell-traps.mjs'],
  ['hooks/gnu-shell.mjs', 'hooks/gnu-shell.mjs'],
];

interface GlobalHook { rel: string; event: string; matcher?: string; command: (claude: string) => string; timeout: number }

// Each hook's settings entry.
const HOOKS: readonly GlobalHook[] = [
  { rel: 'hooks/claude-packs/version-pin-guard.mjs', event: 'PreToolUse', matcher: 'Write|Edit|MultiEdit|Bash', command: (claude) => `node "${join(claude, 'hooks/claude-packs/version-pin-guard.mjs')}"`, timeout: 10 },
  { rel: 'hooks/shell-traps.mjs', event: 'PreToolUse', matcher: 'Bash', command: () => 'node "$HOME/.claude/hooks/shell-traps.mjs"', timeout: 10 },
  { rel: 'hooks/gnu-shell.mjs', event: 'SessionStart', command: () => 'node "$HOME/.claude/hooks/gnu-shell.mjs"', timeout: 10 },
];
// The Python forerunners: their settings entries are the package's to replace.
const FORERUNNERS = ['hooks/shell-traps.py', 'hooks/gnu-shell.py'];
const sha = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');

// The user's ~/.claude/settings.json, as far as this command reads it: every other key is the user's and is kept.
interface EntryOfSettings { type?: string; command?: string; timeout?: number; [key: string]: unknown }
interface GroupOfSettings { matcher?: string; _claudePacks?: boolean; hooks?: EntryOfSettings[]; [key: string]: unknown }
interface UserSettings { hooks?: Record<string, GroupOfSettings[]>; [key: string]: unknown }
interface GlobalLock { files: Record<string, string>; [key: string]: unknown }

/** Where the global part lives: ~/.claude, its lock and its settings. */
function paths(home?: string): { claude: string; lock: string; settings: string } {
  const claude = join(home ?? homedir(), '.claude');
  return { claude, lock: join(claude, 'claude-packs-global.json'), settings: join(claude, 'settings.json') };
}

const BROKEN = Symbol('not JSON');

/** The user's own JSON file, or `fallback` when it is missing. One that is there and broken stops the command: the kit never
 *  writes over a user's file it could not read (the never-throwing reader is the hooks lib's readJson). */
function userJsonOrStop<T extends object>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  const value = parseJson<T | typeof BROKEN>(readFileSync(file, 'utf8'), BROKEN);
  if (value === BROKEN || value === null) throw new Error(`${file} is not valid JSON; fix it first, nothing was changed`);
  return value;
}

const ours = (h: EntryOfSettings): boolean => typeof h.command === 'string' && [...HOOKS.map((x) => x.rel), ...FORERUNNERS].some((rel) => h.command?.includes(`.claude/${rel}`));

/** settings.json with the package's hook entries taken out, and (when `add`) put back in their one group each. */
function writeSettings(file: string, settings: UserSettings, add: boolean, claude: string): void {
  const hooks: Record<string, GroupOfSettings[]> = {};
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    hooks[event] = (groups ?? []).map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !ours(h)) })).filter((g) => g.hooks.length > 0);
  }
  if (add) {
    for (const h of HOOKS) {
      const groups = (hooks[h.event] ??= []);
      let group = groups.find((g) => g.matcher === h.matcher && g._claudePacks);
      if (!group) {
        group = { ...(h.matcher ? { matcher: h.matcher } : {}), _claudePacks: true, hooks: [] };
        groups.push(group);
      }
      (group.hooks ??= []).push({ type: 'command', command: h.command(claude), ...(h.timeout ? { timeout: h.timeout } : {}) });
    }
    for (const groups of Object.values(hooks)) for (const g of groups) delete g._claudePacks;
  }
  for (const event of Object.keys(hooks)) if (hooks[event]?.length === 0) delete hooks[event];
  const next: UserSettings = { ...settings, hooks };
  if (Object.keys(hooks).length === 0) delete next.hooks;
  ensureDir(dirname(file));
  writeOrStop(file, next);
}

/** A JSON file written, or the command stopped: the old writer threw, and a global install that lost its lock says so. */
function writeOrStop(file: string, value: object): void {
  if (!writeJson(file, value, { pretty: true })) throw new Error(`could not write ${file}`);
}

export interface GlobalOptions { home?: string; log?: Logger }

export function globalAdd({ home, force = false, log = console.log }: GlobalOptions & { force?: boolean } = {}): number {
  const p = paths(home);
  const settings = userJsonOrStop<UserSettings>(p.settings, {});
  const lock = userJsonOrStop<GlobalLock>(p.lock, { files: {} });
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
  writeOrStop(p.lock, lock);
  log(`OK: latest-versions (skill and version-pin-guard), gnu-shell and shell-traps installed in ${p.claude}`);
  return 0;
}

export function globalRemove({ home, log = console.log }: GlobalOptions = {}): number {
  const p = paths(home);
  const settings = userJsonOrStop<UserSettings>(p.settings, {});
  const lock = userJsonOrStop<GlobalLock>(p.lock, { files: {} });
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

/** `global doctor`: each file there, each hook wired, each hook's selftest passing; `env` is the one the selftests run under. */
export function globalDoctor({ home, log = console.log, env = process.env }: GlobalOptions & { env?: Readonly<Record<string, string | undefined>> } = {}): number {
  const p = paths(home);
  const problems: string[] = [];
  for (const [, to] of FILES) if (!existsSync(join(p.claude, to))) problems.push(`missing ${to}`);
  const settings = userJsonOrStop<UserSettings>(p.settings, {});
  for (const h of HOOKS) {
    const wired = (settings.hooks?.[h.event] ?? []).some((g) => (g.hooks ?? []).some((x) => x.command?.includes(`.claude/${h.rel}`)));
    if (!wired) problems.push(`${h.rel} is not in ~/.claude/settings.json (${h.event})`);
    const hook = join(p.claude, h.rel);
    const r = existsSync(hook) ? spawnSync('node', [hook, '--selftest'], { env: { ...env } }) : null;
    if (r && r.status !== 0) problems.push(`${h.rel} --selftest fails`);
  }
  if (problems.length) { problems.forEach((x) => log(`- ${x}`)); return 1; }
  log('OK: global latest-versions');
  return 0;
}
