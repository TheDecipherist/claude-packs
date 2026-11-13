// resident/selftest-events: the cases of the daemon's selftest that one running daemon answers: a hook that throws, a worker held
// while another event is answered, judges at once, refusals in table order, recorders in turn, a hook that exits or rejects, an event
// that runs past the client's deadline, another project's event, and the repetition index asked from a worker.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { put, readText } from '../lib/files.mjs';
import { parseJson } from '../lib/json.mjs';
import { asRecord } from '../lib/merge-out.mjs';
import { PLANTS, asks, INTRUDER } from './selftest-plants.mjs';
import { alive, ask, dropRig, eventText, filesOf, makeRig, start, stopAll, waitFor } from './selftest-rig.mjs';
import { readState } from './state.mjs';
const lines = (file) => (readText(file) ?? '').split('\n').filter(Boolean).map((l) => asRecord(parseJson(l)) ?? {});
const nap = (ms) => new Promise((done) => setTimeout(done, ms));
const STATEMENTS = [
    'const total = items.reduce((sum, item) => sum + item.price * item.count, 0);',
    'const label = names.map((name) => name.trim().toLowerCase()).join(", ");',
    'const ready = rows.filter((row) => row.state === "ready" && row.count > 0).length;',
].join('\n');
export async function eventCases(cases) {
    const near = new URL('../lib/near-copies.mjs', import.meta.url).href;
    const rig = makeRig([...PLANTS, asks(near)]);
    const logs = (name) => lines(join(rig.dir, '.claude', 'logs', name));
    const up = await start(rig, ['--pool', '4', '--warm', '4', '--state-ms', '20']);
    cases.push(['the daemon starts and says ready', up.kind, 'ready']);
    try {
        const thrown = await ask(rig, eventText(rig, 'Throw'));
        cases.push(['a hook that throws refuses the call once and says so', thrown.code === 2 && thrown.stderr.includes('throws crashed'), true]);
        cases.push(['the crash is in its own log', logs('crashes.jsonl').some((r) => r.hook === 'throws'), true]);
        const again = await ask(rig, eventText(rig, 'Throw'));
        cases.push(['the same call again goes through, and says so: the daemon is alive', again.code === 0 && again.stdout.includes('throws crashed'), true]);
        const held = ask(rig, eventText(rig, 'Hold', { ms: 2000 }));
        await nap(100);
        const t0 = Date.now();
        const quick = await ask(rig, eventText(rig, 'Fast'));
        const quickMs = Date.now() - t0;
        cases.push(['a worker held 2 s: another event answers in under 50 ms', quick.code === 0 && quickMs < 50, true]);
        cases.push(['and the held event is answered when it is done', (await held).code, 0]);
        const t1 = Date.now();
        const par = await ask(rig, eventText(rig, 'Par'));
        cases.push(['two hooks sleeping 100 ms each in one event: under 150 ms (at once)', par.code === 0 && Date.now() - t1 < 150, true]);
        const ordered = [];
        for (let i = 0; i < 20; i += 1)
            ordered.push((await ask(rig, eventText(rig, 'Ref'))).stderr);
        cases.push(['two refusing hooks at 5 and 20 ms: both returned, in table order, every run', ordered.every((s) => s === 'REFUSED by ref-slow\nREFUSED by ref-fast\n'), true]);
        cases.push(['the recorder of a PreToolUse call ran for each refused call', (readText(join(rig.dir, 'rec.txt')) ?? '').split('\n').filter(Boolean).length, 20]);
        for (let i = 0; i < 3; i += 1)
            await ask(rig, eventText(rig, 'Ser'));
        cases.push(['two serial hooks (30 ms, then 0) keep their order', readText(join(rig.dir, 'ser.txt')), 'ababab']);
        const post = await ask(rig, eventText(rig, 'PostRef', {}, 'PostToolUse'));
        cases.push(['a refused PostToolUse call: its recorder does not run', post.code === 2 && !existsSync(join(rig.dir, 'post.txt')), true]);
        const t3 = Date.now();
        const slowPost = await ask(rig, eventText(rig, 'PostSlow', {}, 'PostToolUse'));
        cases.push(['a PostToolUse call whose recorder takes 300 ms: answered without waiting for it', slowPost.code === 0 && Date.now() - t3 < 150 && !existsSync(join(rig.dir, 'postslow.txt')), true]);
        await waitFor(() => existsSync(join(rig.dir, 'postslow.txt')), 3000);
        cases.push(['and the recorder still ran, after the reply', existsSync(join(rig.dir, 'postslow.txt')), true]);
        const exited = await ask(rig, eventText(rig, 'Exit'));
        cases.push(['a hook calling process.exit(0): the event is answered, as a crash of that hook', exited.code === 2 && exited.stderr.includes('exits crashed'), true]);
        await nap(80);
        await ask(rig, eventText(rig, 'Fast')); // the pid file is rewritten after an event, at most every 20 ms in this run
        await nap(80);
        cases.push(['and the pool size is kept (its worker replaced)', readState(filesOf(rig).pid)?.workers ?? null, 4]);
        const rejected = await ask(rig, eventText(rig, 'Reject'));
        await waitFor(() => (readText(filesOf(rig).log) ?? '').includes('rejected after return'));
        cases.push(['a hook rejecting a promise after returning: the call passes, the rejection is in the daemon log', rejected.code === 0 && (readText(filesOf(rig).log) ?? '').includes('unhandled rejection'), true]);
        cases.push(['and the daemon is alive and serving', (await ask(rig, eventText(rig, 'Fast'))).code, 0]);
        const t2 = Date.now();
        const over = await ask(rig, eventText(rig, 'Over'), { deadline: Date.now() + 300 });
        cases.push(['an event past the client\'s deadline is handed whole to the TypeScript path, never answered by the judges that were in time (KWB-216)', Date.now() - t2 < 900 && over.fallback === 'ts' && over.code === 0 && over.stdout === '', true]);
        cases.push(['a slow secrets-guard beside a judge that was in time: the quick judge\'s pass is not the verdict, and no "over time" note leaves the daemon', over.fallback === 'ts' && !over.stdout.includes('not judged'), true]);
        cases.push(['and the crash log records it', logs('crashes.jsonl').some((r) => r.hook === 'secrets-guard' && String(r.reason).includes('over time')), true]);
        await waitFor(() => logs('refusals.jsonl').some((r) => r.hook === 'secrets-guard'), 4000);
        cases.push(['the hook that finishes after the reply is logged `late`, its exit 2 kept as a refusal', logs('refusals.jsonl').some((r) => r.hook === 'secrets-guard' && r.late === true), true]);
        const other = makeRig([{ name: 'intruder', source: INTRUDER, row: { events: ['PreToolUse'], matcher: 'Fast', role: 'judge' } }], {}, 'resident-other-');
        const foreign = await ask(rig, eventText(rig, 'Fast'), { env: { CLAUDE_PROJECT_DIR: other.dir } });
        cases.push(['a request naming another project\'s folder is not judged by it: the TypeScript path\'s', foreign.fallback === 'ts' && foreign.code === 0, true]);
        cases.push(['and that folder\'s hooks were never loaded', existsSync(join(other.hooks, 'intruder-ran')), false]);
        dropRig(other);
        put(join(rig.dir, 'src/one.ts'), `${STATEMENTS}\n`);
        const first = await ask(rig, eventText(rig, 'Ask', { content: STATEMENTS }));
        put(join(rig.dir, 'src/two.ts'), `${STATEMENTS}\n`);
        await ask(rig, eventText(rig, 'Write', { file_path: join(rig.dir, 'src/two.ts') }, 'PostToolUse'));
        const second = await ask(rig, eventText(rig, 'Ask', { content: STATEMENTS }));
        cases.push(['a worker asks the main thread\'s index for the files holding its statements', first.stderr.trim(), 'FILES src/one.ts']);
        cases.push(['a write, then a second text served by another worker: the index holds the first', second.stderr.trim(), 'FILES src/one.ts,src/two.ts']);
        const state = readState(filesOf(rig).pid);
        cases.push(['the pid file says which daemon, how many events and how many workers', up.kind === 'ready' && state?.pid === up.pid && (state?.events ?? 0) > 30 && state?.workers === 4, true]);
        cases.push(['the daemon\'s log says how it started', /started pid \d+, 4 workers \(at most 4\)/.test(readFileSync(filesOf(rig).log, 'utf8')), true]);
    }
    finally {
        await stopAll(rig);
    }
    cases.push(['stopped: no daemon of the rig is left running', up.kind === 'ready' && !alive(up.pid), true]);
}
