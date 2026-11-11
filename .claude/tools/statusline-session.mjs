// The status line's top line (1.8.0): the session Claude Code hands it on stdin, read tolerantly across versions (a field
// missing or renamed draws nothing, never an error), and the segments drawn from it: the model and its effort, the context
// used, then the 5h and 7d quotas on a subscription or the session's cost on API billing.
import { parseJson } from '../hooks/lib/json.mjs';
const fieldAt = (obj, path) => path.split('.').reduce((cur, key) => (cur && typeof cur === 'object' ? cur[key] : undefined), obj);
const numberAt = (obj, paths) => {
    const found = paths.map((p) => fieldAt(obj, p)).find((v) => typeof v === 'number' && Number.isFinite(v));
    return typeof found === 'number' ? found : undefined;
};
const stringAt = (obj, paths) => {
    const found = paths.map((p) => fieldAt(obj, p)).find((v) => typeof v === 'string' && v.length > 0);
    return typeof found === 'string' ? found : undefined;
};
const MODELS = ['opus', 'sonnet', 'haiku', 'fable'];
export const modelFamily = (name) => MODELS.find((m) => name.toLowerCase().includes(m)) ?? name;
function quotaOf(obj, bases) {
    const percent = numberAt(obj, bases.flatMap((b) => [`${b}.used_percentage`, `${b}.utilization`]));
    return percent === undefined ? undefined : { percent };
}
/** The session from stdin's JSON: {} when there is none or it is not JSON. */
export function sessionOf(raw) {
    const o = parseJson(raw);
    if (!o || typeof o !== 'object')
        return {};
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
const tokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
const money = (usd) => (usd < 100 ? `$${usd.toFixed(2)}` : `$${Math.round(usd).toLocaleString('en-US')}`);
const EFFORT = { low: 'lo', medium: 'md', high: 'hi', xhigh: 'xh', max: 'mx' };
/** The model, red and marked when it is not the one the user pinned (a fallback swaps a live session's model unseen). */
export function modelSegment(s, pinned, paint, C) {
    if (!s.model)
        return '';
    const swapped = pinned && modelFamily(pinned) !== s.model;
    const name = swapped ? paint(`⚠ ${s.model.toUpperCase()}`, C.red) : paint(s.model, C.blue);
    return name + (s.effort ? ` ${paint(EFFORT[s.effort] ?? s.effort.slice(0, 2), C.dim)}` : '');
}
export function contextSegment(s, paint, C) {
    if (s.contextPercent === undefined)
        return '';
    const win = s.contextWindow ? ` ${paint(`(${tokens(s.contextWindow)})`, C.dim)}` : '';
    return `${paint('CTX', C.dim)} ${paint(`${Math.round(s.contextPercent)}%`, s.contextPercent >= 90 ? C.red : C.white)}${win}${s.over200k ? paint(' !', C.red) : ''}`;
}
const level = (p, C) => (p >= 90 ? C.red : p >= 75 ? C.amber : C.green);
/** On a subscription the quotas, else the session's cost (a subscription's cost is an estimate, not a bill). */
export function usageSegments(s, env, paint, C) {
    const forced = (env.CLAUDE_STATUS_BILLING || '').toLowerCase();
    const subscription = forced ? forced.startsWith('sub') : Boolean(s.quota5h || s.quota7d);
    if (!subscription)
        return s.costUsd === undefined ? [] : [`${paint('API', C.dim)} ${paint(money(s.costUsd), C.white)}`];
    const quotas = [['5h', s.quota5h], ['7d', s.quota7d]];
    return quotas.flatMap(([label, q]) => (q ? [`${paint(label, C.dim)} ${paint(`${Math.round(q.percent)}%`, level(q.percent, C))}`] : []));
}
