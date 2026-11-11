// The status line's top line (1.8.0): the session Claude Code hands it on stdin, read tolerantly across versions (a field
// missing or renamed draws nothing, never an error), and the segments drawn from it: the model and its effort, the context
// used, then the 5h and 7d quotas on a subscription or the session's cost on API billing.
import { parseJson } from '../hooks/lib/json.mts';
import type { Colours, Paint } from './statusline-paint.mts';

export interface Quota { percent: number }

/** What the bar reads of the session; every field is absent when the session did not carry it. */
export interface Session {
  model?: string;
  effort?: string;
  contextPercent?: number;
  contextWindow?: number;
  over200k?: boolean;
  quota5h?: Quota;
  quota7d?: Quota;
  costUsd?: number;
  cwd?: string;
  projectDir?: string;
  transcript?: string;
}

const fieldAt = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((cur, key) => (cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[key] : undefined), obj);
const numberAt = (obj: unknown, paths: readonly string[]): number | undefined => {
  const found = paths.map((p) => fieldAt(obj, p)).find((v) => typeof v === 'number' && Number.isFinite(v));
  return typeof found === 'number' ? found : undefined;
};
const stringAt = (obj: unknown, paths: readonly string[]): string | undefined => {
  const found = paths.map((p) => fieldAt(obj, p)).find((v) => typeof v === 'string' && v.length > 0);
  return typeof found === 'string' ? found : undefined;
};

const MODELS = ['opus', 'sonnet', 'haiku', 'fable'];
export const modelFamily = (name: string): string => MODELS.find((m) => name.toLowerCase().includes(m)) ?? name;

function quotaOf(obj: unknown, bases: readonly string[]): Quota | undefined {
  const percent = numberAt(obj, bases.flatMap((b) => [`${b}.used_percentage`, `${b}.utilization`]));
  return percent === undefined ? undefined : { percent };
}

/** The session from stdin's JSON: {} when there is none or it is not JSON. */
export function sessionOf(raw: string): Session {
  const o = parseJson<Record<string, unknown>>(raw);
  if (!o || typeof o !== 'object') return {};
  const model = stringAt(o, ['model.display_name', 'model.id']);
  return {
    model: model && modelFamily(model),
    effort: stringAt(o, ['effort.level']),
    contextPercent: numberAt(o, ['context_window.used_percentage']),
    contextWindow: numberAt(o, ['context_window.context_window_size']),
    over200k: o.exceeds_200k_tokens === true,
    quota5h: quotaOf(o, ['rate_limits.five_hour']),
    quota7d: quotaOf(o, ['rate_limits.seven_day']),
    costUsd: numberAt(o, ['cost.total_cost_usd']),
    cwd: stringAt(o, ['workspace.current_dir', 'cwd']),
    projectDir: stringAt(o, ['workspace.project_dir']),
    transcript: stringAt(o, ['transcript_path']),
  };
}

const tokens = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
const money = (usd: number): string => (usd < 100 ? `$${usd.toFixed(2)}` : `$${Math.round(usd).toLocaleString('en-US')}`);
const EFFORT: Readonly<Record<string, string>> = { low: 'lo', medium: 'md', high: 'hi', xhigh: 'xh', max: 'mx' };

/** The model, red and marked when it is not the one the user pinned (a fallback swaps a live session's model unseen). */
export function modelSegment(s: Session, pinned: string | null, paint: Paint, C: Colours): string {
  if (!s.model) return '';
  const swapped = pinned && modelFamily(pinned) !== s.model;
  const name = swapped ? paint(`⚠ ${s.model.toUpperCase()}`, C.red) : paint(s.model, C.blue);
  return name + (s.effort ? ` ${paint(EFFORT[s.effort] ?? s.effort.slice(0, 2), C.dim)}` : '');
}

export function contextSegment(s: Session, paint: Paint, C: Colours): string {
  if (s.contextPercent === undefined) return '';
  const win = s.contextWindow ? ` ${paint(`(${tokens(s.contextWindow)})`, C.dim)}` : '';
  return `${paint('CTX', C.dim)} ${paint(`${Math.round(s.contextPercent)}%`, s.contextPercent >= 90 ? C.red : C.white)}${win}${s.over200k ? paint(' !', C.red) : ''}`;
}

const level = (p: number, C: Colours) => (p >= 90 ? C.red : p >= 75 ? C.amber : C.green);

/** On a subscription the quotas, else the session's cost (a subscription's cost is an estimate, not a bill). */
export function usageSegments(s: Session, env: Readonly<Record<string, string | undefined>>, paint: Paint, C: Colours): string[] {
  const forced = (env.CLAUDE_STATUS_BILLING || '').toLowerCase();
  const subscription = forced ? forced.startsWith('sub') : Boolean(s.quota5h || s.quota7d);
  if (!subscription) return s.costUsd === undefined ? [] : [`${paint('API', C.dim)} ${paint(money(s.costUsd), C.white)}`];
  const quotas: [string, Quota | undefined][] = [['5h', s.quota5h], ['7d', s.quota7d]];
  return quotas.flatMap(([label, q]) => (q ? [`${paint(label, C.dim)} ${paint(`${Math.round(q.percent)}%`, level(q.percent, C))}`] : []));
}
