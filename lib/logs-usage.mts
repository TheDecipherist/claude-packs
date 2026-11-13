// `claude-packs logs skills` and `logs rules`: how often each installed skill and rule was used, from .claude/logs/skills.jsonl and
// rules.jsonl (rotated files too), and which installed ones never were. A line a log holds for a skill or rule no longer installed is
// counted under its name, marked gone. Reads only; nothing is rewritten.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { asRecord } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { readJsonl } from './logs.mts';

const SKIP = new Set(['node_modules', '.git', 'worktrees', 'logs']);

/** One name's use: its lines, how they split (by `via` or `why`), when it was last seen and the sessions that used it. */
export interface Use { name: string; count: number; by: Map<string, number>; last: string; sessions: Set<string> }

const names = (dir: string): string[] => { try { return readdirSync(dir); } catch { return []; } };
const isDir = (p: string): boolean => { try { return statSync(p).isDirectory(); } catch { return false; } };

/** The names of the project's installed skills: a folder with a SKILL.md under any `.claude/skills/`, nested ones included. */
export function installedSkills(root: string, depth = 4): string[] {
  const found = new Set<string>();
  const walk = (dir: string, left: number): void => {
    for (const n of names(dir)) {
      const p = join(dir, n);
      if (n === 'skills' && dir.endsWith('.claude')) { for (const s of names(p)) if (names(join(p, s)).includes('SKILL.md')) found.add(s); continue; }
      if (left > 0 && !SKIP.has(n) && (n === '.claude' || !n.startsWith('.')) && isDir(p)) walk(p, left - 1);
    }
  };
  walk(root, depth);
  return [...found].sort();
}

/** The names of the project's installed rules: the `.md` files of `.claude/rules/`. */
export const installedRules = (root: string): string[] => names(join(root, '.claude', 'rules')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();

/** The uses a log holds, per name: `key` is the field naming the skill or rule, `how` the field that splits them. */
export function usesOf(dir: string, log: string, key: string, how: string): Map<string, Use> {
  const uses = new Map<string, Use>();
  for (const line of readJsonl(dir, log)) {
    const r = asRecord(line);
    const name = r?.[key];
    if (typeof name !== 'string') continue;
    const use = uses.get(name) ?? { name, count: 0, by: new Map<string, number>(), last: '', sessions: new Set<string>() };
    const split = typeof r?.[how] === 'string' ? String(r?.[how]) : 'unknown';
    use.count += 1;
    use.by.set(split, (use.by.get(split) ?? 0) + 1);
    const t = r?.['t'];
    if (typeof t === 'string' && t > use.last) use.last = t;
    if (typeof r?.['session'] === 'string') use.sessions.add(r['session']);
    uses.set(name, use);
  }
  return uses;
}

function report(log: Logger, [title, label]: readonly [string, string], installed: readonly string[], uses: ReadonlyMap<string, Use>, never: string): number {
  if (!uses.size && !installed.length) { log(`no ${title}s installed, none logged`); return 0; }
  const split = (u: Use): string => [...u.by].sort().map(([k, n]) => `${k} ${n}`).join(', ');
  const rows = [...uses.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  log(`${rows.reduce((n, u) => n + u.count, 0)} ${title} use(s) logged`);
  for (const u of rows) log(`${label} ${u.name.padEnd(36)} ${String(u.count).padStart(5)}  ${u.sessions.size} session(s)  last ${u.last}  (${split(u)})${installed.includes(u.name) ? '' : '  [not installed]'}`);
  const unused = installed.filter((n) => !uses.has(n));
  log(`${never} (${unused.length} of ${installed.length} installed): ${unused.join(', ') || 'none'}`);
  return 0;
}

/** `logs skills`: per skill its uses (by the Skill tool, by a /name prompt), then the installed skills never used. */
export const skillsReport = (dir: string, log: Logger): number => report(log, ['skill', 'skill-use'], installedSkills(dir), usesOf(dir, 'skills', 'skill', 'via'), 'never used');

/** `logs rules`: per rule its loads (by why: session_start is a launch, path_glob_match its `paths:`), then the installed rules never loaded. */
export const rulesReport = (dir: string, log: Logger): number => report(log, ['rule', 'rule-applied'], installedRules(dir), usesOf(dir, 'rules', 'rule', 'why'), 'never loaded');
