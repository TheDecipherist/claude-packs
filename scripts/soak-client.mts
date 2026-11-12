// One of the soak's clients (typescript order W10b item 1), forked by scripts/soak.mts: it replays the fixture's events from its own offset
// through the project's own settings command (the picker, the Go client, the daemon), at a steady rate, and every COMPARE_EVERY-th event
// runs the same payload a second time with the daemon switched off (the TypeScript runner) and compares the verdicts: exit code, stdout and
// stderr. Every REFUSE_EVERY-th compared event is one a law refuses, so the comparison covers refusals too. A difference is written to the
// differences file with both answers. Counters go to the parent every few seconds; a `stop` message ends it after its last event.
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { fixtureEvents, payloadOf, settingsCommandOf } from './replay-lib.mts';

const COMPARE_EVERY = 20;
const REFUSE_EVERY = 5;
const REPORT_MS = 5000;
const EVENT_TIMEOUT_MS = 60_000;
const NOT_JUDGED = /^\{"systemMessage":"not judged by [^"]*\(over time\)"\}$/;

interface Setup { dir: string; cache: string; index: number; clients: number; ratePerSec: number; differences: string }
export interface Counters { done: number; compared: number; refusalsCompared: number; refusalsSeen: number; overTime: number; differences: number; failed: number; wallMs: number }
interface Answer { code: number | null; out: string; err: string; ms: number }

const setup = JSON.parse(process.argv[2] ?? '{}') as Setup;   // the parent's own JSON
const events = fixtureEvents();
const commandFor = settingsCommandOf(setup.dir);
const env: NodeJS.ProcessEnv = { PATH: process.env['PATH'], HOME: setup.cache, CLAUDE_PROJECT_DIR: setup.dir, CLAUDE_PACKS_CACHE: setup.cache, TMPDIR: process.env['TMPDIR'] };

/** The event a law refuses: a `git add -A` shown to the Bash hooks. */
const refusing = (): { event: string; tool: string; input: string } => ({
  event: 'PreToolUse', tool: 'Bash',
  input: toJson({ session_id: 'replay', cwd: setup.dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git add -A' } }),
});

function run(command: string, environment: NodeJS.ProcessEnv, input: string): Promise<Answer> {
  return new Promise((done) => {
    const t = performance.now();
    const child = spawn('sh', ['-c', command], { cwd: setup.dir, env: environment, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString('utf8'); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString('utf8'); });
    const guard = setTimeout(() => child.kill('SIGKILL'), EVENT_TIMEOUT_MS);
    child.on('close', (code) => { clearTimeout(guard); done({ code, out, err, ms: performance.now() - t }); });
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}

const counters: Counters = { done: 0, compared: 0, refusalsCompared: 0, refusalsSeen: 0, overTime: 0, differences: 0, failed: 0, wallMs: 0 };
let stopping = false;
process.on('message', (m) => { if (m === 'stop') stopping = true; });
const report = (): void => { process.send?.({ index: setup.index, ...counters }); };
const reporter = setInterval(report, REPORT_MS);

async function compare(event: string, tool: string, command: string, input: string, k: number, planted: boolean): Promise<void> {
  const [viaDaemon, viaTs] = [await run(command, env, input), await run(command, { ...env, CLAUDE_PACKS_DAEMON: 'off' }, input)];
  counters.compared += 1;
  if (planted) counters.refusalsCompared += 1;
  if (viaTs.code === 2) counters.refusalsSeen += 1;
  // a judge the daemon cut at its time limit says so on stdout; that line is counted, and the verdict (exit code and refusal text) is compared
  const overTime = NOT_JUDGED.test(viaDaemon.out.trim());
  if (overTime) counters.overTime += 1;
  if (viaDaemon.code !== viaTs.code || (!overTime && viaDaemon.out !== viaTs.out) || viaDaemon.err !== viaTs.err) {
    counters.differences += 1;
    appendFileSync(setup.differences, `${toJson({ client: setup.index, k, event, tool, planted, daemon: viaDaemon, ts: viaTs })}\n`);
  }
}

const gap = 1000 / setup.ratePerSec;
let due = performance.now();
for (let k = 0; !stopping; k += 1) {
  const e = events[(setup.index * Math.floor(events.length / setup.clients) + k) % events.length];
  const command = e === undefined ? null : commandFor(e.event, e.tool);
  if (e !== undefined && command !== null) {
    const input = payloadOf(setup.dir, e, k * setup.clients + setup.index);
    if (k % COMPARE_EVERY === 0) {
      const planted = (k / COMPARE_EVERY) % REFUSE_EVERY === 0;
      const r = refusing();
      const cmd = planted ? commandFor(r.event, r.tool) ?? command : command;
      await compare(planted ? r.event : e.event, planted ? r.tool : e.tool, cmd, planted ? r.input : input, k, planted);
    } else {
      const a = await run(command, env, input);
      counters.wallMs += a.ms;
      if (a.code !== 0 && a.code !== 2) counters.failed += 1;
    }
    counters.done += 1;
  }
  due += gap;
  const wait = due - performance.now();
  if (wait > 0) await sleep(wait); else due = performance.now();
}
clearInterval(reporter);
report();
process.exit(0);
