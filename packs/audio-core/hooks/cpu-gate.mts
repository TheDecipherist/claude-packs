// cpu-gate (PreToolUse, Bash): a branch that changed audio code lands only with a CPU report, for that code, whose worst block
// is within the budget (KWB-264: one build's CPU gate printed NOT met at 87 to 92 % of the deadline on one core, against the 50 %
// budget, and nothing stopped the stages that followed it; the user heard it as a crunch in a host). A project may set in
// layout.json:
//   "cpu": { "code": ["src/audio/**", ...], "report": "build/evidence/cpu.json", "budget": 0.5 }
// code defaults to the layout's audio, engines and dsp folders; report and budget to the values shown. The report is what the
// project's CPU benchmark writes (cpu-worst-case-per-block), committed on the branch:
//   { "code": "<node .claude/hooks/cpu-gate.mjs --key>", "verdict": "pass" | "fail", "worst": <the worst block's share of its
//     deadline, 0..>, "threads": <how many threads render the voices>, "case": "<what was played, the rate and block size>" }
// "code" is the hash of the audio code it measured (look-gate's codeKey), so a report goes stale when that code moves. At a
// landing (`git merge <branch>` on a trunk) a branch whose audio code changed needs its report on the branch, fresh, with
// verdict "pass" and "worst" within the budget; anything else refuses. Over the budget on one thread names the worker pool
// (voices-spread-over-cores): one core cannot hold that machine. `--selftest` proves it; `--key` prints the code's key.
// A judge on the hook contract: it writes no file.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MERGE, TRUNKS, codeKey } from './look-gate.mts';
import { matchesAny } from './lib/glob.mts';
import { checkoutBranch } from './lib/git-state.mts';
import { gitOut } from './lib/git-run.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { parseJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { faultOf, gateOf } from './lib/cpu-report.mts';
import type { CpuGate, Report } from './lib/cpu-report.mts';
import type { Env, Hook, HookContext, HookEvent } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const git = (root: string, env: Env, ...args: string[]): string | null => gitOut(args, { cwd: root, env });
const gateAt = (root: string, ctx: Pick<HookContext, 'projectDir' | 'cwd'>): CpuGate => gateOf(readLayout(claudeRoot(ctx.projectDir, join(root, 'x'), ctx.cwd)));
const keyOf = (root: string, env: Env, gate: CpuGate, ref: string): string => codeKey(root, env, { name: 'cpu', reference: '', code: gate.code }, ref);

function landing(event: HookEvent, ctx: HookContext): ReturnType<Hook> {
  const cwd = event.cwd ?? ctx.cwd;
  const why: string[] = [];
  for (const m of (event.tool_input?.command ?? '').matchAll(MERGE)) {
    const root = checkoutRoot(ctx.projectDir, join(m[1] ? join(cwd, m[1]) : cwd, 'x'), ctx.cwd);
    const ref = m[3] ?? '';
    if (!TRUNKS.includes(checkoutBranch(root, ctx.env)) || TRUNKS.some((t) => ref === t || ref.endsWith(`/${t}`))) continue;
    const gate = gateAt(root, ctx);
    if (!gate.code.length) continue;
    const changed = (git(root, ctx.env, 'diff', '--name-only', `HEAD...${ref}`) ?? '').split('\n').filter(Boolean);
    if (!changed.some((path) => matchesAny(path, gate.code))) continue;
    const text = git(root, ctx.env, 'show', `${ref}:${gate.report}`);
    const no = text === null ? `no CPU report at ${gate.report} on ${ref}` : faultOf(parseJson<Report>(text), gate, keyOf(root, ctx.env, gate, ref));
    if (no) why.push(`  ${ref}: ${no}`);
  }
  if (!why.length) return pass;
  return refuse(`BLOCKED by cpu-gate: this branch changed audio code, and its cost is not proved within the budget:\n${why.join('\n')}\n` +
    'Measure the worst block as the host runs it (cpu-worst-case-per-block: the heaviest patch at full polyphony, 44.1 kHz and 48 kHz), commit the report on the branch, then land.');
}

export const hook: Hook = (event, ctx) => (event.tool_name === 'Bash' && event.hook_event_name !== 'PostToolUse' ? landing(event, ctx) : pass);

/** The key of the audio code, by hand: `node .claude/hooks/cpu-gate.mjs --key` (a report's "code" is this). */
export function printKey(): number {
  const ctx = contextOf();
  const root = checkoutRoot(ctx.projectDir, join(ctx.cwd, 'x'), ctx.cwd);
  writeVerdict({ code: 0, stdout: `${keyOf(root, ctx.env, gateAt(root, ctx), 'HEAD')}\n`, stderr: '' });
  return 0;
}

/** A command that is no landing passes in a worktree, and a merge from a worktree on a branch that is no trunk judges nothing. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a command that is no landing passes in the worktree', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: '{wt}' }, want: 0 },
    { label: 'a merge from a worktree on a branch that is no trunk judges nothing', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git merge work/x' }, cwd: '{wt}' }, want: 0 },
  ],
};

// its selftest module loads only under --selftest, never on a real call
export async function selftest(): Promise<number> {
  return (await import('./lib/cpu-gate-selftest.mts')).selftest(fileURLToPath(import.meta.url));
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'cpu-gate', hook, selftest, { flags: { '--key': printKey } });
