#!/usr/bin/env node
// tims-asks: everything Tim asked, back in front of the session, so nothing discussed is forgotten (Tim, 2026-10-11:
// "Sometimes you 'forget' certain things we had discussed ... maybe you also need to check memory at this time?").
//
// Every message Tim sends is in the session's transcript: a turn of his own (type `user`, his text) or a message sent
// while the session was working (a `queue-operation` enqueue). This reads them back, with their times, two ways:
//   - a SessionStart hook on `compact`: his asks of the last HOURS hours go back into the context, word for word;
//   - idle-wake.mjs: the wake after his silence carries the same list.
// THE LEDGER: each ask has a status and its evidence, beside the project's own memory folder
// (~/.claude/projects/<the project's path, every character not a letter or digit made a dash>/asks-ledger.json), outside
// git, so compaction cannot touch it. Only OPEN asks come back word for word; done or answered ones are a count; needs-tim
// and planned ones are one line each. Marking takes evidence (a commit, a bug number, a build.md step, or where it is planned):
//   node tims-asks.mjs --transcript <path> [--hours 24] [--all]
//   node tims-asks.mjs --mark <id> done|answered|planned|needs-tim|not-an-ask "<evidence>"
//   node tims-asks.mjs --selftest
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOURS = Number(process.env.TIMS_ASKS_HOURS ?? 24);
const STATUSES = new Set(['done', 'answered', 'planned', 'needs-tim', 'not-an-ask', 'open']);
const QUIET = new Set(['done', 'answered', 'not-an-ask']);
const HEAD = (h, n) => `TIM'S ASKS from the last ${h.toFixed(0)} hours (${n} messages). Compaction may have dropped some of them from what you remember; ` +
  'the ledger below holds which are done, with evidence. Every OPEN one is work: check it is not already done (then mark it with the evidence), ' +
  'finish it, or if it needs Tim say so in one line and mark it needs-tim. Do not wait to be reminded.';

const mainRoot = (p) => p.replace(/\/\.claude\/worktrees\/[^/]+(\/.*)?$/, '');
export const ledgerFor = (root) => join(homedir(), '.claude', 'projects', mainRoot(resolve(root)).replace(/[^A-Za-z0-9]/g, '-'), 'asks-ledger.json');
export const LEDGER = process.env.TIMS_ASKS_LEDGER || ledgerFor(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

// Tim's own words in a transcript entry, or null (a tool's result, a hook's or the system's text, an agent's report).
function textOf(e) {
  if (e.type === 'queue-operation' && e.operation === 'enqueue') return typeof e.content === 'string' ? e.content : null;
  if (e.type === 'user' && !e.isMeta && !e.isSidechain) {
    let c = e.message?.content;
    if (Array.isArray(c)) c = c.filter((b) => b && b.type === 'text').map((b) => b.text ?? '').join('\n');
    return typeof c === 'string' ? c : null;
  }
  return null;
}
const isSystem = (t) => { const s = t.trimStart(); return !s || /^(<|\[SYSTEM|\[Subagent|idle-wake:|This session is being continued|Caveat:)/.test(s); };
const squash = (t) => t.split(/\s+/).filter(Boolean).join(' ');

export function asks(transcript, hours = HOURS, now = Date.now() / 1000) {
  let text;
  try { text = readFileSync(transcript, 'utf8'); } catch { return []; }
  const out = [];
  const seen = new Set();
  for (const line of text.split('\n')) {
    if (!line.includes('"queue-operation"') && !line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    const t = textOf(e);
    if (!t || isSystem(t)) continue;
    const when = e.timestamp ? Date.parse(e.timestamp) / 1000 : null;
    if (when !== null && !Number.isNaN(when) && now - when > hours * 3600) continue;
    const key = squash(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([Number.isNaN(when) ? null : when, t.trim()]);
  }
  return out;
}

export const askId = (t) => createHash('sha1').update(squash(t)).digest('hex').slice(0, 8);
export function loadLedger(path = LEDGER) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; } }

export function mark(id, status, evidence = '', path = LEDGER) {
  if (!STATUSES.has(status)) throw new Error(`status is one of ${[...STATUSES].sort().join(', ')}`);
  if (status !== 'open' && !evidence.trim()) throw new Error('evidence is required: a commit, a bug number, a build.md step, or where it is planned');
  const led = loadLedger(path);
  led[id] = { status, evidence: evidence.trim(), marked: new Date().toISOString().slice(0, 19) };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, JSON.stringify(led, null, 1));
  renameSync(`${path}.tmp`, path);
}

export function render(items, hours = HOURS, ledger = null, every = false) {
  if (!items.length) return '';
  const led = ledger ?? loadLedger();
  const stamp = (w) => (w ? new Date(w * 1000).toISOString().slice(5, 16).replace('T', ' ') : '     ?     ');
  const rows = items.map(([w, t]) => { const id = askId(t); return { w, t, id, st: led[id]?.status ?? 'open', ev: led[id]?.evidence ?? '' }; });
  const open = rows.filter((r) => r.st === 'open');
  const waits = rows.filter((r) => r.st === 'needs-tim' || r.st === 'planned');
  const quiet = rows.filter((r) => QUIET.has(r.st));
  const lines = [HEAD(hours, items.length),
    `LEDGER (${LEDGER}): ${quiet.length} done or answered, ${waits.length} waiting on Tim or planned, ${open.length} OPEN. Only the open ones are work; ` +
    'do not redo a done one. When one is done, mark it with its evidence: node .claude/hooks/tims-asks.mjs --mark <id> done "<commit / bug / step>" ' +
    '(or answered, planned, needs-tim, not-an-ask).'];
  if (open.length) { lines.push('OPEN, word for word:'); for (const r of open) lines.push(`- ${r.id} [${stamp(r.w)}] ${squash(r.t).slice(0, 1200)}`); }
  if (waits.length) { lines.push('WAITING (one line each):'); for (const r of waits) lines.push(`- ${r.id} [${stamp(r.w)}] ${r.st}: ${r.ev.slice(0, 160)} <- ${squash(r.t).slice(0, 90)}`); }
  if (every && quiet.length) { lines.push('DONE / ANSWERED:'); for (const r of quiet) lines.push(`- ${r.id} [${stamp(r.w)}] ${r.st}: ${r.ev.slice(0, 120)} <- ${squash(r.t).slice(0, 90)}`); }
  return lines.join('\n');
}

function selftest() {
  const now = Date.now() / 1000;
  const iso = (dt) => new Date((now - dt) * 1000).toISOString();
  const rows = [
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
  const t = join(tmpdir(), `tims-asks-${process.pid}.jsonl`);
  writeFileSync(t, rows.map((r) => JSON.stringify(r)).join('\n'));
  const items = asks(t, 24, now);
  rmSync(t, { force: true });
  const led = `${t}.ledger.json`;
  mark(askId('add 20 80s bass arps'), 'done', 'commit abc123', led);
  const out = render(items, 24, loadLedger(led));
  rmSync(led, { force: true });
  const checks = [
    ['a done ask is counted, not listed; the open ones are listed word for word', out.includes('1 done or answered') && out.includes('2 OPEN') && !out.includes('add 20 80s bass arps') && out.includes('and make a hook for chrome')],
    ['done without evidence is refused', (() => { try { mark('x', 'done', '', led); return false; } catch { return true; } })()],
    ["Tim's own words, mid-turn ones too, no tool results, system text, meta lines, his old asks or the assistant",
      JSON.stringify(items.map(([, x]) => x)) === JSON.stringify(['add 20 80s bass arps', 'and make a hook for chrome', 'is it correct the agents still run?'])],
    ["the ledger is the project's own, beside its memory, and a worktree's is its project's",
      ledgerFor('/Users/tim/projects/my_synth') === join(homedir(), '.claude/projects/-Users-tim-projects-my-synth/asks-ledger.json') &&
      ledgerFor('/Users/tim/projects/my_synth/.claude/worktrees/agent-x') === ledgerFor('/Users/tim/projects/my_synth')],
  ];
  for (const [name, ok] of checks) if (!ok) console.error(`FAIL  ${name}`);
  const bad = checks.filter(([, ok]) => !ok).length;
  console.log(`tims-asks selftest: ${bad ? 'FAIL' : 'OK'}`);
  return bad ? 1 : 0;
}

function main(argv) {
  if (argv.includes('--selftest')) return selftest();
  const i = argv.indexOf('--mark');
  if (i >= 0) {
    try { mark(argv[i + 1], argv[i + 2], argv[i + 3] ?? ''); } catch (e) { console.error(e.message); return 1; }
    console.log(`marked ${argv[i + 1]} ${argv[i + 2]}`);
    return 0;
  }
  const ti = argv.indexOf('--transcript');
  if (ti >= 0) {
    const h = argv.includes('--hours') ? Number(argv[argv.indexOf('--hours') + 1]) : HOURS;
    console.log(render(asks(argv[ti + 1], h), h, null, argv.includes('--all')));
    return 0;
  }
  // A HOOK (SessionStart on compact): what it prints is added to the session's context
  let event;
  try { event = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const text = render(asks(event.transcript_path ?? ''));
  if (text) console.log(text);
  return 0;
}

// Run as a hook or a command (not imported by idle-wake). Real paths: /var and /private/var are one folder on a Mac.
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) process.exit(main(process.argv.slice(2)));
