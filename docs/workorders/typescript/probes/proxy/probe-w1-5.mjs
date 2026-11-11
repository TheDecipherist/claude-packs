// W1.5: the nine daemon probes, each with its number, on resident-probe.mjs and client-probe (build it first:
// `go build -o <bin> client-probe/main.go`). A scratch base install is the project; each probe gets its own socket folder.
//   node probe-w1-5.mjs <client-bin> <out.md> [repo-index.json]
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJson } from '../../../../../packs/base/hooks/lib/json.mjs';

const [bin, out, indexFile] = process.argv.slice(2);
const KIT = fileURLToPath(new URL('../../../../../', import.meta.url));
const DAEMON = fileURLToPath(new URL('./resident-probe.mjs', import.meta.url));
const BASH = 'git-guard,kit-fresh,suite-once,no-find,repo-litter,look-gate';
const say = (line) => { appendFileSync(out, `${line}\n`); console.log(line); };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

const project = mkdtempSync(join(tmpdir(), 'w15-project-'));
spawnSync('git', ['init', '-q'], { cwd: project });
spawnSync('node', [join(KIT, 'bin/claude-packs.mjs'), 'init', '--config', 'base', '--dir', project], { encoding: 'utf8' });

const bashCall = (command) => toJson({ session_id: 'w15', transcript_path: '', cwd: project, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
const FORCE = bashCall('git push --force origin main');
function folder(name, long = false) {
  const dir = long ? join(tmpdir(), `w15-${name}-${'x'.repeat(60)}`, 'claude-packs') : join(tmpdir(), `w15-${name}`);
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o700);
  return dir;
}
// One client run: its exit code, stdout, stderr and wall.
function client(cache, input, { table = BASH, pool = '4', env = {} } = {}) {
  return new Promise((done) => {
    const t = performance.now();
    const c = spawn(bin, [], { cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project, CLAUDE_PACKS_CACHE: cache, PROBE_DAEMON: DAEMON,
      PROBE_TABLE: table, PROBE_POOL: pool, PROBE_TRACE: join(cache, 'trace.log'), PROBE_DEADLINE_MS: '4000', ...env } });
    let so = ''; let se = '';
    c.stdout.on('data', (d) => { so += d; }); c.stderr.on('data', (d) => { se += d; });
    c.on('close', (code) => done({ code, stdout: so, stderr: se, ms: Math.round(performance.now() - t) }));
    c.stdin.end(input);
  });
}
const pids = (pattern) => spawnSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
const daemons = (cache) => pids(`resident-probe.mjs --sock ${cache}`);
const traceLines = (cache) => (existsSync(join(cache, 'trace.log')) ? readFileSync(join(cache, 'trace.log'), 'utf8').trim().split('\n') : []);
const lastPath = (cache) => traceLines(cache).at(-1)?.split(' ').slice(1).join(' ') ?? '';
const stop = (cache) => { for (const pid of daemons(cache)) process.kill(Number(pid), 'SIGTERM'); };
async function warm(cache, opts) {
  for (let i = 0; i < 50 && !lastPath(cache).startsWith('socket'); i += 1) { await client(cache, bashCall('ls'), opts); await sleep(100); }
}

say(`\n## W1.5 probes, ${new Date().toISOString()}, load ${spawnSync('uptime', { encoding: 'utf8' }).stdout.trim().split('averages: ')[1]}\n`);

{ // 1. eight clients race against no daemon
  const cache = folder('race');
  const runs = await Promise.all(Array.from({ length: 8 }, () => client(cache, FORCE)));
  await sleep(1500);
  say(`- 1 race: 8 clients, no daemon: exit codes ${runs.map((r) => r.code).join(',')} (2 = judged), daemons running ${daemons(cache).length}, ` +
    `walls ${runs.map((r) => r.ms).join(',')} ms`);
  const after = await client(cache, FORCE);
  say(`  the next event: exit ${after.code} in ${after.ms} ms by ${lastPath(cache).split(' ')[0]}`);
  stop(cache);
}
for (const pool of ['4', '1']) { // 2. a hook holding a worker 1.7 s while six other events ask
  const cache = folder(`hol-${pool}`);
  const opts = { table: `sleep-1700,${BASH}`, pool };
  await warm(cache, opts);
  const slow = client(cache, bashCall('echo SLOW'), opts);
  await sleep(50);
  const others = await Promise.all(Array.from({ length: 6 }, () => client(cache, bashCall('ls'), opts)));
  const s = await slow;
  say(`- 2 head of line, pool ${pool}: the slow event ${s.ms} ms; six others ${others.map((r) => r.ms).join(',')} ms (exit ${[...new Set(others.map((r) => r.code))]})`);
  stop(cache);
}
{ // 3. JSON on stdout forwarded whole
  const cache = folder('stdout');
  const opts = { table: 'print-json' };
  await warm(cache, opts);
  const r = await client(cache, bashCall('ls'), opts);
  const want = '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"probe context é ✓"}}\n';
  say(`- 3 stdout: ${Buffer.byteLength(r.stdout)} bytes, byte for byte ${r.stdout === want ? 'EQUAL' : 'DIFFERENT'} to what the hook printed`);
  stop(cache);
}
{ // 4. the lock changes during an event
  const cache = folder('lock');
  const opts = { table: `sleep-1700,${BASH}` };
  await warm(cache, opts);
  const lock = join(project, '.claude/claude-packs.lock.json');
  const before = readFileSync(lock, 'utf8');
  const inFlight = client(cache, bashCall('echo SLOW'), opts);
  await sleep(200);
  writeFileSync(lock, before.replace(/\n$/, ' \n'));
  const next = await client(cache, FORCE, opts);
  const nextPath = lastPath(cache).split(':')[0];
  const first = await inFlight;
  await sleep(1500);
  const third = await client(cache, FORCE, opts);
  writeFileSync(lock, before);
  say(`- 4 lock change: the event in flight exit ${first.code} on the old daemon; the next event exit ${next.code} by ${nextPath} (a new socket name); ` +
    `the one after exit ${third.code} by ${lastPath(cache).split(' ')[0]}; daemons running ${daemons(cache).length} (the old one idles until W8.2's idle exit)`);
  stop(cache);
}
{ // 5. the daemon killed during an event: a daemon whose one hook holds the event 1.7 s (so no refusal ends it early), killed
  //    at 300 ms; the client's TypeScript path runs git-guard on the same stdin
  const cache = folder('kill');
  await warm(cache, { table: 'sleep-1700' });
  const inFlight = client(cache, bashCall('git push --force origin main # SLOW'), { table: 'sleep-1700,git-guard' });
  await sleep(300);
  for (const pid of daemons(cache)) process.kill(Number(pid), 'SIGKILL');
  const r = await inFlight;
  say(`- 5 kill mid-event: exit ${r.code} in ${r.ms} ms (${r.code === 2 ? 'judged by the TypeScript path' : 'NOT JUDGED'}); trace "${lastPath(cache).slice(0, 90)}"`);
  await sleep(1500);
  stop(cache);
}
{ // 6. a stale socket file
  const cache = folder('stale');
  await warm(cache);
  for (const pid of daemons(cache)) process.kill(Number(pid), 'SIGKILL');
  const r = await client(cache, FORCE);
  const how = lastPath(cache).slice(0, 70);
  await sleep(1500);
  const next = await client(cache, FORCE);
  say(`- 6 stale socket: exit ${r.code} in ${r.ms} ms ("${how}"), then exit ${next.code} in ${next.ms} ms by ${lastPath(cache).split(' ')[0]} of a new daemon`);
  stop(cache);
}
{ // 7. a socket path over 100 bytes
  const cache = folder('long', true);
  await warm(cache);
  const sock = lastPath(cache).split(' ')[1] ?? '';
  const r = await client(cache, FORCE);
  say(`- 7 long path: in the cache folder the socket would be ${join(cache, '0123456789abcdef.sock').length} bytes; the client used ${sock} ` +
    `(${sock.length} bytes); exit ${r.code} in ${r.ms} ms by its socket`);
  for (const pid of pids(`resident-probe.mjs --sock ${sock}`)) process.kill(Number(pid), 'SIGTERM');
}
{ // 8. a repetition-index query from a worker to the main thread, on a daemon holding the index
  const cache = folder('index');
  const opts = { table: 'index-query' };
  await warm(cache, opts);
  const sock = lastPath(cache).split(' ')[1];
  stop(cache);
  await sleep(300);
  const args = [DAEMON, '--sock', sock, '--hooks', join(project, '.claude/hooks'), '--table', 'index-query', '--pool', '2', ...(indexFile ? ['--index', indexFile] : [])];
  const d = spawn('node', args, { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok) => d.stdout.once('data', ok));
  const content = Array.from({ length: 200 }, (_, i) => `const v${i} = read(${i});`).join('\n');
  const write = toJson({ session_id: 'w15', cwd: project, hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(project, 'a.mjs'), content } });
  const runs = [];
  for (let i = 0; i < 5; i += 1) runs.push((await client(cache, write, opts)).stderr.trim());
  say(`- 8 index query: ${indexFile ? 'bandwarp\'s index (196 files, 4,224 statements)' : 'no index'}; ${runs.at(-1)}; ` +
    `all five: ${runs.map((r) => r.match(/([\d.]+) ms/)?.[1]).join(', ')} ms`);
  d.kill('SIGTERM');
}
{ // 9. a daemon started by an unattended client, then an interactive client's event
  const cache = folder('env');
  const opts = { table: 'env-echo' };
  const first = await client(cache, bashCall('ls'), { ...opts, env: { CLAUDE_PACKS_UNATTENDED: '1' } });
  await sleep(1500);
  const unattended = await client(cache, bashCall('ls'), { ...opts, env: { CLAUDE_PACKS_UNATTENDED: '1' } });
  const interactive = await client(cache, bashCall('ls'), { ...opts, env: { CLAUDE_PACKS_UNATTENDED: '' } });
  say(`- 9 env per event: the starting client (unattended) exit ${first.code} by the TypeScript path; by the daemon it started: unattended ` +
    `exit ${unattended.code} ("${unattended.stderr.trim()}"), interactive exit ${interactive.code} ("${interactive.stderr.trim()}"); daemons ${daemons(cache).length}`);
  stop(cache);
}
process.exit(0);
