// W8.3 and W11: W0's replay fixture played through an install with bandwarp's pack set, in a scratch folder (never bandwarp).
//   node docs/workorders/typescript/probes/replay-play.mts <out.md> [--stride N] [--lag MS] [--gap MS] [--proxy] [--stops N]
// The fixture (test/fixtures/replay/bandwarp-hooks.jsonl) keeps timings, not payloads, so each event becomes a payload of its kind
// (the tool, the event) and is run through the install's own settings entry: the real command (the `sh` picker), a real process,
// the wall from spawn to exit. Without --proxy HOME is the scratch, so the picker finds no binary and the TypeScript runner answers;
// with it the Go client and the daemon answer (the daemon is stopped at the end). Scratch: init of bandwarp's pack set; a repo with
// a bare remote, 12 heads, 7 agent worktrees, 3 local branches with commits GitHub lacks; the remote answers after --lag ms (a
// `git-upload-pack` shim in a GIT_EXEC_PATH folder: the look at GitHub took 4 to 7 s at load 27, W0). Before every 5th Stop a commit and
// its push land, each shown to the hooks first as Claude Code does (a ref changes under the kept look), and every Stop waits --gap ms
// (default 6 s; in a session they are minutes apart) for the detached refresh. Every Stop of the fixture is played (51, --stops); other
// events every --stride th (default 12).
// --all plays every event of the fixture (stride 1, every Stop) and adds the totals of W11: each event's wall and CPU are read from the
// kernel by run-rusage.py (the wall from spawn to exit, the CPU of the command and every descendant it waited for), summed over the
// real events, and the daemon's own CPU (ps, before and after) is added in the proxy mode. Also writes <out>.json (per kind: n, summed wall).
// Out: per event kind the wall p50/p95/worst and, from the scratch's hooks.log, each hook's own `ms` p50/p95/worst.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLI as cli, KIT as kit, settingsCommandOf, commit, fixtureEvents, git, makeScratch, payloadOf, sh } from '../../../../scripts/replay-lib.mts';
import { toJson } from '../../../../packs/base/hooks/lib/json.mts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => { const i = args.indexOf(name); return i < 0 ? fallback : String(args.splice(i, 2)[1]); };
const all = args.includes('--all');
const stride = all ? 1 : Number(flag('--stride', '12'));
const lag = Number(flag('--lag', '1500'));
const stops = all ? Infinity : Number(flag('--stops', '51'));
const gap = Number(flag('--gap', '6000'));
const proxy = args.includes('--proxy');
const out = args.find((a) => !a.startsWith('--')) ?? 'replay-play.md';

const root = mkdtempSync(join(tmpdir(), 'replay-'));
const { dir, shim } = makeScratch(root, lag, proxy ? { ...process.env, CLAUDE_PACKS_CACHE: join(root, 'cache') } : { ...process.env, HOME: root });
// the install puts the proxy binary in the scratch HOME's cache; the TypeScript runner mode takes it out, so the picker finds none
if (!proxy) rmSync(join(root, '.cache/claude-packs/bin'), { recursive: true, force: true });

const base: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: dir, GIT_EXEC_PATH: shim, TMPDIR: root };
// the daemon's socket, pid file and binary live in a folder of the scratch (CLAUDE_PACKS_CACHE), never the user's cache
const env: NodeJS.ProcessEnv = proxy ? { ...base, CLAUDE_PACKS_CACHE: join(root, 'cache') } : { ...base, HOME: root };

const commandFor = settingsCommandOf(dir);
const events = fixtureEvents();
const payload = (e: { event: string; tool: string }, k: number): string => payloadOf(dir, e, k);

const fire = (event: string, tool: string, input: string): void => {
  const cmd = commandFor(event, tool);
  if (cmd !== null) spawnSync('sh', ['-c', cmd], { cwd: dir, env, input, encoding: 'utf8' });
};
const rusage = fileURLToPath(new URL('run-rusage.py', import.meta.url));
/** The CPU seconds ps reports for every process whose command line names the scratch (the daemon and anything it holds), summed. */
const scratchCpu = (): number => sh('ps -axo time=,command=', kit).out.split('\n').filter((r) => r.includes(root) && !r.includes('ps -axo')).reduce((sum, r) => {
  const t = r.trim().split(/\s+/)[0] ?? '';
  const [days, rest] = t.includes('-') ? t.split('-') : ['0', t];
  const parts = (rest ?? '').split(':').map(Number);
  return sum + Number(days) * 86400 + parts.reduce((a, n) => a * 60 + n, 0);
}, 0);
const walls = new Map<string, number[]>();
const cpus = new Map<string, number>();
let cpuBefore = -1;
let stopsSeen = 0;
let seen = 0;
let pushes = 0;
for (const e of events) {
  if (e.event === 'Stop' ? stopsSeen >= stops : seen++ % stride !== 0) continue;
  if (e.event === 'Stop') {
    stopsSeen += 1;
    if (stopsSeen % 5 === 0) { // a commit and its push, each shown to the hooks first, as Claude Code does (a ref changes under the kept look)
      fire('PreToolUse', 'Bash', toJson({ session_id: 'replay', cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -m x -- n1.txt' } }));
      commit(dir, 100 + stopsSeen);
      fire('PreToolUse', 'Bash', toJson({ session_id: 'replay', cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push origin HEAD' } }));
      git(dir, 'push', '-q', 'origin', 'HEAD');
      pushes += 1;
    }
    spawnSync('sleep', [String(gap / 1000)]); // Stops in a session are minutes apart; the replay gives the detached refresh this long
  }
  const cmd = commandFor(e.event, e.tool);
  if (cmd === null) continue;
  const key = e.event === 'Stop' || e.event === 'UserPromptSubmit' ? e.event : `${e.event} ${e.tool}`;
  if (all) {
    if (cpuBefore < 0) cpuBefore = scratchCpu();
    const r = spawnSync('python3', ['-I', '-B', rusage, dir, cmd], { cwd: dir, env, input: payload(e, seen), encoding: 'utf8' });
    const [wall, user, system] = r.stdout.trim().split(' ').map(Number);
    walls.set(key, [...(walls.get(key) ?? []), wall ?? 0]);
    cpus.set(key, (cpus.get(key) ?? 0) + (user ?? 0) + (system ?? 0));
    continue;
  }
  const t = performance.now();
  spawnSync('sh', ['-c', cmd], { cwd: dir, env, input: payload(e, seen), encoding: 'utf8' });
  walls.set(key, [...(walls.get(key) ?? []), Math.round(performance.now() - t)]);
}
const pct = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0) : 0; };
const table = (head: string, rows: [string, number[]][]): string[] => [
  `| ${head} | n | p50 ms | p95 ms | worst ms |`, '|---|---|---|---|---|',
  ...rows.map(([k, v]) => `| ${k} | ${v.length} | ${pct(v, 0.5)} | ${pct(v, 0.95)} | ${Math.max(...v)} |`),
];
const hooks = new Map<string, number[]>();
for (const l of readFileSync(join(dir, '.claude/hooks.log'), 'utf8').split('\n').filter(Boolean)) {
  const [, event, hook, ms] = l.split('\t');
  if (hook && event && hook !== 'event' && hook !== 'run-hooks') hooks.set(`${event} ${hook}`, [...(hooks.get(`${event} ${hook}`) ?? []), Number(ms)]);
}
const worstFirst = [...hooks].sort((a, b) => pct(b[1], 0.95) - pct(a[1], 0.95)).slice(0, 24);
const text = `replay: ${stopsSeen} Stops, other events every ${stride}th, remote lag ${lag} ms, ${proxy ? 'proxy and daemon' : 'TypeScript runner'}, ${pushes} pushes\n\n`
  + `${table('event wall', [...walls].sort()).join('\n')}\n\n${table('hook, own ms (worst 24 by p95)', worstFirst).join('\n')}\n`;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const totals = (): string => {
  const events = [...walls.values()].reduce((a, v) => a + v.length, 0);
  const wall = sum([...walls.values()].map(sum));
  const prompts = walls.get('UserPromptSubmit')?.length ?? 0;
  const toolCalls = [...walls].filter(([k]) => k.startsWith('PreToolUse ')).reduce((a, [, v]) => a + v.length, 0);
  const toolWall = sum([...walls].filter(([k]) => /^(Pre|Post)ToolUse /.test(k)).map(([, v]) => sum(v)));
  const clientCpu = sum([...cpus.values()]);
  const daemonCpu = proxy ? scratchCpu() - cpuBefore : 0;
  writeFileSync(`${out}.json`, toJson({ proxy, events, wallMs: wall, perKind: Object.fromEntries([...walls].map(([k, v]) => [k, { n: v.length, wallMs: sum(v), cpuS: cpus.get(k) ?? 0 }])), clientCpuS: clientCpu, daemonCpuS: daemonCpu }));
  return `\n## totals (every event of the fixture played: ${events} events, ${prompts} prompts, ${toolCalls} tool calls)\n\n`
    + `- summed hook wait: ${(wall / 1000).toFixed(1)} s over ${events} events\n- mean per event: ${(wall / events).toFixed(1)} ms\n`
    + `- per prompt (all events / ${prompts} prompts): ${(wall / prompts / 1000).toFixed(2)} s\n`
    + `- per tool call (its Pre and Post events / ${toolCalls} calls): ${(toolWall / toolCalls).toFixed(1)} ms\n`
    + `- hook CPU: ${clientCpu.toFixed(1)} s in the command and its waited descendants${proxy ? ` + ${daemonCpu.toFixed(1)} s in the daemon (ps) = ${(clientCpu + daemonCpu).toFixed(1)} s` : ''}\n`;
};
const text2 = all ? text + totals() : text;
writeFileSync(out, text2);
process.stdout.write(text2);
if (proxy) {
  sh(`node ${cli} daemon stop --dir ${dir}`, kit, env);
  // nothing of the replay outlives it: a daemon `daemon stop` did not find (its socket in /tmp/claude-packs-UID) is ended by its command line, which names the scratch
  for (const row of sh('ps -axo pid=,command=', kit).out.split('\n')) {
    const pid = Number(row.trim().split(/\s+/)[0]);
    if (row.includes(root) && /--serve|resident/.test(row) && Number.isInteger(pid)) process.kill(pid);
  }
}
rmSync(root, { recursive: true, force: true });
