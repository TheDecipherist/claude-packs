// look-gate's selftest, kept apart so the hook stays small: a real repo with a trunk and a branch that changes a look's code. The
// landing is refused with no report, a failing one and a stale one (the code changed after it), and passes with a fresh passing
// one; a branch that changed no look code lands; a merge of the trunk itself is no landing; after a build the due look is named.
import { join } from 'node:path';
import { gitOut } from './git-run.mts';
import { toJson } from './json.mts';
import { git, put, runHook, scratchProject, verdicts } from './selftest.mts';

const LOOKS = { looks: [{ name: 'home', reference: 'design/reference/home.webp', code: ['src/ui/**'] }] };

export function selftest(hook: string): number {
  const dir = scratchProject({ 'src/ui/Card.cpp': 'v1\n', 'src/core/Engine.cpp': 'e1\n', 'design/reference/home.webp': 'x' }, LOOKS);
  const commit = (msg: string, files: Record<string, string>): void => {
    for (const [f, t] of Object.entries(files)) put(join(dir, f), t);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', msg);
  };
  const head = (): string => (gitOut(['rev-parse', 'HEAD'], { cwd: dir, env: process.env }) ?? '').trim();
  const key = (): string => runHook(hook, dir, null, ['--key', 'home']).stdout.trim();
  const report = (verdict: string): string => toJson({ reference: 'design/reference/home.webp', code: key(), verdict });
  const legacy = (verdict: string): string => toJson({ reference: 'design/reference/home.webp', commit: head(), verdict });
  const event = (name: string, command: string) => ({ hook_event_name: name, tool_name: 'Bash', tool_input: { command }, cwd: dir });
  const land = (branch: string): number | null => runHook(hook, dir, event('PreToolUse', `git merge --ff-only ${branch}`)).status;
  const saidAfter = (command: string): string => runHook(hook, dir, event('PostToolUse', command)).stdout;
  git(dir, 'init', '-q', '-b', 'main');
  commit('base', {});
  git(dir, 'switch', '-q', '-c', 'work/engine');
  commit('engine only', { 'src/core/Engine.cpp': 'e2\n' });
  git(dir, 'switch', '-q', '-c', 'work/ui', 'main');
  commit('ui change', { 'src/ui/Card.cpp': 'v2\n' });
  git(dir, 'switch', '-q', '-c', 'work/ui-fail');
  commit('failing report', { 'build/evidence/looks/home.json': report('fail') });
  git(dir, 'switch', '-q', '-c', 'work/ui-pass', 'work/ui');
  commit('passing report', { 'build/evidence/looks/home.json': report('pass') });
  const row = (limit: boolean) => ({ reference: -0.062, ...(limit ? { limit: 0.026 } : { best_fit: 0.03 }), reason: 'a shadow only darkens' });
  const holding = (rows: Record<string, unknown>): string => toJson({ reference: 'design/reference/home.webp', code: key(), verdict: 'pass', held_out: rows });
  git(dir, 'switch', '-q', '-c', 'work/ui-held-one', 'work/ui');
  commit('one row held out, its limit shown', { 'build/evidence/looks/home.json': holding({ 'card bottom shadow': row(true) }) });
  git(dir, 'switch', '-q', '-c', 'work/ui-held-fit', 'work/ui');
  commit('one row held out on a fit, no limit', { 'build/evidence/looks/home.json': holding({ 'card bottom shadow': row(false) }) });
  git(dir, 'switch', '-q', '-c', 'work/ui-held-many', 'work/ui');
  commit('three rows held out', { 'build/evidence/looks/home.json': holding({ a: row(true), b: row(true), c: row(true) }) });
  git(dir, 'switch', '-q', '-c', 'work/ui-legacy', 'work/ui');
  commit('a report in the old form, with a commit', { 'build/evidence/looks/home.json': legacy('pass') });
  git(dir, 'switch', '-q', '-c', 'work/ui-stale', 'work/ui-pass');
  commit('ui changed again after the report', { 'src/ui/Card.cpp': 'v3\n' });
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'main');
  const due = saidAfter('node .claude/tools/buildq.mjs ninja -C out');
  const quiet = saidAfter('git status');
  git(dir, 'switch', '-q', 'main');
  return verdicts('look-gate', [
    ['a branch that changed look code and has no report', land('work/ui'), 2],
    ['a failing report', land('work/ui-fail'), 2],
    ['a stale report: its code key is not that of the current code', land('work/ui-stale'), 2],
    ['a fresh passing report', land('work/ui-pass'), 0],
    ['a report in the old form (a commit, no code) still counts', land('work/ui-legacy'), 0],
    ['a passing report holding one row out, with its limit', land('work/ui-held-one'), 0],
    ['a row held out on a fit\'s best, with no limit (KWB-217)', land('work/ui-held-fit'), 2],
    ['more rows held out than the look allows (KWB-217: 14 on one theme)', land('work/ui-held-many'), 2],
    ['a branch that changed no look code', land('work/engine'), 0],
    ['merging the trunk itself is no landing', land('origin/main'), 0],
    ['after a build, the due look is named', /look-gate: this branch changed the code that draws home/.test(due) ? 1 : 0, 1],
    ['a command that is no build says nothing', quiet === '' ? 1 : 0, 1],
  ]);
}
