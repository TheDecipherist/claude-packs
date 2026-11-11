var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// run-hooks: one node process runs every kit hook of one settings entry, instead of one node process per hook (KWB-24:
// The user saw 17 hooks take 48 s on one rm; each was its own node start, all at once, on a loaded machine). settings.json
// names the runner and its hooks in one command: node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs
// Each hook module exports hook(text) (the event's JSON text, as stdin was). It returns a Verdict ({ code, stdout, stderr },
// types.d.mts: the interface every hook reaches in W4) or, until W4 has moved them all, an exit code with its output written to
// the process's streams. The runner calls them in turn, keeps each one's stdout and stderr, writes each one's timing line to
// .claude/hooks.log (lib/hook-log.mjs) and its own (hook "run-hooks": the whole process, node's start-up included), and exits 2
// if any hook refused. A hook that throws, or exits with anything but 0 or 2, crashed, and lib/crash-policy.mjs decides what the
// call does (KF-18: a crash on a tool call refuses once, and says so). lib/unread-writes.mjs says when no hook could read what a
// command writes (KF-40). The merged output is held to 9,000 characters (Claude Code cuts a hook's output at 10,000), with a
// line saying what was cut. Every hook still runs on its own too (node .claude/hooks/a.mjs, its selftest, a hand-made entry).
//   node run-hooks.mjs <hook path or name>...   (stdin: the event)
//   node run-hooks.mjs --selftest
import { readFileSync, rmSync, writeSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crashVerdict } from './lib/crash-policy.mjs';
import { logCall } from './lib/event-log.mjs';
import { childError, ensureDir, put, readText, scratchDir } from './lib/files.mjs';
import { appendRotated, isMain, logHook, projectRoot, readHookLog } from './lib/hook-log.mjs';
import { hookRowsFor, readHookTable } from './lib/hook-table.mjs';
import { parseJson, toJson } from './lib/json.mjs';
import { readLayout } from './lib/layout.mjs';
import { OUT_CAP, asRecord, capOut, mergeOut } from './lib/merge-out.mjs';
import { verdicts } from './lib/selftest.mjs';
import { unreadWrites } from './lib/unread-writes.mjs';
import { isVerdict } from './lib/verdict.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
// the hooks sit beside the runner and have its extension (the emitted .mjs in a project; the .mts source when the source runs)
const EXT = extname(fileURLToPath(import.meta.url));
export const RUNNER = 'run-hooks';
export { OUT_CAP, capOut, mergeOut };
export const nameOf = (arg) => basename(arg).replace(/\.m[jt]s$/, '');
const fileOf = (arg) => (isAbsolute(arg) ? arg : join(HERE, `${nameOf(arg)}${EXT}`));
/** A hook declared with both parameters takes the event and a context and returns a Verdict (types.d.mts `Hook`). */
const takesContext = (fn) => fn.length >= 2;
function hookOf(mod) {
    const fn = asRecord(mod)?.hook;
    return typeof fn === 'function' ? fn : null;
}
// A number-returning hook writes to the process's streams, so they are caught while it runs. W4 removes this, and the call
// that uses it, when the last hook returns a Verdict.
const capture = (stream, sink) => {
    const write = stream.write;
    stream.write = ((chunk, ...rest) => {
        sink.push(String(chunk));
        const cb = rest.find((r) => typeof r === 'function');
        if (typeof cb === 'function')
            cb();
        return true;
    });
    return () => { stream.write = write; };
};
// -> { code, stdout, stderr }. Each hook's own time is logged (its module's first import included), then one `event` line.
export async function runAll(args, text, root, caller, arrival = { at: Date.now(), source: 'runner' }) {
    const queue = Date.now() - arrival.at;
    const ev = asRecord(parseJson(text)) ?? {}; // an unparsable event: the hooks read it themselves
    const outs = [];
    const err = [];
    const judged = [];
    // the context of this event, built once from the caller (never from this process): every two-parameter hook gets it
    const ctx = {
        projectDir: root, cwd: caller.cwd, env: caller.env, sessionPid: caller.sessionPid, now: Date.now(), layout: readLayout(root),
        log: (line) => { caller.stderr.write(`${line}\n`); },
    };
    let code = 0;
    for (const arg of args) {
        const name = nameOf(arg);
        const out = [];
        const before = err.length;
        const t0 = performance.now();
        let c = 0;
        let undo = [];
        try {
            const fn = hookOf(await import(__rewriteRelativeImportExtension(pathToFileURL(fileOf(arg)).href)));
            if (!fn)
                throw new Error(`${name} exports no hook`);
            // the streams are caught only for a one-parameter hook, which writes to them (W4's end removes this)
            if (!takesContext(fn))
                undo = [capture(caller.stdout, out), capture(caller.stderr, err)];
            const result = takesContext(fn) ? await fn(ev, ctx) : await fn(text);
            if (takesContext(fn) && !isVerdict(result))
                throw new Error(`${name} returned no Verdict`);
            if (isVerdict(result)) {
                c = result.code;
                out.push(result.stdout);
                err.push(result.stderr);
            }
            else
                c = Number.isInteger(result) ? result : 0;
        }
        catch (e) {
            c = 1;
            err.push(`run-hooks: ${name} failed: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}\n`);
        }
        finally {
            for (const u of undo)
                u();
        }
        outs.push(out.join(''));
        const ms = performance.now() - t0;
        logHook(root, { event: ev.hook_event_name, hook: name, ms, code: c, tool: ev.tool_name ?? ev.source });
        judged.push({ hook: name, ms, code: c, reason: err.slice(before).join(''), out: out.join('') });
        if (c === 2)
            code = 2;
    }
    const crash = crashVerdict(root, ev, judged, Date.now());
    if (crash.stderr)
        err.push(crash.stderr);
    if (crash.code === 2)
        code = 2;
    outs.push(...[crash.stdout, code === 0 ? unreadWrites(ev, root, caller.env) : ''].filter((s) => Boolean(s)));
    const wall = Date.now() - arrival.at;
    logCall(root, text, judged, appendRotated, wall);
    logHook(root, { event: ev.hook_event_name, hook: 'event', ms: wall, code, tool: ev.tool_name ?? ev.source, queue, source: arrival.source });
    return { code, stdout: mergeOut(outs), stderr: err.join('') };
}
/** One event through the table: the rows its name and matcher reach, in the table's `order`, run from `dir` (the hooks folder). */
export function runEvent(table, dir, text, root, caller, arrival) {
    const ev = asRecord(parseJson(text)) ?? {};
    return runAll(hookRowsFor(table, ev).map((r) => join(dir, `${r.hook}${EXT}`)), text, root, caller, arrival);
}
// W8.1: the runner decides from the table which hooks an event reaches, reads the layout again for every event, and times an event
// from its arrival.
async function tableCases(dir, caller, cases) {
    const says = (name, code = 0) => put(join(dir, `${name}${EXT}`), `export function hook(event, ctx) {\n  return { code: ${code}, stdout: '', stderr: 'RAN ${name};' };\n}\n`);
    for (const name of ['t-any', 't-write', 't-bash', 't-async', 't-stop', 't-regex'])
        says(name);
    put(join(dir, `t-layout${EXT}`), "export function hook(event, ctx) {\n  return { code: ctx.layout.folders.marker ? 2 : 0, stdout: '', stderr: 'LAYOUT ' + Object.keys(ctx.layout.folders).join() + ';' };\n}\n");
    const row = (hook, extra = {}) => ({ hook, events: ['PreToolUse'], role: 'judge', ...extra });
    const table = [
        row('t-bash', { matcher: 'Bash', order: 30 }), row('t-write', { matcher: 'Write|Edit', order: 20 }), row('t-any', { order: 10 }),
        row('t-regex', { matcher: 'mcp__.*', order: 40 }), row('t-async', { async: true, order: 5, role: 'recorder' }), row('t-stop', { events: ['Stop'] }),
    ];
    const ran = async (event) => (await runEvent(table, dir, toJson(event), dir, caller)).stderr;
    cases.push(['the table decides: a Bash call reaches the Bash hooks, in the table\'s order', await ran({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), 'RAN t-any;RAN t-bash;']);
    cases.push(['a Write reaches the Write hooks and the one with no matcher', await ran({ hook_event_name: 'PreToolUse', tool_name: 'Write' }), 'RAN t-any;RAN t-write;']);
    cases.push(['a matcher that is an expression is matched as one', await ran({ hook_event_name: 'PreToolUse', tool_name: 'mcp__x__y' }), 'RAN t-any;RAN t-regex;']);
    cases.push(['an async row is never run by the runner, and another event reaches its own hooks only', await ran({ hook_event_name: 'Stop' }), 'RAN t-stop;']);
    cases.push(['an event no row names runs nothing', await ran({ hook_event_name: 'Notification' }), '']);
    const layoutFile = join(dir, '.claude/layout.json');
    const layoutTable = [row('t-layout')];
    const judge = async () => (await runEvent(layoutTable, dir, toJson({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), dir, caller)).code;
    put(layoutFile, toJson({ folders: {}, concepts: {} }));
    const first = await judge();
    put(layoutFile, toJson({ folders: { marker: { path: 'm' } }, concepts: {} }));
    cases.push(['the layout changed between two events of one process: the second is judged by the new one', `${first}${await judge()}`, '02']);
    await new Promise((done) => setTimeout(done, 400));
    await runEvent(layoutTable, dir, toJson({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }), dir, caller);
    const last = readHookLog(dir).filter((r) => r.hook === 'event').at(-1);
    cases.push(['the event line\'s ms runs from the event\'s arrival, not from the process\'s start', last !== undefined && last.ms < 200, true]);
}
async function selftest(real) {
    const dir = scratchDir('run-hooks-');
    ensureDir(join(dir, '.claude'));
    const fake = (name, body, params = 'text') => { const f = join(dir, `${name}.mjs`); put(f, `export function hook(${params}) {\n${body}\n}\n`); return f; };
    const fake2 = (name, body) => fake(name, body, 'event, ctx');
    const ok = fake('says-ok', "process.stdout.write('{\"systemMessage\":\"a\"}'); return 0;");
    const no = fake('refuses', "process.stderr.write('BLOCKED by refuses\\n'); return JSON.parse(text).tool_name === 'Bash' ? 2 : 0;");
    const also = fake('also-says', "console.log(JSON.stringify({ systemMessage: 'b' })); return 0;");
    const boom = fake('throws', "throw new Error('planted');");
    const veto = fake('returns-verdict', "return { code: 2, stdout: '', stderr: 'VERDICT refusal\\n' };");
    const talk = fake('returns-words', "return { code: 0, stdout: JSON.stringify({ systemMessage: 'v' }), stderr: '' };");
    const loud = Array.from({ length: 30 }, (_, i) => fake(`loud-${i}`, `return { code: 0, stdout: JSON.stringify({ systemMessage: ${toJson(`h${i} `.repeat(250).slice(0, 500))} }), stderr: '' };`));
    const wall = Array.from({ length: 30 }, (_, i) => fake(`wall-${i}`, `return { code: 0, stdout: ${toJson(`w${i} `.repeat(250).slice(0, 499))} + '\\n', stderr: '' };`));
    const sees = fake2('sees-context', "return { code: ctx.env.MARK === 'x' && ctx.sessionPid === 4242 && ctx.cwd === '/there' && event.tool_name === 'Bash' ? 2 : 0, stdout: '', stderr: 'CTX seen\\n' };");
    const silent = fake2('returns-nothing', 'return undefined;');
    const bang = fake2('throws-too', "throw new Error('planted two');");
    const caller = { ...real, env: { MARK: 'x' }, cwd: '/there', sessionPid: 4242 };
    const bash = toJson({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm x' } });
    const cases = [];
    const r1 = await runAll([ok, no, also], bash, dir, caller);
    cases.push(['a refusal is the runner\'s exit 2', r1.code, 2]);
    cases.push(['its message reaches stderr', r1.stderr.includes('BLOCKED by refuses'), true]);
    cases.push(['two JSON outputs merge into one', asRecord(parseJson(r1.stdout))?.systemMessage === 'a\nb', true]);
    const r2 = await runAll([ok, no], toJson({ hook_event_name: 'PreToolUse', tool_name: 'Write' }), dir, caller);
    cases.push(['no refusal: exit 0', r2.code === 0 && r2.stdout === '{"systemMessage":"a"}', true]);
    const r3 = await runAll([boom, ok], bash, dir, caller);
    cases.push(['a hook that throws refuses the call, says so, and the next still runs', r3.code === 2 && r3.stderr.includes('throws crashed') && r3.stdout.includes('"a"'), true]);
    const r4 = await runAll([boom, ok], bash, dir, caller);
    cases.push(['the same call again goes through, and says so', r4.code === 0 && r4.stdout.includes('throws crashed'), true]);
    const rows = readHookLog(dir);
    cases.push(['one timing line per hook per call', rows.filter((r) => r.hook !== 'event').length === 9 && rows.filter((r) => r.hook === 'refuses').map((r) => r.code).join() === '2,0', true]);
    cases.push(['and one event line per call, from the runner, with its queue', rows.filter((r) => r.hook === 'event').length === 4 && rows.filter((r) => r.hook === 'event').every((r) => r.source === 'runner' && typeof r.queue === 'number'), true]);
    cases.push(['the line names the event and the tool', rows[0]?.event === 'PreToolUse' && rows[0]?.tool === 'Bash', true]);
    const lines = (f) => (readText(join(dir, '.claude/logs', f)) ?? '').split('\n').filter(Boolean).map((l) => asRecord(parseJson(l)) ?? {});
    const refused = lines('refusals.jsonl');
    cases.push(['every call is a line of events.jsonl', lines('events.jsonl').length, 4]);
    cases.push(['a refusal keeps its reason and what was tried', refused[0]?.hook === 'refuses' && String(refused[0]?.reason).includes('BLOCKED by refuses') && refused[0]?.command === 'rm x', true]);
    cases.push(['a crash is kept, in its own log', !refused.some((r) => r.hook === 'throws') && lines('crashes.jsonl').some((r) => r.hook === 'throws' && r.code === 1), true]);
    const r5 = await runAll([talk, veto], bash, dir, caller);
    cases.push(['a hook that returns a Verdict is judged by it: its code, its stderr, its stdout', r5.code === 2 && r5.stderr.includes('VERDICT refusal') && r5.stdout.includes('"v"'), true]);
    const r6 = await runAll(loud, toJson({ hook_event_name: 'UserPromptSubmit' }), dir, caller);
    const merged = asRecord(parseJson(r6.stdout));
    cases.push(['30 hooks of 500 characters: the merged JSON is held to 9,000 and still parses', r6.stdout.length <= OUT_CAP && merged !== null, true]);
    cases.push(['and a line says what was cut', String(merged?.systemMessage).includes('characters of the hooks\' output were cut'), true]);
    const r7 = await runAll(wall, toJson({ hook_event_name: 'UserPromptSubmit' }), dir, caller);
    cases.push(['30 plain-text hooks: held to 9,000, the cut named at the end', r7.stdout.length <= OUT_CAP && r7.stdout.includes('were cut here'), true]);
    cases.push(['a short merge is untouched', mergeOut(['a\n', 'b\n']), 'a\nb\n']);
    const r8 = await runAll([sees, talk], bash, dir, caller);
    cases.push(['a two-parameter hook gets the event and the context built from the caller', r8.code === 2 && r8.stderr.includes('CTX seen') && r8.stdout.includes('"v"'), true]);
    const r9 = await runAll([silent, ok], bash, dir, caller);
    cases.push(['a two-parameter hook that returns no Verdict crashed: the call is refused once, and the next hook still runs', r9.code === 2 && r9.stderr.includes('returns-nothing crashed') && r9.stdout.includes('"a"'), true]);
    const r10 = await runAll([bang], bash, dir, caller);
    cases.push(['a two-parameter hook that throws crashed', r10.code === 2 && r10.stderr.includes('throws-too crashed'), true]);
    await tableCases(dir, caller, cases);
    rmSync(dir, { recursive: true, force: true });
    return verdicts('run-hooks', cases);
}
if (isMain(import.meta.url)) {
    const args = process.argv.slice(2);
    const caller = { env: process.env, stdout: process.stdout, stderr: process.stderr, cwd: process.cwd(), sessionPid: process.ppid };
    if (args.includes('--selftest'))
        process.exit(await selftest(caller));
    let text = '';
    try {
        text = readFileSync(0, 'utf8');
    }
    catch { /* no stdin */ }
    const root = projectRoot();
    // the event arrived when node started: its own start-up is part of what the event cost
    const arrival = { at: Date.now() - Math.round(process.uptime() * 1000), source: 'runner' };
    // named hooks (an older settings entry, a hand-made one) run as named; with none, the table says which hooks the event reaches
    const table = args.length === 0 ? readHookTable(HERE) : null;
    const r = args.length > 0 ? await runAll(args, text, root, caller, arrival)
        : table !== null ? await runEvent(table, HERE, text, root, caller, arrival)
            : { code: 1, stdout: '', stderr: `${RUNNER}: ${join(HERE, 'hooks.json')} is missing or is not the hook table, so no hook judged this call: run claude-packs update\n` };
    // written at once, then out: a hook may leave a timer or a child behind, and the event never waits on it
    for (const [fd, s] of [[1, r.stdout], [2, r.stderr]])
        if (s)
            try {
                writeSync(fd, s);
            }
            catch { /* a closed pipe */ }
    process.exit(r.code);
}
