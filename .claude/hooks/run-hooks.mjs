#!/usr/bin/env node
// run-hooks: one node process runs every kit hook of one settings entry, instead of one node process per hook (KWB-24:
// Tim saw 17 hooks take 48 s on one rm; each was its own node start, all at once, on a loaded machine). settings.json
// names the runner and its hooks in one command: node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs
// Each hook module exports hook(text) (the event's JSON text, as stdin was) and returns its exit code; the runner calls
// them in turn, catches each one's stdout and stderr, writes each one's timing line to .claude/hooks.log (lib/hook-log.mjs)
// and its own (hook "run-hooks": the whole process, node's start-up included), and exits with the worst code: 2 if any
// hook refused, else the first other non-zero. A hook that throws counts as exit 1 (a non-blocking error), as it would alone.
// Every hook still runs on its own too (node .claude/hooks/a.mjs, its selftest, a project's hand-made entry).
//   node run-hooks.mjs <hook path or name>...   (stdin: the event)
//   node run-hooks.mjs --selftest
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain, logHook, projectRoot, readHookLog } from './lib/hook-log.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNNER = 'run-hooks';
export const nameOf = (arg) => basename(arg).replace(/\.mjs$/, '');
const fileOf = (arg) => (isAbsolute(arg) ? arg : join(HERE, `${nameOf(arg)}.mjs`));

// Several hooks' stdout: one is passed as it is; JSON objects are merged (their messages joined), anything else joined by lines.
export function mergeOut(outs) {
  const said = outs.filter((o) => o.trim());
  if (said.length < 2) return said[0] ?? '';
  const objs = said.map((o) => { try { const v = JSON.parse(o); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } });
  if (objs.some((o) => o === null)) return said.map((o) => o.replace(/\n$/, '')).join('\n') + '\n';
  const out = {};
  for (const o of objs) {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'hookSpecificOutput' && out[k]) {
        const ctx = [out[k].additionalContext, v.additionalContext].filter(Boolean).join('\n');
        out[k] = { ...out[k], ...v, ...(ctx ? { additionalContext: ctx } : {}) };
      } else if (typeof v === 'string' && typeof out[k] === 'string' && ['systemMessage', 'reason', 'stopReason'].includes(k)) out[k] = `${out[k]}\n${v}`;
      else out[k] = v;
    }
  }
  return JSON.stringify(out);
}

const capture = (stream, sink) => {
  const write = stream.write;
  stream.write = (chunk, ...rest) => { sink.push(String(chunk)); const cb = rest.find((r) => typeof r === 'function'); if (cb) cb(); return true; };
  return () => { stream.write = write; };
};

// -> { code, stdout, stderr }. Each hook's own time is logged (its module's first import included).
export async function runAll(args, text, root = projectRoot()) {
  let ev = {};
  try { ev = JSON.parse(text) ?? {}; } catch { /* the hooks read it themselves */ }
  const outs = [];
  const err = [];
  let code = 0;
  for (const arg of args) {
    const name = nameOf(arg);
    const out = [];
    const t0 = performance.now();
    const undo = [capture(process.stdout, out), capture(process.stderr, err)];
    let c;
    try {
      const mod = await import(pathToFileURL(fileOf(arg)).href);
      if (typeof mod.hook !== 'function') throw new Error(`${name} exports no hook(text)`);
      c = await mod.hook(text);
    } catch (e) {
      c = 1;
      err.push(`run-hooks: ${name} failed: ${e?.stack ?? e}\n`);
    } finally {
      for (const u of undo) u();
    }
    c = Number.isInteger(c) ? c : 0;
    outs.push(out.join(''));
    logHook(root, { event: ev.hook_event_name, hook: name, ms: performance.now() - t0, code: c, tool: ev.tool_name ?? ev.source });
    if (c === 2) code = 2;
    else if (c !== 0 && code === 0) code = c;
  }
  return { code, stdout: mergeOut(outs), stderr: err.join('') };
}

async function selftest() {
  const dir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'run-hooks-'));
  mkdirSync(join(dir, '.claude'));
  const fake = (name, body) => { const f = join(dir, `${name}.mjs`); writeFileSync(f, `export function hook(text) {\n${body}\n}\n`); return f; };
  const ok = fake('says-ok', "process.stdout.write('{\"systemMessage\":\"a\"}'); return 0;");
  const no = fake('refuses', "process.stderr.write('BLOCKED by refuses\\n'); return JSON.parse(text).tool_name === 'Bash' ? 2 : 0;");
  const also = fake('also-says', "console.log(JSON.stringify({ systemMessage: 'b' })); return 0;");
  const boom = fake('throws', "throw new Error('planted');");
  const bash = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm x' } });
  const cases = [];
  const r1 = await runAll([ok, no, also], bash, dir);
  cases.push(['a refusal is the runner\'s exit 2', r1.code === 2]);
  cases.push(['its message reaches stderr', r1.stderr.includes('BLOCKED by refuses')]);
  cases.push(['two JSON outputs merge into one', JSON.parse(r1.stdout).systemMessage === 'a\nb']);
  const r2 = await runAll([ok, no], JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write' }), dir);
  cases.push(['no refusal: exit 0', r2.code === 0 && r2.stdout === '{"systemMessage":"a"}']);
  const r3 = await runAll([boom, ok], bash, dir);
  cases.push(['a hook that throws is exit 1 and the next still runs', r3.code === 1 && r3.stderr.includes('throws failed') && r3.stdout.includes('"a"')]);
  const rows = readHookLog(dir);
  cases.push(['one timing line per hook per call', rows.length === 7 && rows.filter((r) => r.hook === 'refuses').map((r) => r.code).join() === '2,0']);
  cases.push(['the line names the event and the tool', rows[0].event === 'PreToolUse' && rows[0].tool === 'Bash']);
  rmSync(dir, { recursive: true, force: true });
  const bad = cases.filter(([, good]) => !good);
  for (const [label] of bad) console.error(`run-hooks selftest FAILED: ${label}`);
  if (!bad.length) console.log(`run-hooks selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(await selftest());
  let text = '';
  try { text = readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  const root = projectRoot();
  const r = await runAll(args, text, root);
  let ev = {};
  try { ev = JSON.parse(text) ?? {}; } catch { /* logged as '-' */ }
  logHook(root, { event: ev.hook_event_name, hook: RUNNER, ms: performance.now(), code: r.code, tool: ev.tool_name ?? ev.source });
  // written at once, then out: a hook may leave a timer or a child behind, and the event never waits on it
  for (const [fd, s] of [[1, r.stdout], [2, r.stderr]]) if (s) try { writeSync(fd, s); } catch { /* a closed pipe */ }
  process.exit(r.code);
}
