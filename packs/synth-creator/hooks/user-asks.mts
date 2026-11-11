// user-asks: everything the user asked, back in front of the session, so nothing discussed is forgotten (2026-10-11:
// "Sometimes you 'forget' certain things we had discussed ... maybe you also need to check memory at this time?").
//
// Every message the user sends is in the session's transcript: a turn of their own (type `user`, their text) or a message sent
// while the session was working (a `queue-operation` enqueue). This reads them back, with their times, two ways:
//   - a SessionStart hook on `compact`: their asks of the last HOURS hours go back into the context, word for word;
//   - idle-wake.mjs: the wake after their silence carries the same list.
// THE LEDGER: each ask has a status and its evidence, beside the project's own memory folder
// (~/.claude/projects/<the project's path, every character not a letter or digit made a dash>/asks-ledger.json), outside
// git, so compaction cannot touch it. Only OPEN asks come back word for word; done or answered ones are a count; needs-user
// and planned ones are one line each. Marking takes evidence (a commit, a bug number, a build.md step, or where it is planned):
//   node user-asks.mjs --transcript <path> [--hours 24] [--all]
//   node user-asks.mjs --mark <id> done|answered|planned|needs-user|not-an-ask "<evidence>"
//   node user-asks.mjs --selftest
// On the hook contract (typescript order W4): the hook reads and says, a judge. What it reads from the process (the ledger's
// place, the hours) comes from the event's environment; `--mark` is the one command that writes the ledger.
import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { isMain, projectRoot, runAsHook } from './lib/hook-log.mts';
import type { FlagHandler } from './lib/hook-log.mts';
import { parseJson, readJson, toJson } from './lib/json.mts';
import { promptFile, put, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Env, Hook } from './lib/types.d.mts';
import { pass, say } from './lib/verdict.mts';

/** One ask: when it was sent (seconds since the epoch, null when the transcript has no time) and its words. */
export type Ask = readonly [when: number | null, text: string];
/** The ledger: each ask's status and evidence, by the ask's id. */
export type Ledger = Record<string, { status: string; evidence: string; marked: string } | undefined>;

/** One line of the transcript, as far as this reads it. */
interface AskLine { type?: string; operation?: string; content?: unknown; isMeta?: boolean; isSidechain?: boolean; timestamp?: string; message?: { content?: unknown } }

const STATUSES: ReadonlySet<string> = new Set(['done', 'answered', 'planned', 'needs-user', 'not-an-ask', 'open']);
const QUIET: ReadonlySet<string> = new Set(['done', 'answered', 'not-an-ask']);
const head = (h: number, n: number): string => `TIM'S ASKS from the last ${h.toFixed(0)} hours (${n} messages). Compaction may have dropped some of them from what you remember; ` +
  'the ledger below holds which are done, with evidence. Every OPEN one is work: check it is not already done (then mark it with the evidence), ' +
  'finish it, or if it needs the user say so in one line and mark it needs-user. Do not wait to be reminded.';

/** How far back the asks reach: TIMS_ASKS_HOURS, else a day. */
export const hoursOf = (env: Env): number => Number(env['TIMS_ASKS_HOURS'] ?? 24);

const mainRoot = (p: string): string => p.replace(/\/\.claude\/worktrees\/[^/]+(\/.*)?$/, '');
export const ledgerFor = (root: string, home: string = homedir()): string => join(home, '.claude', 'projects', mainRoot(resolve(root)).replace(/[^A-Za-z0-9]/g, '-'), 'asks-ledger.json');
/** The ledger of the project an event belongs to: TIMS_ASKS_LEDGER, else the project's own beside its memory. */
export const ledgerOf = (env: Env, fallbackRoot: string): string => env['TIMS_ASKS_LEDGER'] || ledgerFor(env['CLAUDE_PROJECT_DIR'] ?? fallbackRoot);

// The user's own words in a transcript entry, or null (a tool's result, a hook's or the system's text, an agent's report).
function textOf(e: AskLine): string | null {
  if (e.type === 'queue-operation' && e.operation === 'enqueue') return typeof e.content === 'string' ? e.content : null;
  if (e.type === 'user' && !e.isMeta && !e.isSidechain) {
    let c = e.message?.content;
    if (Array.isArray(c)) c = c.filter((b): b is { type: string; text?: string } => Boolean(b) && typeof b === 'object' && b.type === 'text').map((b) => b.text ?? '').join('\n');
    return typeof c === 'string' ? c : null;
  }
  return null;
}
const isSystem = (t: string): boolean => { const s = t.trimStart(); return !s || /^(<|\[SYSTEM|\[Subagent|idle-wake:|This session is being continued|Caveat:)/.test(s); };
const squash = (t: string): string => t.split(/\s+/).filter(Boolean).join(' ');

/** The user's asks in a transcript from the last `hours` hours, each once, as of `now` (seconds since the epoch). */
export function asks(transcript: string, hours: number, now: number): Ask[] {
  const text = readText(transcript);
  if (text === null) return [];
  const out: Ask[] = [];
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    if (!line.includes('"queue-operation"') && !line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    const e = parseJson<AskLine>(line);
    if (!e) continue;
    const t = textOf(e);
    if (!t || isSystem(t)) continue;
    const when = e.timestamp ? Date.parse(e.timestamp) / 1000 : null;
    if (when !== null && !Number.isNaN(when) && now - when > hours * 3600) continue;
    const key = squash(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([when === null || Number.isNaN(when) ? null : when, t.trim()]);
  }
  return out;
}

export const askId = (t: string): string => createHash('sha1').update(squash(t)).digest('hex').slice(0, 8);
export const loadLedger = (path: string): Ledger => readJson<Ledger>(path) ?? {};

/** Marks an ask in the ledger file, at `now`; throws when the status is unknown or a status other than open has no evidence. */
export function mark(id: string, status: string, evidence: string, path: string, now: Date): void {
  if (!STATUSES.has(status)) throw new Error(`status is one of ${[...STATUSES].sort().join(', ')}`);
  if (status !== 'open' && !evidence.trim()) throw new Error('evidence is required: a commit, a bug number, a build.md step, or where it is planned');
  const led = loadLedger(path);
  led[id] = { status, evidence: evidence.trim(), marked: now.toISOString().slice(0, 19) };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, toJson(led, { pretty: true }));
  renameSync(`${path}.tmp`, path);
}

/** What `render` needs besides the asks: how far back they reach, the ledger and where it is kept, and whether done ones are listed too. */
export interface RenderOptions { hours: number; ledger: Ledger; ledgerFile: string; every?: boolean }

export function render(items: readonly Ask[], { hours, ledger, ledgerFile, every = false }: RenderOptions): string {
  if (!items.length) return '';
  const stamp = (w: number | null): string => (w ? new Date(w * 1000).toISOString().slice(5, 16).replace('T', ' ') : '     ?     ');
  const rows = items.map(([w, t]) => { const id = askId(t); return { w, t, id, st: ledger[id]?.status ?? 'open', ev: ledger[id]?.evidence ?? '' }; });
  const open = rows.filter((r) => r.st === 'open');
  const waits = rows.filter((r) => r.st === 'needs-user' || r.st === 'planned');
  const quiet = rows.filter((r) => QUIET.has(r.st));
  const lines = [head(hours, items.length),
    `LEDGER (${ledgerFile}): ${quiet.length} done or answered, ${waits.length} waiting on the user or planned, ${open.length} OPEN. Only the open ones are work; ` +
    'do not redo a done one. When one is done, mark it with its evidence: node .claude/hooks/user-asks.mjs --mark <id> done "<commit / bug / step>" ' +
    '(or answered, planned, needs-user, not-an-ask).'];
  if (open.length) { lines.push('OPEN, word for word:'); for (const r of open) lines.push(`- ${r.id} [${stamp(r.w)}] ${squash(r.t).slice(0, 1200)}`); }
  if (waits.length) { lines.push('WAITING (one line each):'); for (const r of waits) lines.push(`- ${r.id} [${stamp(r.w)}] ${r.st}: ${r.ev.slice(0, 160)} <- ${squash(r.t).slice(0, 90)}`); }
  if (every && quiet.length) { lines.push('DONE / ANSWERED:'); for (const r of quiet) lines.push(`- ${r.id} [${stamp(r.w)}] ${r.st}: ${r.ev.slice(0, 120)} <- ${squash(r.t).slice(0, 90)}`); }
  return lines.join('\n');
}

/** The asks of a transcript, rendered with the event's own ledger and hours. */
export function listFor(transcript: string, env: Env, root: string, now: number, every = false): string {
  const ledgerFile = ledgerOf(env, root);
  const hours = hoursOf(env);
  return render(asks(transcript, hours, now), { hours, ledger: loadLedger(ledgerFile), ledgerFile, every });
}

export const hook: Hook = (event, ctx) => {
  const text = listFor(event.transcript_path ?? '', ctx.env, ctx.projectDir, ctx.now / 1000);
  return text ? say(`${text}\n`) : pass;
};

/** A SessionStart on compact in a worktree says the asks of its transcript. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/transcript.jsonl': `${JSON.stringify({ type: 'user', message: { content: 'make the bank louder' } })}\n` },
  steps: [{ label: 'the asks of a transcript in the worktree', event: { hook_event_name: 'SessionStart', source: 'compact', transcript_path: '{wt}/transcript.jsonl' }, want: 0 }],
};

export function selftest(): number {
  const now = 1_800_000_000;
  const iso = (dt: number): string => new Date((now - dt) * 1000).toISOString();
  const lines = [
    { type: 'user', timestamp: iso(3600), message: { content: 'add 20 80s bass arps' } },
    { type: 'queue-operation', operation: 'enqueue', timestamp: iso(1800), content: 'and make a hook for chrome' },
    { type: 'queue-operation', operation: 'remove', timestamp: iso(1799), content: 'and make a hook for chrome' },
    { type: 'user', timestamp: iso(1700), message: { content: [{ type: 'tool_result', content: 'ok' }] } },
    { type: 'user', timestamp: iso(1600), message: { content: '<task-notification>done</task-notification>' } },
    { type: 'user', timestamp: iso(1500), isMeta: true, message: { content: 'a meta line' } },
    { type: 'user', timestamp: iso(90000), message: { content: 'an ask from two days ago' } },
    { type: 'user', timestamp: iso(60), message: { content: [{ type: 'text', text: 'is it correct the agents still run?' }] } },
    { type: 'assistant', timestamp: iso(30), message: { content: "Next I'd build P4." } },
  ];
  const dir = scratchProject();
  const transcript = join(dir, 'asks.jsonl');
  put(transcript, lines.map((l) => JSON.stringify(l)).join('\n'));
  const ledgerFile = join(dir, 'ledger.json');
  const items = asks(transcript, 24, now);
  mark(askId('add 20 80s bass arps'), 'done', 'commit abc123', ledgerFile, new Date(now * 1000));
  const out = render(items, { hours: 24, ledger: loadLedger(ledgerFile), ledgerFile });
  let refusedWithoutEvidence = false;
  try { mark('x', 'done', '', ledgerFile, new Date(now * 1000)); } catch { refusedWithoutEvidence = true; }
  const before = snapshot(dir);
  const told = runHook(fileURLToPath(import.meta.url), dir, { hook_event_name: 'SessionStart', source: 'compact', transcript_path: promptFile(dir, 'now', 'make the bank louder') });
  const trap = writtenSince(dir, before).filter((f) => f !== 'now.jsonl');
  return verdicts('user-asks', [
    ['a done ask is counted, not listed', out.includes('1 done or answered') && out.includes('2 OPEN') && !out.includes('add 20 80s bass arps') ? 1 : 0, 1],
    ['an open ask is listed word for word', out.includes('and make a hook for chrome') ? 1 : 0, 1],
    ['done without evidence is refused', refusedWithoutEvidence ? 1 : 0, 1],
    ["the user's own words, mid-turn ones too, no tool results, system text, meta lines, their old asks or the assistant",
      JSON.stringify(items.map(([, x]) => x)), JSON.stringify(['add 20 80s bass arps', 'and make a hook for chrome', 'is it correct the agents still run?'])],
    ["the ledger is the project's own, beside its memory", ledgerFor('/Users/dev/projects/my_synth', '/h'), '/h/.claude/projects/-Users-dev-projects-my-synth/asks-ledger.json'],
    ["a worktree's ledger is its project's", ledgerFor('/Users/dev/projects/my_synth/.claude/worktrees/agent-x', '/h'), ledgerFor('/Users/dev/projects/my_synth', '/h')],
    ['TIMS_ASKS_LEDGER names the ledger, else the project\'s', ledgerOf({ TIMS_ASKS_LEDGER: '/x/l.json' }, '/p') === '/x/l.json' && ledgerOf({}, '/p') === ledgerFor('/p') ? 1 : 0, 1],
    ['the hook, run on a compact, says the asks', told.status === 0 && told.stdout.includes('make the bank louder') ? 1 : 0, 1],
    ['a judge writes no file (the write trap)', trap.join(','), ''],
  ]);
}

if (isMain(import.meta.url)) {
  const env = process.env;
  const now = (): number => Date.now() / 1000;
  const cli: Record<string, FlagHandler> = {
    '--mark': (args) => {
      const i = args.indexOf('--mark');
      const [id = '', status = '', evidence = ''] = args.slice(i + 1);
      try { mark(id, status, evidence, ledgerOf(env, projectRoot()), new Date(now() * 1000)); } catch (e) { console.error(e instanceof Error ? e.message : String(e)); return 1; }
      console.log(`marked ${id} ${status}`);
      return 0;
    },
    '--transcript': (args) => {
      const hours = args.includes('--hours') ? Number(args[args.indexOf('--hours') + 1]) : hoursOf(env);
      const ledgerFile = ledgerOf(env, projectRoot());
      console.log(render(asks(args[args.indexOf('--transcript') + 1] ?? '', hours, now()), { hours, ledger: loadLedger(ledgerFile), ledgerFile, every: args.includes('--all') }));
      return 0;
    },
  };
  await runAsHook(import.meta.url, 'user-asks', hook, selftest, { flags: cli });
}
