// claude-packs logs: which hooks earn their place. Reads every log, rotated ones included, and joins each refusal to its verdict.
//   logs                                 per hook: calls, refusals, right, wrong, not judged, crashes, time
//   logs refusals [--hook <h>] [--open]  every refusal with its reason (--open: not judged yet)
//   logs mark <id> right|wrong "<why>"   the verdict, added to .claude/logs/verdicts.jsonl; nothing is rewritten
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join('.claude', 'logs');

function linesOf(dir, name) {
  const logs = join(dir, DIR);
  let files = [];
  try { files = readdirSync(logs).filter((f) => f === `${name}.jsonl` || (f.startsWith(`${name}-`) && f.endsWith('.jsonl'))).sort(); } catch { return []; }
  return files.flatMap((f) => readFileSync(join(logs, f), 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }));
}

const verdictsOf = (dir) => new Map(linesOf(dir, 'verdicts').map((v) => [v.id, v]));
const middle = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;

// A refusal followed by a pass on the same file in the same session: the writer changed something and went on.
function passedAfter(refusal, events) {
  return events.some((e) => e.t > refusal.t && e.session === refusal.session && e.file && e.file === refusal.file && e.hooks.some((h) => h.hook === refusal.hook && h.code === 0));
}

export function logsSummary(dir) {
  const events = linesOf(dir, 'events');
  const refusals = linesOf(dir, 'refusals');
  const verdicts = verdictsOf(dir);
  const rows = new Map();
  const row = (hook) => { if (!rows.has(hook)) rows.set(hook, { hook, calls: 0, refused: 0, crashed: 0, right: 0, wrong: 0, open: 0, passedAfter: 0, ms: [] }); return rows.get(hook); };
  for (const e of events) for (const h of e.hooks ?? []) { const r = row(h.hook); r.calls += 1; r.ms.push(h.ms); }
  for (const f of refusals) {
    const r = row(f.hook);
    if (f.code !== 2) { r.crashed += 1; continue; }
    r.refused += 1;
    const v = verdicts.get(f.id)?.verdict;
    if (v === 'right') r.right += 1; else if (v === 'wrong') r.wrong += 1; else r.open += 1;
    if (passedAfter(f, events)) r.passedAfter += 1;
  }
  return { first: events[0]?.t, last: events.at(-1)?.t, calls: events.length, rows: [...rows.values()].sort((a, b) => b.refused - a.refused || b.calls - a.calls) };
}

export function logsCommand(dir, rest, log = console.log) {
  const [sub] = rest;
  if (sub === 'mark') {
    const [, id, verdict, ...why] = rest;
    if (!id || !['right', 'wrong'].includes(verdict) || !why.length) throw new Error('use `logs mark <id> right|wrong "<why>"`');
    if (!linesOf(dir, 'refusals').some((r) => r.id === id)) throw new Error(`no refusal ${id}: \`logs refusals\` lists them`);
    mkdirSync(join(dir, DIR), { recursive: true });
    appendFileSync(join(dir, DIR, 'verdicts.jsonl'), `${JSON.stringify({ id, verdict, why: why.join(' '), t: new Date().toISOString() })}\n`);
    log(`${id}: ${verdict}`);
    return 0;
  }
  if (sub === 'refusals') {
    const hook = rest.includes('--hook') ? rest[rest.indexOf('--hook') + 1] : null;
    const verdicts = verdictsOf(dir);
    const list = linesOf(dir, 'refusals').filter((r) => (!hook || r.hook === hook) && (!rest.includes('--open') || !verdicts.has(r.id)));
    for (const r of list) log(`${r.id} ${r.t} ${r.hook} ${verdicts.get(r.id)?.verdict ?? 'not judged'}\n  ${r.file ?? r.command ?? r.tool ?? '-'}\n  ${(r.reason ?? '').split('\n')[0]}`);
    log(`${list.length} refusal(s)`);
    return 0;
  }
  const s = logsSummary(dir);
  if (!s.calls) { log('no calls logged yet (.claude/logs/ fills as the hooks run)'); return 0; }
  log(`${s.calls} calls, ${s.first} to ${s.last}`);
  log(`${'hook'.padEnd(24)}${'calls'.padStart(7)}${'refused'.padStart(8)}${'right'.padStart(6)}${'wrong'.padStart(6)}${'open'.padStart(6)}${'fixed'.padStart(6)}${'crash'.padStart(6)}${'ms'.padStart(6)}`);
  for (const r of s.rows) log(`${r.hook.padEnd(24)}${String(r.calls).padStart(7)}${String(r.refused).padStart(8)}${String(r.right).padStart(6)}${String(r.wrong).padStart(6)}${String(r.open).padStart(6)}${String(r.passedAfter).padStart(6)}${String(r.crashed).padStart(6)}${String(middle(r.ms)).padStart(6)}`);
  log('fixed: the same file passed the same hook later in that session. Judge the open ones: `logs refusals --open`, then `logs mark <id> right|wrong "<why>"`.');
  return 0;
}
