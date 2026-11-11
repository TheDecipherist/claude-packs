// W0.5 and W11: the kit's before-and-after measurements (b), (c), (e), (f), (h), (i), (j), (k), (l), by one command, so the
// "after" is taken exactly as the "before" was. (a) is `npm test` itself, (d) the release rehearsal and (g) the replay fixture
// (replay-fixture.mjs) are taken by hand and written beside these.
//   node docs/workorders/typescript/probes/baseline.mjs <out-dir> [b c e f h i j k l]
// Each measurement records its command, the load average before it, and its number; a timing under 5 minutes is the median of
// two runs (both kept), a longer one runs once and says so. Scratch projects live in the system temp folder; nothing outside it
// and <out-dir> is written, and a file touched for a gate is put back byte for byte.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseJson, readJson, toJson } from '../../../../packs/base/hooks/lib/json.mjs';

const kit = resolve(new URL('../../../..', import.meta.url).pathname);
const [outDir = 'build/evidence/W0', ...only] = process.argv.slice(2);
const want = (k) => only.length === 0 || only.includes(k);
mkdirSync(outDir, { recursive: true });
const report = join(outDir, 'baseline-measured.md');
const load = () => loadavg().map((n) => n.toFixed(2)).join(' ');
const say = (line) => { appendFileSync(report, `${line}\n`); console.log(line); };
const cli = join(kit, 'bin', 'claude-packs.mjs');

function run(cmd, args, { cwd = kit, env = {}, input } = {}) {
  const t = performance.now();
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, input, encoding: 'utf8', maxBuffer: 1 << 28 });
  return { ms: Math.round(performance.now() - t), status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
// The median of two runs, or one run when the first passes 5 minutes.
function twice(label, fn) {
  const before = load();
  const first = fn();
  if (first.ms > 300_000) return { ...first, label, runs: [first.ms], load: before };
  const second = fn();
  return { ...second, label, ms: Math.round((first.ms + second.ms) / 2), runs: [first.ms, second.ms], load: before };
}
const line = (id, what, command, r, extra = '') =>
  say(`- (${id}) ${what}: **${r.ms} ms** (runs ${r.runs.join(', ')}; load ${r.load}; exit ${r.status})${extra}\n  command: \`${command}\``);

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'baseline-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

// (b), (c): the changed-tests gate with one file touched, the files picked and the wall. The touch is a change inside a function
// (a no-op statement on the first line of the file's first top-level function), since the picker rightly picks nothing for a
// comment outside every function.
const FIRST_FUNCTION = /^(?:export\s+)?(?:async\s+)?function\s+[\w$]+.*\{\s*$/m;
function gate(id, rel) {
  const file = join(kit, rel);
  const original = readFileSync(file);
  try {
    const text = original.toString('utf8');
    const at = FIRST_FUNCTION.exec(text);
    if (!at) throw new Error(`${rel}: no top-level function to touch`);
    const end = at.index + at[0].length;
    writeFileSync(file, `${text.slice(0, end)}\n  void 0; // baseline touch${text.slice(end)}`);
    const picked = run('node', ['scripts/test-changed.mjs', '--dry-run']).out.match(/chose (\d+) of (\d+)/);
    const r = twice(id, () => run('node', ['.claude/tools/quiet-test.mjs', 'node', 'scripts/test-changed.mjs']));
    writeFileSync(join(outDir, `gate-${id}.log`), r.out);
    line(id, `one-file gate, ${rel} touched`, `node scripts/test-changed.mjs (${rel} touched)`, r, `; picked ${picked?.[1]} of ${picked?.[2]} test files`);
  } finally {
    writeFileSync(file, original);
  }
}
// The file a gate touches: its .mts once converted, else its .mjs.
const source = (stem) => (existsSync(join(kit, `${stem}.mts`)) ? `${stem}.mts` : `${stem}.mjs`);

const CONFIG = ['init', '--config', 'synth-creator', 'cpp', 'audio-core'];
let install = null;
// (e): init plus doctor into a fresh folder, the selftest cache empty, then warm (a second fresh folder, the same cache).
function initDoctor() {
  const cache = mkdtempSync(join(tmpdir(), 'baseline-cache-'));
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: cache };
  for (const [state, fresh] of [['cache empty', true], ['cache warm', false]]) {
    const before = load();
    if (fresh) rmSync(cache, { recursive: true, force: true });
    const dir = scratch();
    const i = run('node', [cli, ...CONFIG, '--dir', dir], { env });
    const d = run('node', [cli, 'doctor', '--dir', dir], { env });
    if (fresh) install = { dir, env };
    say(`- (e) init ${CONFIG.slice(1).join(' ')} + doctor, ${state}: **${i.ms + d.ms} ms** ` +
      `(init ${i.ms}, doctor ${d.ms}; load ${before}; exit ${i.status}/${d.status})\n` +
      `  command: \`claude-packs ${CONFIG.join(' ')} --dir <fresh>; claude-packs doctor --dir <fresh>\``);
  }
}
const ensureInstall = () => { if (!install) initDoctor(); return install; };

// (f): update on a copy of (e)'s install.
function update() {
  const { dir, env } = ensureInstall();
  const r = twice('f', () => {
    const copy = mkdtempSync(join(tmpdir(), 'baseline-copy-'));
    cpSync(dir, copy, { recursive: true });
    return run('node', [cli, 'update', '--dir', copy], { env });
  });
  line('f', 'update on a copy of (e)', 'claude-packs update --dir <copy of (e)>', r);
}

const settingsOf = (dir) => readJson(join(dir, '.claude', 'settings.json'), {});
const bashEvent = (dir) => toJson({ session_id: 'baseline', transcript_path: '', cwd: dir, hook_event_name: 'PreToolUse',
  tool_name: 'Bash', tool_input: { command: 'ls', description: 'List files' } });
// (h): one Bash event through a base install's runner entry for Bash alone (base's six Bash hooks), 10 starts.
function runner() {
  const dir = scratch();
  run('node', [cli, 'init', '--config', 'base', '--dir', dir]);
  const settings = settingsOf(dir);
  const entries = (settings.hooks.PreToolUse ?? []).filter((g) => g.matcher === 'Bash').flatMap((g) => g.hooks.map((h) => h.command));
  const command = entries.find((c) => c.includes('run-hooks')) ?? entries[0];
  const hooks = command.split('.mjs').length - 2;
  const env = { CLAUDE_PROJECT_DIR: dir };
  const times = Array.from({ length: 10 }, () => run('sh', ['-c', command], { cwd: dir, env, input: bashEvent(dir) }).ms).sort((a, b) => a - b);
  say(`- (h) one Bash event through the runner and its ${hooks} hooks (a base install), 10 starts: **${times[5]} ms** median ` +
    `(all: ${times.join(', ')}; load ${load()})\n  command: \`${command.replace(dir, '<install>')}\``);
}

// (i): the status line, a render's wall (median of 10) and its CPU (user+sys) times the renders a minute at its refreshInterval.
function statusLine() {
  const { dir } = ensureInstall();
  const settings = settingsOf(dir);
  const every = settings.statusLine?.refreshInterval ?? 1;
  const tool = join(dir, '.claude', 'tools', 'statusline.mjs');
  const session = toJson({ session_id: 'baseline', cwd: dir, workspace: { current_dir: dir, project_dir: dir }, model: { display_name: 'Opus' } });
  const renders = Array.from({ length: 10 }, () => {
    const r = run('/usr/bin/time', ['-p', 'node', tool], { cwd: dir, env: { CLAUDE_PROJECT_DIR: dir }, input: session });
    const cpu = ['user', 'sys'].map((k) => Number(r.out.match(new RegExp(`^${k}\\s+([\\d.]+)`, 'm'))?.[1] ?? 0)).reduce((a, b) => a + b, 0);
    return { ms: r.ms, cpu };
  });
  const ms = renders.map((r) => r.ms).sort((a, b) => a - b)[5];
  const cpu = renders.map((r) => r.cpu).sort((a, b) => a - b)[5];
  say(`- (i) the status line: a render **${ms} ms** median of 10, CPU **${(cpu * 60 / every).toFixed(2)} s a minute** ` +
    `(${cpu.toFixed(2)} s a render, refreshInterval ${every} s; load ${load()})\n  command: \`node .claude/tools/statusline.mjs < session.json\``);
}

// (j): tsc's build, warm; 0 where the kit has no build.
function build() {
  const pkg = readJson(join(kit, 'package.json'), {});
  if (!pkg.scripts?.build) return say('- (j) tsc build: **0 ms** (no build step: package.json has no `build` script)\n  command: `npm run build`');
  line('j', 'tsc build, warm', 'npm run build', twice('j', () => run('npm', ['run', 'build'])));
}

// (k): the npm package, its size and file count.
function pack() {
  const r = run('npm', ['pack', '--dry-run', '--json']);
  const [p] = parseJson(r.out.slice(r.out.indexOf('[')), [{}]);
  say(`- (k) npm pack: **${(p.size / 1048576).toFixed(2)} MB** packed, ${(p.unpackedSize / 1048576).toFixed(2)} MB unpacked, ` +
    `**${p.entryCount} files** (load ${load()})\n  command: \`npm pack --dry-run --json\``);
}

// (l): doctor --fresh on (e)'s install: every selftest run again.
function fresh() {
  const { dir, env } = ensureInstall();
  line('l', 'doctor --fresh on (e): every selftest', 'claude-packs doctor --fresh --dir <(e)>', twice('l', () => run('node', [cli, 'doctor', '--fresh', '--dir', dir], { env })));
}

const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: kit, encoding: 'utf8' }).stdout.trim();
say(`\n## measured ${new Date().toISOString()} at ${head}, node ${process.version}\n`);
if (want('b')) gate('b1', source('packs/base/hooks/no-find'));
if (want('b')) gate('b2', source('packs/base/hooks/git-guard'));
if (want('c')) gate('c', source('lib/layout'));
if (want('e')) initDoctor();
if (want('f')) update();
if (want('h')) runner();
if (want('i')) statusLine();
if (want('j')) build();
if (want('k')) pack();
if (want('l')) fresh();
