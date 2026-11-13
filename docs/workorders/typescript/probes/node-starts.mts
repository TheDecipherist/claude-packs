// W11: the node processes one event starts, counted, on this tree: a `node` shim first on PATH logs one line a start, then execs the real
// node. For each kind of event of the fixture (event and tool) the install's every entry that matches it (blocking and async) is run once
// with an event of that kind, in two modes: the Go client and the daemon answering, and the TypeScript runner (the proxy binary removed
// from the scratch cache). The count of a kind is a property of the settings, not of the run, so a total is the count times the events of
// the kind in the fixture (each kind's events counted from the fixture, not estimated).
//   node node-starts.mts <out.md>
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLI as cli, KIT as kit, fixtureEvents, makeScratch, payloadOf, sh } from '../../../../scripts/replay-lib.mts';
import { readJson } from '../../../../packs/base/hooks/lib/json.mts';

interface Entry { matcher?: string; hooks: { command: string; async?: boolean }[] }
const out = process.argv[2] ?? 'node-starts.md';
const root = mkdtempSync(join(tmpdir(), 'nodestarts-'));
const cache = join(root, 'cache');
const { dir, shim } = makeScratch(root, 100, { ...process.env, CLAUDE_PACKS_CACHE: cache });
const real = sh('command -v node', kit).out.trim();
const log = join(root, 'starts.log');
const bin = join(root, 'bin');
mkdirSync(bin);
writeFileSync(join(bin, 'node'), `#!/bin/sh\necho "$1" >> "${log}"\nexec "${real}" "$@"\n`);
chmodSync(join(bin, 'node'), 0o755);

const settings = readJson<{ hooks: Record<string, Entry[]> }>(join(dir, '.claude/settings.json'), { hooks: {} }) ?? { hooks: {} };
const events = fixtureEvents();
const kinds = new Map<string, number>();
const keyOf = (e: { event: string; tool: string }): string => (e.event === 'Stop' || e.event === 'UserPromptSubmit' ? e.event : `${e.event} ${e.tool}`);
for (const e of events) kinds.set(keyOf(e), (kinds.get(keyOf(e)) ?? 0) + 1);

const starts = (mode: 'proxy' | 'runner', e: { event: string; tool: string }, k: number): number => {
  const entries = (settings.hooks[e.event] ?? []).filter((x) => x.matcher === undefined || x.matcher === '*' || new RegExp(`^(?:${x.matcher})$`).test(e.tool));
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${bin}:${process.env['PATH']}`, CLAUDE_PROJECT_DIR: dir, GIT_EXEC_PATH: shim, TMPDIR: root,
    CLAUDE_PACKS_CACHE: mode === 'proxy' ? cache : join(root, 'none') };
  writeFileSync(log, '');
  for (const x of entries) for (const h of x.hooks) spawnSync('sh', ['-c', h.command], { cwd: dir, env, input: payloadOf(dir, e, k), encoding: 'utf8' });
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean);
  who.set(`${mode} ${e.event} ${e.tool}`, lines.map((l) => l.replace(/^.*\//, '')).join(', '));
  return lines.length;
};
const who = new Map<string, string>();
const rows: string[] = [];
const total = { proxy: 0, runner: 0 };
let k = 1;
// a first event starts the daemon (its own start is not an event's); the kinds are then counted warm
starts('proxy', { event: 'UserPromptSubmit', tool: '-' }, k);
const split = (key: string): { event: string; tool: string } => { const [event = '', tool = '-'] = key.includes(' ') ? key.split(' ') : [key, '-']; return { event, tool }; };
// every kind with the daemon first, then every kind with the runner: the two modes do not interleave
const counted = { proxy: new Map<string, number>(), runner: new Map<string, number>() };
for (const mode of ['proxy', 'runner'] as const) for (const [key] of [...kinds].sort()) { k += 1; counted[mode].set(key, starts(mode, split(key), k)); }
for (const [key, n] of [...kinds].sort()) {
  const p = counted.proxy.get(key) ?? 0;
  const r = counted.runner.get(key) ?? 0;
  total.proxy += p * n; total.runner += r * n;
  const { event, tool } = split(key);
  rows.push(`| ${key} | ${n} | ${p} (${who.get(`proxy ${event} ${tool}`)}) | ${r} (${who.get(`runner ${event} ${tool}`)}) |`);
}
sh(`node ${cli} daemon stop --dir ${dir}`, kit, { ...process.env, CLAUDE_PACKS_CACHE: cache });
const text = ['# W11: node processes started per event kind (counted with a node shim, this tree)', '',
  '| event kind | events in the fixture | node starts per event, proxy and daemon | node starts per event, TypeScript runner |', '|---|---|---|---|', ...rows, '',
  `Total over the fixture's ${events.length} events: **${total.proxy}** node starts with the proxy and daemon, **${total.runner}** with the TypeScript runner.`, ''].join('\n');
writeFileSync(out, text);
console.log(text);
rmSync(root, { recursive: true, force: true });
