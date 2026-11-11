// W0.5(g) and W11: a project's hook log read once into a replay fixture of events, and its per-event walls measured.
//   node docs/workorders/typescript/probes/replay-fixture.mjs <hooks.log>... --out test/fixtures/replay/NAME.jsonl --report <file.md>
// A hook log line is `ISO time, event, hook, ms, code, tool`, written when the hook finished. Claude Code starts every matching
// settings entry of one event at once, so one event is the lines of one event and tool whose times fall within GAP of each other.
// An event's wall is its last line's time less the earliest start among its lines (a line's time less its ms): its first hook line
// to its last, never a sum of medians (review-2 1.12). With several agents, two events of one kind at once merge into one; the
// count of such merges is not knowable from the log and is stated with the result.
// The fixture keeps no path and no name: times become offsets from the first line, and only the kit's hook names, the event and
// the tool are kept (a tool outside Claude Code's own names becomes `mcp`).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { toJson } from '../../../../packs/base/hooks/lib/json.mjs';

const GAP = 250;
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const out = flag('--out');
const report = flag('--report');
const lines = args.flatMap((f) => readFileSync(f, 'utf8').split('\n')).filter(Boolean);

const rows = lines.map((l) => l.split('\t')).filter((f) => f.length === 6).map(([t, event, hook, ms, code, tool]) =>
  ({ at: Date.parse(t), event, hook, ms: Number(ms), code: code === '-' ? null : Number(code), tool: /^mcp__/.test(tool) ? 'mcp' : tool }))
  .filter((r) => Number.isFinite(r.at)).sort((a, b) => a.at - b.at);

const open = new Map();
const events = [];
for (const r of rows) {
  const key = `${r.event}\t${r.tool}`;
  let e = open.get(key);
  if (!e || r.at - e.last > GAP) {
    e = { event: r.event, tool: r.tool, start: r.at - r.ms, last: r.at, hooks: [] };
    open.set(key, e);
    events.push(e);
  }
  e.start = Math.min(e.start, r.at - r.ms);
  e.last = Math.max(e.last, r.at);
  e.hooks.push([r.hook, r.ms, r.code]);
}
const t0 = rows[0]?.at ?? 0;
const fixture = events.map((e) => ({ t: e.start - t0, event: e.event, tool: e.tool, wall: e.last - e.start, procs: e.hooks.filter(([h]) => h === 'run-hooks' || h === 'heartbeat').length, hooks: e.hooks }));

if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, fixture.map((e) => toJson(e)).join('\n') + '\n');
}

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const kinds = [['PreToolUse', 'Bash'], ['PreToolUse', 'Write'], ['PreToolUse', 'Edit'], ['PreToolUse', 'Read'], ['PostToolUse', 'Bash'], ['PostToolUse', 'Write'], ['Stop', '-'], ['UserPromptSubmit', '-']];
const table = ['| event | tool | events | runner lines per event (p50) | wall p50 ms | wall p95 ms |', '|---|---|---|---|---|---|'];
for (const [event, tool] of kinds) {
  const es = fixture.filter((e) => e.event === event && e.tool === tool);
  table.push(`| ${event} | ${tool} | ${es.length} | ${pct(es.map((e) => e.procs), 0.5)} | ${pct(es.map((e) => e.wall), 0.5)} | ${pct(es.map((e) => e.wall), 0.95)} |`);
}
const span = rows.length ? ((rows.at(-1).at - t0) / 3.6e6).toFixed(2) : 0;
const text = `${rows.length} hook lines over ${span} h, ${fixture.length} events (GAP ${GAP} ms)\n\n${table.join('\n')}\n`;
if (report) writeFileSync(report, text);
process.stdout.write(text);
