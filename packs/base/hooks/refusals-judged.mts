// refusals-judged: a turn ends only when every refusal this session met has its verdict (refusals-are-judged). The rule alone
// was not followed: supernova2's sessions 3 to 28 met 41 refusals and judged none (KWB-next), so no hook's worth could be read.
// A Stop hook. The refusals are the lines of .claude/logs/refusals.jsonl with this session's id and code 2 (a crash refused nothing
// and has no verdict); a verdict is a line of .claude/logs/verdicts.jsonl with the refusal's id, which `logs mark` writes. It never
// loops: it sends a turn back once, and a turn already sent back (stop_hook_active) ends.
//   node refusals-judged.mjs --selftest
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { asRecord, parseJson, toJson } from './lib/json.mts';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { Hook, VerdictRow } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const LOGS = join('.claude', 'logs');
const SHOWN = 12;   // ids named in the message; the rest are counted

const linesOf = (file: string): Record<string, unknown>[] => {
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { return []; }
  return text.split('\n').flatMap((l) => { const r = asRecord(parseJson(l)); return r ? [r] : []; });
};

/** The ids of this session's refusals that have no verdict, oldest first. */
export function unjudged(root: string, session: string): string[] {
  const judged = new Set(linesOf(join(root, LOGS, 'verdicts.jsonl')).map((v) => v['id']).filter((id): id is string => typeof id === 'string'));
  return linesOf(join(root, LOGS, 'refusals.jsonl'))
    .filter((r) => r['session'] === session && r['code'] === 2 && typeof r['id'] === 'string' && !judged.has(r['id']))
    .map((r) => String(r['id']));
}

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name !== 'Stop' || event.stop_hook_active || typeof event.session_id !== 'string') return pass;
  const open = unjudged(ctx.projectDir, event.session_id);
  if (!open.length) return pass;
  const named = open.slice(0, SHOWN).join(', ') + (open.length > SHOWN ? ` and ${open.length - SHOWN} more` : '');
  return refuse(
    `BLOCKED by refusals-judged: this session met ${open.length} refusal(s) with no verdict: ${named}. `
    + '`npx --no-install @thedecipherist/claude-packs logs refusals --open` shows each one\'s reason and command. Read each, then mark it: '
    + '`npx --no-install @thedecipherist/claude-packs logs mark <id> right|wrong "<why>"` (right when the hook was right and you fixed the work; '
    + 'wrong when it refused correct work, which also goes into the workflow bug log). This turn is sent back once.',
  );
};

const refusal = (id: string, session: string, code = 2): string => toJson({ id, t: '2026-11-13T13:00:00.000Z', hook: 'code-shape', code, reason: 'BLOCKED', session });
const verdict = (id: string): string => toJson({ id, verdict: 'right', why: 'fixed', t: '2026-11-13T13:01:00.000Z' });

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const project = (refusals: string[], judged: string[] = []): string => {
    const dir = scratchProject({ 'README.md': '# x\n' });
    put(join(dir, LOGS, 'refusals.jsonl'), refusals.map((l) => `${l}\n`).join(''));
    put(join(dir, LOGS, 'verdicts.jsonl'), judged.map((l) => `${l}\n`).join(''));
    return dir;
  };
  const stop = (dir: string, extra: Record<string, unknown> = {}): number =>
    runHook(hookFile, dir, { hook_event_name: 'Stop', session_id: 's1', ...extra }).status ?? -1;
  const other = (): number => {
    const dir = project([refusal('aa', 's1')]);
    const v = hook({ hook_event_name: 'PostToolUse', session_id: 's1' }, contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir } }));
    return v instanceof Promise ? -1 : v.code;
  };
  const rows: VerdictRow[] = [
    ['a refusal of this session with no verdict', stop(project([refusal('aa', 's1')])), 2],
    ['two, one judged', stop(project([refusal('aa', 's1'), refusal('bb', 's1')], [verdict('aa')])), 2],
    ['every refusal of this session judged', stop(project([refusal('aa', 's1'), refusal('bb', 's1')], [verdict('aa'), verdict('bb')])), 0],
    ['another session\'s open refusal is not this one\'s', stop(project([refusal('cc', 's2')])), 0],
    ['a crash (code 1) has no verdict to give', stop(project([refusal('dd', 's1', 1)])), 0],
    ['no logs at all', stop(scratchProject({ 'README.md': '# x\n' })), 0],
    ['a turn already sent back ends (never loops)', stop(project([refusal('aa', 's1')]), { stop_hook_active: true }), 0],
    ['a hook event that is not Stop', other(), 0],
  ];
  return verdicts('refusals-judged', rows);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'refusals-judged', hook, selftest);
