// resident/selftest-lifecycle: the cases of the daemon's selftest about daemons: eight clients racing to start one, a kit update
// between two events (a new lock, a new daemon), a daemon killed mid-event, a folder at mode 755, a thousand events across a log's
// rotation, and the table check that a judge writes nothing.
import { chmodSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { put, readText } from '../lib/files.mts';
import { DAEMON_START, readHookLog } from '../lib/hook-log.mts';
import { toJson } from '../lib/json.mts';
import { judgesThatWrite } from './judge-check.mts';
import { PLANTS, MSG, WRITER } from './selftest-plants.mts';
import { EXT, client, dropRig, eventText, filesOf, makeRig, start, stopAll, waitFor } from './selftest-rig.mts';
import type { VerdictRow } from '../lib/types.d.mts';

const nap = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

async function raceCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig(PLANTS, {}, 'resident-race-');
  try {
    // no daemon: eight clients at once, each starts one behind its event; the first event of a session is judged all the same
    const all = await Promise.all(Array.from({ length: 8 }, () => client(rig, eventText(rig, 'Race'))));
    const pids = readdirSync(rig.cache).filter((f) => f.endsWith('.pid'));
    cases.push(['eight clients racing to start: all eight events judged (refused by the judge)', all.filter((j) => j.reply.code === 2 && j.reply.stderr === 'rm refused\n').length, 8]);
    cases.push(['and exactly one daemon came of it: one ready, one pid file, the other seven said busy', [all.filter((j) => j.started?.kind === 'ready').length, pids.length, all.filter((j) => j.started?.kind === 'busy').length].join(), '1,1,7']);
    cases.push(['the next event is served by that daemon', (await client(rig, eventText(rig, 'Race'))).path, 'daemon']);
  } finally { await stopAll(rig); }
}

async function lockCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig(PLANTS, {}, 'resident-lock-');
  try {
    const before = await client(rig, eventText(rig, 'Msg'));
    const first = before.started?.kind === 'ready' ? before.started.pid : 0;
    const held = client(rig, eventText(rig, 'Hold', { ms: 700 }));
    await nap(100);
    // a kit update mid-event: the hook says something new, and the lock names the new files
    put(join(rig.hooks, `msg${EXT}`), MSG('v2'));
    put(join(rig.dir, '.claude', 'claude-packs.lock.json'), toJson({ kit: 'selftest', packs: [], files: { 'msg': 'v2' } }));
    const after = await client(rig, eventText(rig, 'Msg'));
    const second = after.started?.kind === 'ready' ? after.started.pid : 0;
    cases.push(['a lock change mid-event: the event before it was judged by the old daemon', before.reply.stdout.includes('MSG v1'), true]);
    cases.push(['the next event is on a new daemon, and the planted message change is seen', after.reply.stdout.includes('MSG v2') && first !== 0 && second !== 0 && first !== second, true]);
    cases.push(['the event in flight finished on the old one', (await held).reply.code, 0]);
  } finally { await stopAll(rig); }
}

async function killCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig(PLANTS, {}, 'resident-kill-');
  try {
    const up = await start(rig);
    const pending = client(rig, eventText(rig, 'Kill'));
    await nap(150);
    if (up.kind === 'ready') process.kill(up.pid, 'SIGKILL');
    const judged = await pending;
    cases.push(['a daemon killed mid-event: the client judges the event by the TypeScript runner', judged.path === 'ts' && judged.reply.code === 2 && judged.reply.stderr.includes('judged by the TypeScript runner'), true]);
  } finally { await stopAll(rig); }
}

async function folderCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig(PLANTS, {}, 'resident-mode-');
  chmodSync(rig.cache, 0o755);
  try {
    const up = await start(rig);
    const judged = await client(rig, eventText(rig, 'Race'));
    cases.push(['a socket folder at mode 755: the daemon refuses to start', up.kind, 'failed']);
    cases.push(['and the client takes the TypeScript path, judged', judged.path === 'ts' && judged.reply.code === 2, true]);
  } finally { await stopAll(rig); }
}

async function rotationCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig(PLANTS, { guards: { logs: { maxKb: 8 } } }, 'resident-rotate-');
  try {
    await start(rig);
    const done: number[] = [];
    for (let batch = 0; batch < 100; batch += 1) done.push(...(await Promise.all(Array.from({ length: 10 }, () => client(rig, eventText(rig, 'Fast')).then((j) => j.reply.code)))));
    await waitFor(() => readText(filesOf(rig).pid) !== null);
    const rows = readHookLog(rig.dir, { rotated: true }).filter((r) => r.hook !== DAEMON_START);   // the start line is not a call
    cases.push(['1,000 events across a forced rotation: the hook lines equal the hooks run (two a call)', [done.length, rows.filter((r) => r.hook !== 'event').length, rows.filter((r) => r.hook === 'event').length].join(), '1000,2000,1000']);
    cases.push(['and the log really rotated', readdirSync(join(rig.dir, '.claude', 'logs')).filter((f) => f.startsWith('hooks-')).length > 0, true]);
    cases.push(['every event line says the daemon served it', rows.filter((r) => r.hook === 'event').every((r) => r.source === 'daemon'), true]);
  } finally { await stopAll(rig); }
}

async function writerCase(cases: VerdictRow[]): Promise<void> {
  const rig = makeRig([WRITER, ...PLANTS.filter((p) => p.name === 'quick')], {}, 'resident-judge-');
  const event = { hook_event_name: 'PreToolUse', tool_name: 'Writes', tool_input: {} };
  const found = await judgesThatWrite(rig.table, rig.hooks, EXT, rig.dir, [event]);
  cases.push(['a planted judge that writes a file: the table check names it, and only it', found.join(), 'writer']);
  const clean = makeRig(PLANTS.filter((p) => p.name === 'quick'), {}, 'resident-judge-');
  cases.push(['a table of judges that write nothing is clean', (await judgesThatWrite(clean.table, clean.hooks, EXT, clean.dir, [event])).length, 0]);
  dropRig(rig);
  dropRig(clean);
}

export async function lifecycleCases(cases: VerdictRow[]): Promise<void> {
  await raceCase(cases);
  await lockCase(cases);
  await killCase(cases);
  await folderCase(cases);
  await writerCase(cases);
  await rotationCase(cases);
}
