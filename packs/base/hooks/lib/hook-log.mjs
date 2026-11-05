// hook-log: every hook's run time, one line per call in the project's .claude/hooks.log (KWB-24: The user saw 17 hooks take 48 s on
// one rm and nothing said which). A line: ISO time, event, hook, ms, exit code, tool, tab-separated. The node hooks write it
// through this file (the runner for the hooks it runs, asHook for a hook run on its own); the python ones through
// lib/house.py's log_hook, the same line. doctor reads it (median and worst per hook over its last 100 calls).
// Nothing is ever cleared. Past LOG_MAX_BYTES a log moves whole to .claude/logs/ under a dated name and a new one starts (appendRotated).
// Until a project knows which hooks earn their place it needs all of its history, so no rotated file is deleted.
// lib/event-log.mjs keeps the detail: every call, and every refusal with its reason.
//   asHook(name, fn): a hook run as its own process: stdin to fn(text), the time since the process began, logged; the exit code
//   isMain(import.meta.url): true when this module is the program node was started with (never when the runner imports it)
//   logHook(root, { event, hook, ms, code, tool })    readHookLog(root) -> [{ time, event, hook, ms, code, tool }]
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logCall } from './event-log.mjs';
import { readLayout } from './layout.mjs';

export const LOG = join('.claude', 'hooks.log');
export const LOG_MAX_BYTES = 1024 * 1024;
export const LOGS = join('.claude', 'logs');

const limits = new Map();
const maxBytes = (root) => {
  if (!limits.has(root)) limits.set(root, (readLayout(root).guards?.logs?.maxKb ?? LOG_MAX_BYTES / 1024) * 1024);
  return limits.get(root);
};
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

// Moves a full log to .claude/logs/<name>-<time><ext>. A second writer finding it gone just carries on: nothing is lost.
function rotate(root, file) {
  const ext = extname(file);
  const name = basename(file, ext);
  const dir = join(root, LOGS);
  mkdirSync(dir, { recursive: true });
  let to = join(dir, `${name}-${stamp()}${ext}`);
  for (let n = 1; existsSync(to); n += 1) to = join(dir, `${name}-${stamp()}-${n}${ext}`);
  renameSync(file, to);
}

// One or more lines onto a log, rotating it when full. Never throws, never creates .claude: a hook is never stopped by its own log.
export function appendRotated(root, rel, text) {
  try {
    if (!existsSync(join(root, '.claude'))) return;
    const file = join(root, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    appendFileSync(file, text);
    if (statSync(file).size > maxBytes(root)) rotate(root, file);
  } catch { /* the log never stops a hook */ }
}

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
export const isMain = (url) => Boolean(process.argv[1]) && real(process.argv[1]) === real(fileURLToPath(url));
export const projectRoot = () => resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

export function logHook(root, { event = '-', hook, ms, code, tool = '-' }) {
  const clean = (v) => String(v ?? '-').replace(/[\t\n]/g, ' ') || '-';
  appendRotated(root, LOG, `${new Date().toISOString()}\t${clean(event)}\t${clean(hook)}\t${Math.round(ms)}\t${code ?? '-'}\t${clean(tool)}\n`);
}

// One line per refused concept in .claude/usage.log: time, hook, concept (the shape hooks count what they refuse).
export function logRefusal(root, hook, concepts) {
  try {
    mkdirSync(join(root, '.claude'), { recursive: true });
    const t = new Date().toISOString();
    appendRotated(root, join('.claude', 'usage.log'), [...new Set(concepts)].map((c) => `${t}\t${hook}\t${c}\n`).join(''));
  } catch { /* the count is a report, never a reason to fail the hook */ }
}

// The live log, or with `{ rotated: true }` every line it ever held (doctor's crash report: a crash is not over because its line moved).
export function readHookLog(root, { rotated = false } = {}) {
  const old = rotated ? rotatedHookLogs(root) : [];
  const text = [...old, join(root, LOG)].map((f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
  return text.split('\n').filter(Boolean).map((l) => l.split('\t')).filter((c) => c.length >= 5 && /^\d+$/.test(c[3]))
    .map(([time, event, hook, ms, code, tool]) => ({ time, event, hook, ms: Number(ms), code, tool: tool ?? '-' }));
}

function rotatedHookLogs(root) {
  try { return readdirSync(join(root, LOGS)).filter((f) => /^hooks-.*\.log$/.test(f)).sort().map((f) => join(root, LOGS, f)); } catch { return []; }
}

const eventOf = (text) => { try { const p = JSON.parse(text); return { event: p.hook_event_name, tool: p.tool_name ?? p.source }; } catch { return {}; } };

// A hook run on its own: the time is from the process's start (node's own start-up included, which is what a hook costs).
export async function asHook(name, fn) {
  let text = '';
  try { text = readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  const said = [];
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => { said.push(String(chunk)); return write(chunk, ...rest); };
  let code;
  try {
    code = await fn(text);
  } finally {
    process.stderr.write = write;
    const hook = name ?? basename(process.argv[1] ?? '-').replace(/\.\w+$/, '');
    const root = projectRoot();
    logHook(root, { ...eventOf(text), hook, ms: performance.now(), code: code ?? 1 });
    logCall(root, text, [{ hook, ms: performance.now(), code: code ?? 1, reason: said.join('') }], appendRotated);
  }
  return code ?? 0;
}
