// The usage logs: one line per skill used (.claude/logs/skills.jsonl) and per rule loaded (.claude/logs/rules.jsonl), so a project
// can tell which of its skills and rules do any work. A line is { t, session, branch, ...what }; the file rotates and is never cleared.
//   logUsage(ctx, event, SKILLS, { skill, via })
import { join } from 'node:path';
import { checkoutHead } from './event-log.mjs';
import { appendRotated } from './hook-log.mjs';
import { toJson } from './json.mjs';
import { maskSecrets } from './secret-patterns.mjs';
export const SKILLS = join('.claude', 'logs', 'skills.jsonl');
export const RULES = join('.claude', 'logs', 'rules.jsonl');
/** One usage line in the main checkout's log (the project's, also for an agent in a worktree). The time is the event's. Never throws. */
export function logUsage(ctx, event, file, what) {
    const clean = Object.fromEntries(Object.entries(what).filter(([, v]) => v !== undefined).map(([k, v]) => [k, typeof v === 'string' ? maskSecrets(v) : v]));
    const branch = checkoutHead(event.cwd ?? ctx.projectDir).branch;
    appendRotated(ctx.projectDir, file, `${toJson({ t: new Date(ctx.now).toISOString(), session: event.session_id, ...(branch === undefined ? {} : { branch }), ...clean })}\n`);
}
