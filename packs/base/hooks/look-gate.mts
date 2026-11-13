// look-gate (PreToolUse and PostToolUse, Bash): a page drawn from a reference picture lands only with a passing look report for
// the code that draws it (1.3.2: three pages of a plugin's editor landed far plainer than their mock-ups, judged by eye, and
// nothing stopped them). A project declares its looks in layout.json:
//   "looks": [{ "name": "home", "reference": "design/reference/home.webp", "code": ["src/app/home/**"],
//               "report": "build/evidence/looks/home.json" }]      (report defaults to build/evidence/looks/<name>.json)
// The report is what the project's look gate writes (the analyse-reference-look skill's gate), committed on the branch:
//   { "reference": "...", "code": "<node .claude/hooks/look-gate.mjs --key <name>>", "verdict": "pass" | "fail", "measures": { ... } }
// "code" is a hash of the files that draw the look (what the report is "for"), so a report changes only when that code or the
// verdict does: two branches that each ran the gate on a page they left alone write the same bytes and merge with no conflict
// (KWB-121; a "commit" field changed on every run and conflicted at every merge). A report with "commit" and no "code" still
// counts the old way: its commit must be at or after the last commit that changed the code.
// After a build command, a branch whose look code changed since the trunk is told which looks are due (no refusal: a render
// takes longer than a hook may). At a landing (`git merge <branch>` on a trunk), each look whose code the branch changed needs
// its report on that branch with verdict "pass" and a "code" equal to the key of the code on that branch;
// missing, failing or stale refuses the landing. `--selftest` proves it; `--key <name>` prints a look's key by hand.
// A judge on the hook contract (typescript order W4): it writes no file. The one hash here is sha256, kept: every key a report
// already holds was made with it (hash.mts owns the kit's sha1 ids, which these are not).
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mts';
import { checkoutBranch, refExistsIn } from './lib/git-state.mts';
import { gitOut } from './lib/git-run.mts';
import { sha256 } from './lib/hash.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { parseJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, HookEvent, Look } from './lib/types.d.mts';
import { pass, refuse, say } from './lib/verdict.mts';

const TRUNKS: readonly string[] = ['main', 'master'];
const BUILD = /\b(?:buildq|cmake\s+--build|ninja|make|npm\s+run\s+build|cargo\s+build|vite\s+build)\b/;
const MERGE = /(?:^|[;&|\n]\s*)git\s+(?:-C\s+(\S+)\s+)?merge\s+((?:-\S+\s+)*)([\w./-]+)\s*(?=$|[;&|\n])/g;

/** A look with its report path settled. */
export type DeclaredLook = Look & { report: string };
/** What a look report holds that the gate reads. */
interface Report { verdict?: unknown; code?: unknown; commit?: unknown; held_out?: unknown }

/** How many rows a passing report may hold out, unless the look's own `heldOutMax` says otherwise (KWB-217: a run held out 14). */
export const HELD_OUT_MAX = 2;
const num = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);

/** Why a report's held-out rows do not let it pass, or null. A row is held out only when no token can draw it: it names the
 *  reference's reading, the render's reading with the token at the end of its range (`limit`) and why; a fit's best is no limit.
 *  More rows than the look allows is a missing token (a moat, a lit rim), not a reading out of reach. */
export function heldOutFault(held: unknown, max: number): string | null {
  if (held === undefined) return null;
  if (held === null || typeof held !== 'object' || Array.isArray(held)) return 'its held_out is not an object of named rows';
  const rows = Object.entries(held as Record<string, unknown>);
  const bare = rows.filter(([, r]) => { const o = (r ?? {}) as Record<string, unknown>; return !num(o.reference) || !num(o.limit) || typeof o.reason !== 'string' || !o.reason; });
  if (bare.length) return `held_out row${bare.length > 1 ? 's' : ''} ${bare.map(([k]) => `"${k}"`).join(', ')} without reference, limit (the render with the token at the end of its range) and reason`;
  if (rows.length > max) return `${rows.length} rows held out, more than ${max}: that many is a token the theme lacks (a moat, a lit rim), not a reading no token can make; add the token, fit it and gate again`;
  return null;
}

/** What a git question needs of the caller: the folder to ask in is each call's own, the environment the event's. */
import type { Env } from './lib/types.d.mts';

const git = (root: string, env: Env, ...args: string[]): string | null => gitOut(args, { cwd: root, env });
const pathspecs = (globs: readonly string[]): string[] => globs.map((g) => `:(glob)${g}`);
const looksOf = (root: string, ctx: Pick<HookContext, 'projectDir' | 'cwd'>): DeclaredLook[] =>
  (readLayout(claudeRoot(ctx.projectDir, join(root, 'x'), ctx.cwd)).looks ?? []).map((l) => ({ ...l, report: l.report ?? `build/evidence/looks/${l.name}.json` }));

// The looks whose code changed between two commits.
const touched = (root: string, env: Env, looks: readonly DeclaredLook[], from: string, to: string): DeclaredLook[] =>
  looks.filter((l) => (git(root, env, 'diff', '--name-only', `${from}...${to}`, '--', ...pathspecs(l.code ?? [])) ?? '') !== '');

/** The key of a look's drawing code at `ref`: a hash of each file's mode, blob and path, so it moves only when that code does. */
export function codeKey(root: string, env: Env, look: Look, ref: string): string {
  const rows = (git(root, env, 'ls-tree', '-r', ref) ?? '').split('\n').filter((r) => matchesAny(r.slice(r.indexOf('\t') + 1), look.code ?? []));
  return sha256(rows.join('\n'), 16);
}

// Why a look may not land on `ref`, or null: its report must be on the branch, pass, and judge the code's last change.
function verdictOf(root: string, env: Env, look: DeclaredLook, ref: string): string | null {
  const last = git(root, env, 'log', '-1', '--format=%H', ref, '--', ...pathspecs(look.code ?? []));
  const text = git(root, env, 'show', `${ref}:${look.report}`);
  if (text === null) return `no look report at ${look.report} on ${ref}`;
  const report = parseJson<Report>(text);
  if (report === null || typeof report !== 'object') return `${look.report} is not JSON`;
  if (report.verdict !== 'pass') return `${look.report} says "${String(report.verdict)}"`;
  const held = heldOutFault(report.held_out, look.heldOutMax ?? HELD_OUT_MAX);
  if (held) return `${look.report} passes only by holding rows out: ${held}`;
  if (report.code !== undefined) {
    const key = codeKey(root, env, look, ref);
    return report.code === key ? null : `${look.report} judged code ${String(report.code).slice(0, 8)}, but the look's code on ${ref} is ${key.slice(0, 8)}`;
  }
  if (!report.commit || git(root, env, 'merge-base', '--is-ancestor', last ?? '', String(report.commit)) === null) {
    return `${look.report} judged ${String(report.commit ?? 'no commit').slice(0, 8)}, before the look's code last changed in ${String(last).slice(0, 8)}`;
  }
  return null;
}

function landing(event: HookEvent, ctx: HookContext): ReturnType<Hook> {
  const cwd = event.cwd ?? ctx.cwd;
  const why: string[] = [];
  for (const m of (event.tool_input?.command ?? '').matchAll(MERGE)) {
    const root = checkoutRoot(ctx.projectDir, join(m[1] ? join(cwd, m[1]) : cwd, 'x'), ctx.cwd);
    const ref = m[3] ?? '';
    if (!TRUNKS.includes(checkoutBranch(root, ctx.env)) || TRUNKS.some((t) => ref === t || ref.endsWith(`/${t}`))) continue;
    for (const look of touched(root, ctx.env, looksOf(root, ctx), 'HEAD', ref)) {
      const no = verdictOf(root, ctx.env, look, ref);
      if (no) why.push(`  ${look.name} (${look.reference}): ${no}`);
    }
  }
  if (!why.length) return pass;
  return refuse(`BLOCKED by look-gate: this branch changed the code that draws a reference look, and the look is not proved:\n${why.join('\n')}\n` +
    'Run the look gate (the analyse-reference-look skill: render, measure against the reference, plant a fault) and commit its passing report on the branch, then land.');
}

function afterBuild(event: HookEvent, ctx: HookContext): ReturnType<Hook> {
  if (!BUILD.test(event.tool_input?.command ?? '')) return pass;
  const root = checkoutRoot(ctx.projectDir, join(event.cwd ?? ctx.cwd, 'x'), ctx.cwd);
  const trunk = TRUNKS.map((t) => `origin/${t}`).find((t) => refExistsIn(root, ctx.env, t));
  if (!trunk) return pass;
  const due = touched(root, ctx.env, looksOf(root, ctx), trunk, 'HEAD').filter((l) => verdictOf(root, ctx.env, l, 'HEAD') !== null);
  if (!due.length) return pass;
  const names = due.map((l) => `${l.name} (${l.reference})`).join(', ');
  return say({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext:
    `look-gate: this branch changed the code that draws ${names}. Compare the render with each reference now, with the analyse-reference-look skill's gate, and commit its passing report: look-gate refuses the landing without it.` } });
}

export const hook: Hook = (event, ctx) => {
  if (event.tool_name !== 'Bash') return pass;
  return event.hook_event_name === 'PostToolUse' ? afterBuild(event, ctx) : landing(event, ctx);
};

/** The key of a look's code, by hand: `node .claude/hooks/look-gate.mjs --key <name>` (a report's "code" is this). */
export function printKey(args: readonly string[]): number {
  const ctx = contextOf();
  const name = args[args.indexOf('--key') + 1];
  const root = checkoutRoot(ctx.projectDir, join(ctx.cwd, 'x'), ctx.cwd);
  const look = looksOf(root, ctx).find((l) => l.name === name);
  if (!look) { writeVerdict({ code: 1, stdout: '', stderr: `look-gate: no look named "${String(name)}" in layout.json\n` }); return 1; }
  writeVerdict({ code: 0, stdout: `${codeKey(root, ctx.env, look, 'HEAD')}\n`, stderr: '' });
  return 0;
}

/** After a build, the worktree is told which of its looks are due; main, which declares none, says nothing (the layout of the
 *  worktree's branch and its commit need git: worktree-cases-commands.mjs keeps that step). A command that is no landing passes. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a command that is no landing passes in the worktree', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: '{wt}' }, want: 0 },
    { label: 'a merge from a worktree on a branch that is no trunk judges nothing', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git merge work/x' }, cwd: '{wt}' }, want: 0 },
  ],
};

// its selftest module loads only under --selftest, never on a real call (W3.2)
export async function selftest(): Promise<number> {
  return (await import('./lib/look-gate-selftest.mts')).selftest(fileURLToPath(import.meta.url));
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'look-gate', hook, selftest, { flags: { '--key': printKey } });
