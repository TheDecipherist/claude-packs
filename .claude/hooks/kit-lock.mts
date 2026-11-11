#!/usr/bin/env node
// kit-lock: one session lands work on claude-packs at a time (2026-10-31: two sessions released 0.6.0 at once, each on its
// own line, and main took one while the other waited to merge).
//   .claude-packs-lock at a checkout's root is a LEASE (lib/kit-lock.mts; KWB-29): started_at and last_seen. This hook runs on
//   every tool call (PreToolUse "*"):
//   - the holder's call renews its last_seen, at most once a minute (lib/kit-lock.mts renew);
//   - a session's first write or guarded action inside any checkout of this repo takes the lock when nobody holds it, or
//     takes over a stale one (30 min without renewal), logged in .claude/kit-lock.log;
//   - while ANOTHER session's live lease is in any checkout, it refuses that session's commits, merges and releases
//     (git commit, merge, pull, cherry-pick, revert, am, rebase, tag <name>; npm version, publish, pack) and any write
//     that removes the lease. Editing files passes, and so does a push: it only sends commits that exist (KWB-30).
// This hook is the claude-packs repo's own (its committed .claude/settings.json), not part of any pack. It imports the
// installed hooks lib (./lib, typed through tsconfig's rootDirs) and the emitted lib/kit-lock.mjs, never a source path (KWB-172).
//   node .claude/hooks/kit-lock.mjs take <session> [branch]   take the lock by hand (a session with no hook yet)
//   node .claude/hooks/kit-lock.mjs --selftest
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, normalize, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
// The installed hooks lib, typed by its source: the types come from packs/base/hooks/lib (erased, nothing loads from there),
// the code from the installed copy beside this hook, as the CLI loads a project's installed modules (types.d.mts, W2.4).
import type * as Writes from '../../packs/base/hooks/lib/writes.mts';
import type * as Files from '../../packs/base/hooks/lib/files.mts';
import type * as GitRun from '../../packs/base/hooks/lib/git-run.mts';
import type * as Json from '../../packs/base/hooks/lib/json.mts';
import type * as HookLog from '../../packs/base/hooks/lib/hook-log.mts';
import type * as Selftest from '../../packs/base/hooks/lib/selftest.mts';
import type { HookEvent } from '../../packs/base/hooks/lib/types.d.mts';
const installed = <T,>(name: string): Promise<T> => import(new URL(`./lib/${name}.mjs`, import.meta.url).href);
const [{ writesOf }, { scratchDir }, { gitRun }, { parseJson, toJson }, { projectRoot, runAsHook }, { verdicts }] = await Promise.all([
  installed<typeof Writes>('writes'), installed<typeof Files>('files'), installed<typeof GitRun>('git-run'), installed<typeof Json>('json'),
  installed<typeof HookLog>('hook-log'), installed<typeof Selftest>('selftest'),
]);
// the lock's one format and lease, read in every form (lib/kit-lock.mts, emitted; `claude-packs lock status|take|release`, KWB-25)
import { acquire, checkouts, describe, LOCK, LEASE_MIN, readLease, renew, takeLock as take, type Held } from '../../lib/kit-lock.mts';

export { checkouts, LOCK, take };

const inside = (dir: string, path: string): boolean => { const r = relative(dir, path); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
const expand = (p: string, home: string): string => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, home);
const GIT_LANDS = new Set(['commit', 'merge', 'pull', 'cherry-pick', 'revert', 'am', 'rebase']);
const NPM_RELEASE = new Set(['version', 'publish', 'pack']);
const TWO_WORD_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree']);
// git's subcommand: the first word after git that is not an option (-C <dir> and -c <key=value> take one more)
const subAt = (w: readonly string[]): number => {
  let i = 1;
  while (i < w.length && (w[i] ?? '').startsWith('-')) i += TWO_WORD_OPTIONS.has(w[i] ?? '') ? 2 : 1;
  return i;
};

/** The first command in a shell line that lands work (a commit, a merge, a release step) in a folder `ours` accepts, or null. */
export function guardedAction(command: string, cwd: string, ours: (dir: string) => boolean, home: string = homedir()): string | null {
  let body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
  body = body.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|`|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    const target = w[1];
    if (target !== undefined && ['cd', 'pushd'].includes(w[0] ?? '') && target !== "''") { here = normalize(resolve(here, expand(target, home))); continue; }
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0] ?? '') || ['env', 'command', 'time', 'nohup', 'exec'].includes(w[0] ?? ''))) w = w.slice(1);
    if (!w.length) continue;
    const tool = (w[0] ?? '').split('/').pop();
    let dir = here;
    let act: string | null = null;
    if (tool === 'git') {
      const i = subAt(w);
      const c = w.indexOf('-C');
      if (c > 0 && c < i) dir = normalize(resolve(here, expand(w[c + 1] ?? '.', home)));
      const sub = w[i] ?? '';
      const rest = w.slice(i + 1);
      if (GIT_LANDS.has(sub)) act = `git ${sub}`;
      else if (sub === 'tag' && rest.some((a) => !a.startsWith('-')) && !rest.some((a) => ['-l', '--list', '-d', '--delete', '-v', '--verify'].includes(a))) act = 'git tag';
    } else if (tool === 'npm' && NPM_RELEASE.has(w[1] ?? '')) act = `npm ${w[1]}`;
    if (act && ours(dir)) return act;
  }
  return null;
}

/** What the other session's live lease holds off, with the lease. */
export type Blocked = Held & { action: string };

/** null when the call may go ahead; else the other session's live lease and what it holds off. */
export function verdict(payload: HookEvent, root: string, env: Readonly<Record<string, string | undefined>>,
  { home = homedir(), now = Date.now() }: { home?: string; now?: number } = {}): Blocked | null {
  const all = checkouts(root);
  const session = payload.session_id ?? 'unknown';
  renew(all, session, now);
  const cwd = payload.cwd ?? root;
  const ours = (p: string): boolean => all.some((c) => inside(c, p));
  const writes = writesOf(payload, cwd, env).filter((w) => ours(w.path));
  const command = payload.tool_input?.command;
  const action = payload.tool_name === 'Bash' ? guardedAction(typeof command === 'string' ? command : '', cwd, ours, home) : null;
  if (!writes.length && !action) return null;
  const here = all.filter((c) => inside(c, cwd)).sort((a, b) => b.length - a.length)[0] ?? root;
  const r = acquire(here, session, { home, now });
  if (!('held' in r)) return null;
  const lease = join(r.held.where, LOCK);
  if (action) return { ...r.held, action: `\`${action}\`` };
  if (writes.some((w) => w.path === lease)) return { ...r.held, action: 'removing or changing its lease' };
  return null; // an edit passes; the lease stays the other session's
}

function main(text: string): number {
  const payload = parseJson<HookEvent>(text);
  if (!payload || typeof payload !== 'object') return 0;   // not an event: nothing to judge
  const v = verdict(payload, projectRoot(), process.env);
  if (!v) return 0;
  process.stderr.write(
    `BLOCKED by kit-lock: another session holds the kit lock (session ${v.lock.session}, branch ${v.lock.branch}, held since ${v.lock.startedAt ?? 'start unknown'}; ` +
      `${v.l.why}: live; lease in ${join(v.where, LOCK)}). It guards commits, merges and releases, so ${v.action} waits; editing files and ` +
      `pushing commits that exist pass. The lease goes stale ${LEASE_MIN} min after its holder's last renewal, and then your next commit takes ` +
      'it over (logged). Wait, or ask the user; never delete a live lease (`node bin/claude-packs.mjs lock release --force` is the only way).\n',
  );
  return 2;
}

/** `take <session> [branch]` by hand: the lock for a session whose own hooks are not the kit's yet. */
function takeByHand(args: readonly string[]): number {
  const at = args.indexOf('take');
  const [session = 'unknown', branch] = args.slice(at + 1);
  const root = projectRoot();
  const r = acquire(root, session, branch ? { branch } : {});
  if ('held' in r) { process.stderr.write(`kept ${join(r.held.where, LOCK)}: ${describe(r.held.lock, r.held.l)}\n`); return 1; }
  process.stdout.write(`${toJson(readLease('mine' in r ? r.mine : root))}\n`);
  return 0;
}

function selftest(): number {
  const root = scratchDir('kit-lock-');
  const home = join(root, '.home');
  gitRun(['init', '-q', '-b', 'work/x', root], { cwd: root, env: process.env });
  const W = (session: string): HookEvent => ({ session_id: session, tool_name: 'Write', tool_input: { file_path: join(root, 'lib/a.mjs'), content: 'x' } });
  const B = (session: string, command: string): HookEvent => ({ session_id: session, cwd: root, tool_name: 'Bash', tool_input: { command } });
  const at = (min: number): string => new Date(Date.now() - min * 60000).toISOString();
  const other = (seen: number): void => writeFileSync(join(root, LOCK), toJson({ version: 2, holder: { session: 'other' }, branch: 'work/y', started_at: at(90), last_seen: at(seen) }));
  const v = (p: HookEvent): Blocked | null => verdict(p, root, process.env, { home });
  const cases: [string, boolean, boolean][] = [];
  const see = (label: string, ok: boolean): void => { cases.push([label, ok, true]); };
  see('no lock: allowed', v(W('me')) === null);
  see('starting work writes the lease', readLease(root)?.session === 'me' && !!readLease(root)?.lastSeen);
  see('its own lock: allowed', v(B('me', "git commit -m 'x'")) === null);
  other(1);
  see('another live lease: a commit refused', v(B('me', "git commit -m 'x'")) !== null);
  see('another live lease: a merge refused', v(B('me', 'git merge work/z')) !== null);
  see('another live lease: an edit passes', v(W('me')) === null && readLease(root)?.session === 'other');
  see('another live lease: a push passes (KWB-30)', v(B('me', 'git push origin work/a 2>&1 | tee push.log')) === null);
  see('another live lease: never removed', v(B('me', `rm ${LOCK}`)) !== null);
  see('a read is no write', v({ session_id: 'me', tool_name: 'Bash', tool_input: { command: 'ls; git status' } }) === null);
  see('outside the repo: not judged', v({ session_id: 'me', tool_name: 'Write', tool_input: { file_path: '/elsewhere/a.txt' } }) === null);
  other(31);
  see('a stale lease (31 min) is taken over (KWB-29)', v(B('me', "git commit -m 'x'")) === null && readLease(root)?.session === 'me');
  see('and the take-over logged', /took over .*session other/.test(readFileSync(join(root, '.claude/kit-lock.log'), 'utf8')));
  other(1);
  // settings.json runs kit-lock inside run-hooks.mjs (KWB-26): it must refuse there too, not fail as exit 1
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./run-hooks.mjs', import.meta.url)), fileURLToPath(import.meta.url)], {
    input: toJson(B('me', "git commit -m 'x'")), encoding: 'utf8', env: { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: root },
  });
  see('through run-hooks: another session\'s commit refused', r.status === 2 && r.stderr.includes('BLOCKED by kit-lock'));
  return verdicts('kit-lock', cases);
}

export const hook = main; // settings.json runs it inside run-hooks.mjs (KWB-26)

await runAsHook(import.meta.url, 'kit-lock', main, selftest, { flags: { take: takeByHand } });
