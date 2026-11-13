// W11: the hook waiting per feature task. Reads a project's event logs (read-only; bandwarp's `.claude/logs/events-*.jsonl`), groups the
// events by their `agent` id, files each agent under the worktree it worked in (its task: macdsp, looks, settings, presets, ...; no
// worktree of the project: "other"), and sets the real wait of the 1.9 kit (the `ms` each event logged, summed) beside the wait the same
// calls cost on this tree: each kind of call (event and tool) counted for the task, times the mean wall of that kind from a replay of the
// fixture played in full (replay-play.mts --all, its <out>.json). A kind the replay has no row for (a tool no entry matches) costs 0 there.
//   node agent-task-wait.mts <project-logs-dir> <replay-all.json> [<replay-all-2.json> ...] <out.md>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseJson, toJson } from '../../../../packs/base/hooks/lib/json.mts';

interface Row { event: string; tool?: string; ms?: number; agent?: string; file?: string; command?: string; cwd?: string }
interface Replay { name?: string; proxy: boolean; perKind: Record<string, { n: number; wallMs: number }> }
interface Task { agents: Set<string>; calls: Map<string, number>; beforeMs: number }

const [logs = '', ...rest] = process.argv.slice(2);
const out = rest.pop() ?? 'agent-task-wait.md';
const replays = rest.map((f) => ({ ...(parseJson<Replay>(readFileSync(f, 'utf8')) as Replay), name: f.replace(/^.*\/replay-/, '').replace(/\.md\.json$/, '') }));
const rows: Row[] = readdirSync(logs).filter((f) => /^events-.*\.jsonl$/.test(f))
  .flatMap((f) => readFileSync(join(logs, f), 'utf8').split('\n').filter(Boolean).map((l) => parseJson<Row>(l)).filter((r): r is Row => r !== null));

// an agent's task is the worktree its files and commands name most often
const votes = new Map<string, Map<string, number>>();
for (const r of rows) {
  const m = r.agent ? /\.claude\/worktrees\/([\w-]+)/.exec(`${r.file ?? ''} ${r.command ?? ''} ${r.cwd ?? ''}`) : null;
  if (!r.agent || !m) continue;
  const v = votes.get(r.agent) ?? new Map<string, number>();
  v.set(m[1] ?? '', (v.get(m[1] ?? '') ?? 0) + 1);
  votes.set(r.agent, v);
}
const taskOf = new Map<string, string>([...votes].map(([agent, v]) => [agent, [...v].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other']));

const kindOf = (r: Row): string => (r.event === 'Stop' || r.event === 'UserPromptSubmit' ? r.event : `${r.event} ${r.tool ?? ''}`);
const tasks = new Map<string, Task>();
for (const r of rows) {
  if (!r.agent) continue;
  const name = taskOf.get(r.agent) ?? 'other';
  const t = tasks.get(name) ?? { agents: new Set<string>(), calls: new Map<string, number>(), beforeMs: 0 };
  t.agents.add(r.agent);
  t.calls.set(kindOf(r), (t.calls.get(kindOf(r)) ?? 0) + 1);
  t.beforeMs += r.ms ?? 0;
  tasks.set(name, t);
}

const mean = (rp: Replay, kind: string): number => { const k = rp.perKind[kind]; return k && k.n > 0 ? k.wallMs / k.n : 0; };
const afterMs = (t: Task, rp: Replay): number => [...t.calls].reduce((a, [kind, n]) => a + n * mean(rp, kind), 0);
const label = (rp: Replay): string => `replay ${rp.name ?? (rp.proxy ? 'proxy' : 'runner')}`;
const lines = [
  '# W11: the hook waiting per feature task', '',
  'Source: the project\'s event logs (agent-tagged events only; read-only). before = the sum of the `ms` each event logged under 1.9 (the runner\'s own time, not the wall). Each replay column = each kind of call',
  'in the task counted, times that kind\'s mean wall in a full replay of the fixture (v19: the 1.9.0 tree, the first column; proxy and runner: this tree, each factor against v19) (kinds with no replay row, such as Monitor, cost 0).', '',
  `| task | agents | events | 1.9 wait, logged (s) |${replays.map((rp, i) => ` ${label(rp)} (s) |${i === 0 ? '' : ' vs the first |'}`).join('')}`,
  `|---|---|---|---|${replays.map((_, i) => (i === 0 ? '---|' : '---|---|')).join('')}`,
];
const total = { agents: 0, events: 0, before: 0, after: replays.map(() => 0) };
for (const [name, t] of [...tasks].sort((a, b) => b[1].beforeMs - a[1].beforeMs)) {
  const events = [...t.calls.values()].reduce((a, b) => a + b, 0);
  total.agents += t.agents.size; total.events += events; total.before += t.beforeMs;
  const first = replays[0] ? afterMs(t, replays[0]) : 0;
  const cells = replays.map((rp, i) => {
    const a = afterMs(t, rp);
    total.after[i] = (total.after[i] ?? 0) + a;
    return i === 0 ? ` ${(a / 1000).toFixed(1)} |` : ` ${(a / 1000).toFixed(1)} | ${(first / a).toFixed(1)}x |`;
  });
  lines.push(`| ${name} | ${t.agents.size} | ${events} | ${(t.beforeMs / 1000).toFixed(1)} |${cells.join('')}`);
}
const totals = replays.map((_, i) => ` ${((total.after[i] ?? 0) / 1000).toFixed(1)} |${i === 0 ? '' : ` ${((total.after[0] ?? 0) / (total.after[i] ?? 1)).toFixed(1)}x |`}`);
lines.push(`| **all** | ${total.agents} | ${total.events} | ${(total.before / 1000).toFixed(1)} |${totals.join('')}`);
writeFileSync(out, `${lines.join('\n')}\n`);
writeFileSync(out.replace(/\.md$/, '.json'), toJson({ tasks: [...tasks].map(([name, t]) => ({ name, agents: t.agents.size, calls: Object.fromEntries(t.calls), beforeMs: t.beforeMs })), total }));
console.log(lines.join('\n'));
