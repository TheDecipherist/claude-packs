// W10b item 2: the daemon-level leak checks, each with a planted leak seen red. The resident runner runs in this process (its `serve`), from a
// copy of the hooks folder whose served-event function carries one line of leak: an array that grows per event, a file opened and never
// closed, an interval that is never cleared. Each check measures after 20 events and after 320 more (heap after a forced collection, open
// file descriptors), and after the daemon has stopped (timers still running, daemon files left). The unplanted copy meets every line and each
// plant breaks its own line, and only that one. The soak (scripts/soak.mts) holds the same lines over 60 minutes against the real daemon.
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { askDaemon } from '../../packs/base/hooks/lib/proxy-client.mts';
import { PACKS_DIR } from '../../lib/packs.mts';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { PLANTS } from '../../packs/base/hooks/resident/selftest-plants.mts';
import { dropRig, eventText, filesOf, makeRig, request, waitFor, type Rig } from '../../packs/base/hooks/resident/selftest-rig.mts';
import { assert, test } from '../kit-cli.mts';

// the event a daemon serves here is the 'quick' plant's judge, whose tool is 'Fast'
const QUICK = PLANTS.filter((p) => p.name === 'quick');
const WARM = 20;
const MORE = 300;
const HEAP_LINE_MB = 5;     // growth over MORE events a clean daemon stays under (a plant of 64 KB an event adds about 19 MB)
const FD_LINE = 3;          // the most descriptors a clean daemon gains over MORE events (a plant adds one an event)
const PLANT_ARRAY = '(globalThis.__leakKept ??= []).push(new Array(8192).fill(1.5));';
const PLANT_FILE = '__leakOpen(process.execPath, "r");';
const PLANT_TIMER = 'if (globalThis.__leakTick === undefined) globalThis.__leakTick = setInterval(() => undefined, 1000);';

setFlagsFromString('--expose-gc');
const collect = runInNewContext('gc') as () => void;

interface Seen { heapGrowthMb: number; fdGrowth: number; timersLeft: number; filesLeft: string[] }

const heapMb = (): number => { collect(); return process.memoryUsage().heapUsed / 1048576; };
const fdCount = (): number => readdirSync('/dev/fd').length;
const timers = (): number => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;

/** The hooks folder copied with one line of leak at the top of serveEvent, none for `plant` null; the copy's resident.mjs. */
function leakyDaemon(plant: string | null): string {
  const copy = scratchDir('leaky-');
  cpSync(join(PACKS_DIR, 'base'), copy, { recursive: true, filter: (from) => !from.includes('/node_modules') });
  const file = join(copy, 'hooks/resident/event.mjs');
  const source = readFileSync(file, 'utf8');
  const head = /export async function serveEvent\([^)]*\) \{/.exec(source);
  assert.ok(head, 'serveEvent is where the plant goes');
  const planted = plant === null ? source : `import { openSync as __leakOpen } from 'node:fs';\n${source.replace(head[0], `${head[0]}\n  ${plant}`)}`;
  writeFileSync(file, planted);
  return join(copy, 'hooks/resident.mjs');
}

const plantOf = (script: string): string => readFileSync(join(script, '..', 'resident/event.mjs'), 'utf8').includes('__leak') ? 'planted' : 'clean';

/** Runs the daemon of `script` in this process, serves WARM then MORE events, stops it, and says what it held and what it left. */
async function live(script: string): Promise<Seen> {
  const rig: Rig = makeRig(QUICK, {}, 'leak-');
  const resident = await import(script) as typeof import('../../packs/base/hooks/resident.mts');
  const host = { env: { HOME: rig.dir, PATH: process.env['PATH'], CLAUDE_PACKS_CACHE: rig.cache }, uid: process.getuid?.() ?? 0, home: homedir(), platform: process.platform, node: process.execPath, script };
  const options = resident.serveOptions(['--serve', rig.dir, '--hooks', rig.hooks, '--pool', '2', '--no-npm'], host);
  assert.ok(options);
  const before = timers();
  const ended = resident.serve(options, host);
  const socket = filesOf(rig).socket;
  assert.ok(await waitFor(() => existsSync(socket), 15_000), 'the daemon listens');
  // one after the other on purpose: the heap and descriptor counts are of served events, not of a burst
  const fire = async (n: number): Promise<void> => { for (let i = 0; i < n; i += 1) await askDaemon(socket, request(rig), eventText(rig, 'Fast')); };
  await fire(WARM);
  const [heap0, fd0] = [heapMb(), fdCount()];
  await fire(MORE);
  const [heap1, fd1] = [heapMb(), fdCount()];
  process.emit('SIGTERM');
  await ended;
  await waitFor(() => timers() <= before, 1000);
  const seen = { heapGrowthMb: heap1 - heap0, fdGrowth: fd1 - fd0, timersLeft: timers() - before, filesLeft: existsSync(rig.cache) ? readdirSync(rig.cache).filter((f) => /\.(sock|pid|lock)$/.test(f)) : [] };
  // the planted interval is the test's to end: it would keep this process from exiting
  clearInterval((globalThis as { __leakTick?: NodeJS.Timeout }).__leakTick);
  dropRig(rig);
  process.stdout.write(`leak check ${plantOf(script)}: heap +${seen.heapGrowthMb.toFixed(1)} MB, descriptors +${seen.fdGrowth}, timers left ${seen.timersLeft}, files left ${seen.filesLeft.length}\n`);
  return seen;
}

const clean = await live(leakyDaemon(null));

test('a daemon with no leak meets every line: heap, descriptors, timers and files after its stop', () => {
  assert.ok(clean.heapGrowthMb < HEAP_LINE_MB, `heap grew ${clean.heapGrowthMb.toFixed(1)} MB over ${MORE} events`);
  assert.ok(clean.fdGrowth <= FD_LINE, `descriptors grew by ${clean.fdGrowth}`);
  assert.equal(clean.timersLeft, 0, 'no timer left running after the stop');
  assert.deepEqual(clean.filesLeft, [], 'no socket, pid or lock file after the stop');
});

test('a planted array that grows per event is red on the heap line only', async () => {
  const seen = await live(leakyDaemon(PLANT_ARRAY));
  assert.ok(seen.heapGrowthMb > HEAP_LINE_MB, `the plant grew the heap ${seen.heapGrowthMb.toFixed(1)} MB`);
  assert.ok(seen.fdGrowth <= FD_LINE);
  assert.equal(seen.timersLeft, 0);
});

test('a planted unclosed file is red on the descriptor line only', async () => {
  const seen = await live(leakyDaemon(PLANT_FILE));
  assert.ok(seen.fdGrowth > FD_LINE, `the plant opened ${seen.fdGrowth} descriptors`);
  assert.ok(seen.heapGrowthMb < HEAP_LINE_MB);
  assert.equal(seen.timersLeft, 0);
});

test('a planted interval left running is red on the timer line only', async () => {
  const seen = await live(leakyDaemon(PLANT_TIMER));
  assert.ok(seen.timersLeft > 0, 'the interval is still running after the stop');
  assert.ok(seen.fdGrowth <= FD_LINE);
  assert.ok(seen.heapGrowthMb < HEAP_LINE_MB);
});
