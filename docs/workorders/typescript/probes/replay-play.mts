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
// Out: per event kind the wall p50/p95/worst and, from the scratch's hooks.log, each hook's own `ms` p50/p95/worst.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseJson, readJson, toJson, writeJson } from '../../../../packs/base/hooks/lib/json.mts';

const kit = resolve(import.meta.dirname, '../../../..');
const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => { const i = args.indexOf(name); return i < 0 ? fallback : String(args.splice(i, 2)[1]); };
const stride = Number(flag('--stride', '12'));
const lag = Number(flag('--lag', '1500'));
const stops = Number(flag('--stops', '51'));
const gap = Number(flag('--gap', '6000'));
const proxy = args.includes('--proxy');
const out = args.find((a) => !a.startsWith('--')) ?? 'replay-play.md';
const cli = join(kit, 'bin/claude-packs.mjs');

const sh = (cmd: string, cwd: string, env: NodeJS.ProcessEnv = process.env): { status: number | null; out: string } => {
  const r = spawnSync('sh', ['-c', cmd], { cwd, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};
const git = (cwd: string, ...a: string[]): string => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

const root = mkdtempSync(join(tmpdir(), 'replay-'));
const dir = join(root, 'proj');
const remote = join(root, 'remote.git');
mkdirSync(dir);
const init = sh(`node ${cli} init --config synth-creator cpp audio-core instrument-shell midi sound-design --dir ${dir}`, kit, proxy ? { ...process.env, CLAUDE_PACKS_CACHE: join(root, 'cache') } : { ...process.env, HOME: root });
if (init.status !== 0) throw new Error(`init failed: ${init.out}`);
git(dir, 'init', '-q', '-b', 'main');
git(root, 'init', '-q', '--bare', remote);
const layoutFile = join(dir, '.claude/layout.json');
const layout = readJson<Record<string, unknown>>(layoutFile, {}) ?? {};
const guards = { ...(layout['guards'] as object), git: { house: true, ghAuth: 'cli', trunkNeedsYes: true } };
writeJson(layoutFile, { ...layout, guards, looks: [{ name: 'warm-panel', reference: 'ref.png', code: ['src/ui/**'] }] });
mkdirSync(join(dir, 'docs'), { recursive: true });
mkdirSync(join(dir, 'src/ui'), { recursive: true });
writeFileSync(join(dir, 'docs/chart.mmd'), 'flowchart LR\n  a --> b\n');
for (let i = 0; i < 700; i++) {
  mkdirSync(join(dir, `src/dsp/m${i % 20}`), { recursive: true });
  writeFileSync(join(dir, `src/dsp/m${i % 20}/f${i}.cpp`), `// ${i}\n`);
}
writeFileSync(join(dir, '.gitignore'), 'build/\n.claude/worktrees/\n.claude/logs/\n.claude/hooks.log\n.claude/state/\n');
git(dir, 'remote', 'add', 'origin', remote);
git(dir, 'add', '.');
git(dir, 'commit', '-q', '-m', 'start');
git(dir, 'push', '-q', 'origin', 'main');
for (let i = 0; i < 12; i++) { git(dir, 'branch', `work/b${i}`); git(dir, 'push', '-q', 'origin', `work/b${i}`); }
for (let i = 0; i < 7; i++) git(dir, 'worktree', 'add', '-q', join(dir, '.claude/worktrees', `agent-${i}`), `work/b${i}`);
const commit = (cwd: string, k: number): void => {
  writeFileSync(join(cwd, `n${k}.txt`), `${k}\n`);
  git(cwd, 'add', `n${k}.txt`);
  git(cwd, 'commit', '-q', '-m', `c${k}`);
};
for (const i of [8, 9, 10]) { git(dir, 'checkout', '-q', `work/b${i}`); commit(dir, i); }
git(dir, 'checkout', '-q', 'main');

// the remote answers after `lag` ms
const shim = join(root, 'shim');
mkdirSync(shim);
const exec = sh('git --exec-path', dir).out.trim();
for (const f of readdirSync(exec)) if (f !== 'git-upload-pack') symlinkSync(join(exec, f), join(shim, f)); // git looks in GIT_EXEC_PATH first
writeFileSync(join(shim, 'git-upload-pack'), `#!/bin/sh\nsleep ${(lag / 1000).toFixed(2)}\nexec "${exec}/git-upload-pack" "$@"\n`);
chmodSync(join(shim, 'git-upload-pack'), 0o755);
const base: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: dir, GIT_EXEC_PATH: shim, TMPDIR: root };
// the daemon's socket, pid file and binary live in a folder of the scratch (CLAUDE_PACKS_CACHE), never the user's cache
const env: NodeJS.ProcessEnv = proxy ? { ...base, CLAUDE_PACKS_CACHE: join(root, 'cache') } : { ...base, HOME: root };

interface Entry { matcher?: string; hooks: { command: string; async?: boolean }[] }
const settings = readJson<{ hooks: Record<string, Entry[]> }>(join(dir, '.claude/settings.json'), { hooks: {} }) ?? { hooks: {} };
const commandFor = (event: string, tool: string): string | null => {
  const match = (x: Entry): boolean => x.matcher === undefined || x.matcher === '*' || new RegExp(`^(?:${x.matcher})$`).test(tool);
  const entry = (settings.hooks[event] ?? []).find((x) => match(x) && x.hooks.some((h) => !h.async));
  return entry?.hooks.find((h) => !h.async)?.command ?? null;
};

interface Fixture { event: string; tool: string }
const events = readFileSync(join(kit, 'test/fixtures/replay/bandwarp-hooks.jsonl'), 'utf8').split('\n').filter(Boolean)
  .map((l) => parseJson<Fixture>(l)).filter((e): e is Fixture => e !== null);
const bashes = ['ls src', 'git status --short', 'cmake --build build -j4', 'git log --oneline -3', 'cat docs/chart.mmd', 'git commit -m x -- n1.txt'];
const writeInput = (k: number): object => ({
  file_path: join(dir, `src/dsp/m${k % 20}/f${k % 700}.cpp`), content: `// w${k}\nint f${k}() { return ${k}; }\n`, old_string: `// ${k % 700}`, new_string: `// w${k}`,
});
const payload = (e: Fixture, k: number): string => {
  const head = { session_id: 'replay', cwd: dir, hook_event_name: e.event };
  if (e.event === 'Stop') return toJson({ ...head, stop_hook_active: false });
  if (e.event === 'UserPromptSubmit') return toJson({ ...head, prompt: `step ${k}` });
  const input = e.tool === 'Bash' ? { command: bashes[k % bashes.length] } : e.tool === 'Write' || e.tool === 'Edit' ? writeInput(k) : { file_path: join(dir, 'docs/chart.mmd') };
  return toJson({ ...head, tool_name: e.tool, tool_input: input, ...(e.event === 'PostToolUse' ? { tool_response: { success: true } } : {}) });
};

const fire = (event: string, tool: string, input: string): void => {
  const cmd = commandFor(event, tool);
  if (cmd !== null) spawnSync('sh', ['-c', cmd], { cwd: dir, env, input, encoding: 'utf8' });
};
const walls = new Map<string, number[]>();
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
  const t = performance.now();
  spawnSync('sh', ['-c', cmd], { cwd: dir, env, input: payload(e, seen), encoding: 'utf8' });
  const key = e.event === 'Stop' || e.event === 'UserPromptSubmit' ? e.event : `${e.event} ${e.tool}`;
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
writeFileSync(out, text);
process.stdout.write(text);
if (proxy) {
  sh(`node ${cli} daemon stop --dir ${dir}`, kit, env);
  // nothing of the replay outlives it: a daemon `daemon stop` did not find (its socket in /tmp/claude-packs-UID) is ended by its command line, which names the scratch
  for (const row of sh('ps -axo pid=,command=', kit).out.split('\n')) {
    const pid = Number(row.trim().split(/\s+/)[0]);
    if (row.includes(root) && /--serve|resident/.test(row) && Number.isInteger(pid)) process.kill(pid);
  }
}
rmSync(root, { recursive: true, force: true });
