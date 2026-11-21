// The detail behind hooks.log. Every call is one line of .claude/logs/events.jsonl: who, where, what was attempted, and each hook's time, exit code and reason. Every refusal
// is also a line of .claude/logs/refusals.jsonl, with an id, the branch and commit, the kit's version and the hash of the hook that decided, so it can be judged
// later: `claude-packs logs mark <id> right|wrong "<why>"`. A crash refused nothing and is no verdict on the work, so it has its own log, crashes.jsonl (KF-40). Bug logs only record the refusals somebody complained about; this records them all. Secrets are masked. File
// contents are not kept, only their size. Logs rotate and are never cleared.
//   logCall(root, text, [{ hook, ms, code, reason, out }], append, total)
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { shortHash } from './hash.mts';
import { parseJson, toJson } from './json.mts';
import { maskSecrets } from './secret-patterns.mts';
import type { HookEvent, Lock } from './types.d.mts';

export const EVENTS: string = join('.claude', 'logs', 'events.jsonl');
export const REFUSALS: string = join('.claude', 'logs', 'refusals.jsonl');
export const CRASHES: string = join('.claude', 'logs', 'crashes.jsonl');
const KEEP = { command: 4000, prompt: 1000, reason: 4000, out: 500 };

/** What one hook did on one call: its time, its exit code, what it said (a refusal's reason) and what it printed. */
export interface HookRun { hook: string; ms: number; code: number; reason?: string; out?: string }
/** The log writer a caller gives: a line added to a file of the project (hook-log's appendRotated). */
export type AppendLine = (root: string, file: string, line: string) => void;
/** A checkout's branch and commit, as far as its files say. */
export interface Head { branch?: string; commit?: string }

const cut = (text: unknown, n: number): string => { const t = maskSecrets(text ?? ''); return t.length > n ? `${t.slice(0, n)}... [${t.length} chars]` : t; };

// The branch and commit of a checkout, from its files: no process is started on the hot path. A worktree's .git is a file.
export function checkoutHead(cwd: string): Head {
  try {
    let git = join(cwd, '.git');
    if (statSync(git).isFile()) git = resolve(cwd, readFileSync(git, 'utf8').replace('gitdir:', '').trim());
    const head = readFileSync(join(git, 'HEAD'), 'utf8').trim();
    const ref = head.match(/^ref: (.+)$/)?.[1];
    if (!ref) return { commit: head.slice(0, 12) };
    const common = existsSync(join(git, 'commondir')) ? resolve(git, readFileSync(join(git, 'commondir'), 'utf8').trim()) : git;
    let commit: string | undefined;
    try { commit = readFileSync(join(common, ref), 'utf8').trim().slice(0, 12); } catch { /* packed, or no commit yet */ }
    return { branch: ref.replace('refs/heads/', ''), ...(commit === undefined ? {} : { commit }) };
  } catch { return {}; }
}

// What the call tried to do, from the event itself.
function attempt(ev: HookEvent): Record<string, unknown> {
  const i = ev.tool_input ?? {};
  const body = i.content ?? i.new_string ?? i.new_source;
  const file = i.file_path ?? i.notebook_path;
  return {
    ...(file ? { file } : {}),
    ...(typeof body === 'string' ? { bytes: body.length } : {}),
    ...(i.edits ? { edits: i.edits.length } : {}),
    ...(i.command ? { command: cut(i.command, KEEP.command) } : {}),
    ...(i.description ? { description: cut(i.description, 200) } : {}),
    ...(ev.prompt ? { prompt: cut(ev.prompt, KEEP.prompt) } : {}),
  };
}

function lawOf(root: string, hook: string): { kit?: string; hookHash?: string } {
  try {
    const lock = parseJson<Partial<Lock>>(readFileSync(join(root, '.claude/claude-packs.lock.json'), 'utf8'));
    if (!lock) return {};
    return { kit: lock.kit, hookHash: lock.files?.[`.claude/hooks/${hook}.mjs`]?.slice(0, 12) };
  } catch { return {}; }
}

/** A halt's reason: a hook that answered exit 0 with `continue: false` (lib/verdict `halt`) stopped the session, which is a refusal the
 *  user meets; null for any other answer. Before this, no halt reached refusals.jsonl, so none could be judged (KWB-next, 2026-11-21). */
export function haltReason(out: string | undefined): string | null {
  if (!out || !out.includes('"continue"')) return null;
  const said = parseJson<{ continue?: unknown; stopReason?: unknown }>(out);
  return said !== null && typeof said === 'object' && said.continue === false ? String(said.stopReason ?? 'stopped the session') : null;
}

/** True for a line of refusals.jsonl that refused something: an exit 2, or a halt (code 0, `halt: true`). Any other code there is an old
 *  crash line. Every reader of the refusal log decides by this, so a halt is judged like a refusal and never counted a crash. */
export const isRefusalRow = (r: Readonly<Record<string, unknown>>): boolean => r['code'] === 2 || r['halt'] === true;

/** One call's lines in the logs: the call itself, and each hook that did not let it through (a refusal, a halt, a crash). Never throws. */
export function logCall(root: string, text: string, hooks: readonly HookRun[], append: AppendLine, total?: number): void {
  try {
    const parsed = parseJson<HookEvent>(text);
    const ev: HookEvent = parsed !== null && typeof parsed === 'object' ? parsed : {};   // a line with no event is still a line
    const t = new Date().toISOString();
    const where = { session: ev.session_id, agent: ev.agent_id ?? ev.agent_type, cwd: ev.cwd, event: ev.hook_event_name, tool: ev.tool_name ?? ev.source, mode: ev.permission_mode };
    const what = attempt(ev);
    const judged = hooks.map((h) => ({ hook: h.hook, ms: Math.round(h.ms), code: h.code, ...(h.code !== 0 && h.reason ? { reason: cut(h.reason, KEEP.reason) } : {}), ...(h.out ? { out: cut(h.out, KEEP.out) } : {}) }));
    append(root, EVENTS, `${toJson({ t, ...where, ...what, ...(total ? { ms: Math.round(total) } : {}), hooks: judged })}\n`);
    const halts = new Map(hooks.flatMap((h) => { const why = h.code === 0 ? haltReason(h.out) : null; return why === null ? [] : [[h.hook, why] as const]; }));
    for (const h of judged.filter((x) => x.code !== 0 || halts.has(x.hook))) {
      const halt = halts.get(h.hook);
      const reason = halt === undefined ? h.reason : cut(halt, KEEP.reason);
      const id = shortHash(`${t}${h.hook}${reason ?? ''}`, 8);
      const file = h.code === 2 || halt !== undefined ? REFUSALS : CRASHES;
      append(root, file, `${toJson({ id, t, hook: h.hook, code: h.code, reason, ...(halt === undefined ? {} : { halt: true }), ...where, ...what, ...checkoutHead(ev.cwd ?? root), ...lawOf(root, h.hook) })}\n`);
    }
  } catch { /* the log never stops a hook */ }
}
