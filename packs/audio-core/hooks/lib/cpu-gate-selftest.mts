// cpu-gate's selftest, kept apart so the hook stays small: a real repo with a trunk and branches that change audio code. The
// landing is refused with no report, a stale one, a failing one, and one over the budget on one core (whose reason names the
// worker pool); it passes with a fresh report within the budget; a branch that changed no audio code lands; a merge of the
// trunk itself is no landing (KWB-264).
import { join } from 'node:path';
import { toJson } from './json.mts';
import { git, put, runHook, scratchProject, verdicts } from './selftest.mts';

const LAYOUT = { folders: { audio: { path: 'src/audio' }, engines: { path: 'src/engines' }, dsp: { path: 'src/dsp' }, app: { path: 'src/app' } } };
const REPORT = 'build/evidence/cpu.json';

export function selftest(hook: string): number {
  const dir = scratchProject({ 'src/audio/Voices.cpp': 'v1\n', 'src/app/Editor.cpp': 'e1\n' }, LAYOUT);
  const commit = (msg: string, files: Record<string, string>): void => {
    for (const [f, t] of Object.entries(files)) put(join(dir, f), t);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', msg);
  };
  const key = (): string => runHook(hook, dir, null, ['--key']).stdout.trim();
  const report = (worst: number, threads: number, verdict = worst <= 0.5 ? 'pass' : 'fail'): string =>
    toJson({ code: key(), verdict, worst, threads, case: '48 keys, heaviest program, 44.1 kHz, 128 samples' });
  const event = (command: string) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd: dir });
  const land = (branch: string): { status: number | null; stderr: string } => runHook(hook, dir, event(`git merge --ff-only ${branch}`));
  git(dir, 'init', '-q', '-b', 'main');
  commit('base', {});
  git(dir, 'switch', '-q', '-c', 'work/editor');
  commit('editor only', { 'src/app/Editor.cpp': 'e2\n' });
  git(dir, 'switch', '-q', '-c', 'work/voices', 'main');
  commit('voices change', { 'src/audio/Voices.cpp': 'v2\n' });
  git(dir, 'switch', '-q', '-c', 'work/voices-over');
  commit('over the budget on one core', { [REPORT]: report(0.92, 1) });
  git(dir, 'switch', '-q', '-c', 'work/voices-over-pool', 'work/voices');
  commit('over the budget with four threads', { [REPORT]: report(0.61, 4) });
  git(dir, 'switch', '-q', '-c', 'work/voices-lies', 'work/voices');
  commit('a pass verdict over the budget', { [REPORT]: report(0.92, 1, 'pass') });
  git(dir, 'switch', '-q', '-c', 'work/voices-pass', 'work/voices');
  commit('within the budget', { [REPORT]: report(0.31, 4) });
  git(dir, 'switch', '-q', '-c', 'work/voices-stale', 'work/voices-pass');
  commit('voices changed after the report', { 'src/audio/Voices.cpp': 'v3\n' });
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'main');
  git(dir, 'switch', '-q', 'main');
  const over = land('work/voices-over');
  return verdicts('cpu-gate', [
    ['a branch that changed audio code and has no report', land('work/voices').status, 2],
    ['a report over the budget on one core', over.status, 2],
    ['its reason names the worker pool', /spread-voices-over-cores/.test(over.stderr) ? 1 : 0, 1],
    ['a report over the budget with a worker pool', land('work/voices-over-pool').status, 2],
    ['a "pass" verdict whose worst block is over the budget', land('work/voices-lies').status, 2],
    ['a stale report: its code key is not that of the current code', land('work/voices-stale').status, 2],
    ['a fresh report within the budget', land('work/voices-pass').status, 0],
    ['a branch that changed no audio code', land('work/editor').status, 0],
    ['merging the trunk itself is no landing', land('origin/main').status, 0],
  ]);
}
