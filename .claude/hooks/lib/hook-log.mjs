// hook-log: every hook's run time, one line per call in the project's .claude/hooks.log (KWB-24: The user saw 17 hooks take 48 s on
// one rm and nothing said which). A line: ISO time, event, hook, ms, exit code, tool, tab-separated. The node hooks write it
// through this file (the runner for the hooks it runs, asHook for a hook run on its own); the python ones through
// lib/house.py's log_hook, the same line. doctor reads it (median and worst per hook over its last 100 calls).
// The log is bounded: past LOG_MAX_BYTES it is cut to its newest half, at a line.
//   asHook(name, fn): a hook run as its own process: stdin to fn(text), the time since the process began, logged; the exit code
//   isMain(import.meta.url): true when this module is the program node was started with (never when the runner imports it)
//   logHook(root, { event, hook, ms, code, tool })    readHookLog(root) -> [{ time, event, hook, ms, code, tool }]
import { appendFileSync, existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOG = join('.claude', 'hooks.log');
export const LOG_MAX_BYTES = 256 * 1024;

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
export const isMain = (url) => Boolean(process.argv[1]) && real(process.argv[1]) === real(fileURLToPath(url));
export const projectRoot = () => resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

// Never throws, never creates .claude: a hook is never stopped or slowed by its own log.
export function logHook(root, { event = '-', hook, ms, code, tool = '-' }) {
  try {
    if (!existsSync(join(root, '.claude'))) return;
    const file = join(root, LOG);
    const clean = (v) => String(v ?? '-').replace(/[\t\n]/g, ' ') || '-';
    appendFileSync(file, `${new Date().toISOString()}\t${clean(event)}\t${clean(hook)}\t${Math.round(ms)}\t${code ?? '-'}\t${clean(tool)}\n`);
    if (statSync(file).size > LOG_MAX_BYTES) {
      const text = readFileSync(file, 'utf8');
      const keep = text.slice(text.length - LOG_MAX_BYTES / 2);
      writeFileSync(file, keep.slice(keep.indexOf('\n') + 1));
    }
  } catch { /* the log never stops a hook */ }
}

export function readHookLog(root) {
  let text = '';
  try { text = readFileSync(join(root, LOG), 'utf8'); } catch { return []; }
  return text.split('\n').filter(Boolean).map((l) => l.split('\t')).filter((c) => c.length >= 5 && /^\d+$/.test(c[3]))
    .map(([time, event, hook, ms, code, tool]) => ({ time, event, hook, ms: Number(ms), code, tool: tool ?? '-' }));
}

const eventOf = (text) => { try { const p = JSON.parse(text); return { event: p.hook_event_name, tool: p.tool_name ?? p.source }; } catch { return {}; } };

// A hook run on its own: the time is from the process's start (node's own start-up included, which is what a hook costs).
export async function asHook(name, fn) {
  let text = '';
  try { text = readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  let code;
  try {
    code = await fn(text);
  } finally {
    logHook(projectRoot(), { ...eventOf(text), hook: name ?? basename(process.argv[1] ?? '-').replace(/\.\w+$/, ''), ms: performance.now(), code: code ?? 1 });
  }
  return code ?? 0;
}
