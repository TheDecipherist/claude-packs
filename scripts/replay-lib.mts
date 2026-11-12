// What the replay probe (docs/workorders/typescript/probes/replay-play.mts) and the W10b soak (scripts/soak.mts) share: a scratch project
// with bandwarp's pack set, a repo with a bare remote that answers after a lag, the fixture's events turned into payloads of their
// kind, and the command a project's settings run for an event. Never another project: the scratch is made under the folder given.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseJson, readJson, toJson, writeJson } from '../packs/base/hooks/lib/json.mts';

export const KIT = resolve(import.meta.dirname, '..');
export const CLI = join(KIT, 'bin/claude-packs.mjs');

export const sh = (cmd: string, cwd: string, env: NodeJS.ProcessEnv = process.env): { status: number | null; out: string } => {
  const r = spawnSync('sh', ['-c', cmd], { cwd, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};
export const git = (cwd: string, ...a: string[]): string => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** One commit of a file `n<k>.txt` in `cwd`. */
export const commit = (cwd: string, k: number): void => {
  writeFileSync(join(cwd, `n${k}.txt`), `${k}\n`);
  git(cwd, 'add', `n${k}.txt`);
  git(cwd, 'commit', '-q', '-m', `c${k}`);
};

export interface Scratch { root: string; dir: string; remote: string; shim: string }

/** Init of bandwarp's pack set in `<root>/proj` (the install runs with `installEnv`), a repo with a bare remote, 12 heads, 7 agent worktrees and
 *  3 local branches with commits the remote lacks; the remote answers after `lag` ms (a `git-upload-pack` shim in a GIT_EXEC_PATH folder). */
export function makeScratch(root: string, lag: number, installEnv: NodeJS.ProcessEnv, config = 'synth-creator cpp audio-core instrument-shell midi sound-design'): Scratch {
  const dir = join(root, 'proj');
  const remote = join(root, 'remote.git');
  mkdirSync(dir, { recursive: true });
  const init = sh(`node ${CLI} init --config ${config} --dir ${dir}`, KIT, installEnv);
  if (init.status !== 0) throw new Error(`init failed: ${init.out}`);
  git(dir, 'init', '-q', '-b', 'main');
  git(root, 'init', '-q', '--bare', remote);
  const layoutFile = join(dir, '.claude/layout.json');
  const layout = readJson<Record<string, unknown>>(layoutFile, {}) ?? {};
  const guards = { ...(layout['guards'] as object), git: { house: true, ghAuth: 'cli', trunkNeedsYes: true } };
  writeJson(layoutFile, { ...layout, guards, looks: [{ name: 'warm-panel', reference: 'ref.png', code: ['src/ui/**'] }] });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, 'src/ui'), { recursive: true });
  writeFileSync(join(dir, 'docs/chart.mmd'), 'flowchart LR\n  a --> b\n');
  for (let i = 0; i < 700; i++) {
    mkdirSync(join(dir, `src/dsp/m${i % 20}`), { recursive: true });
    writeFileSync(join(dir, `src/dsp/m${i % 20}/f${i}.cpp`), `// ${i}\n`);
  }
  writeFileSync(join(dir, '.gitignore'), 'build/\n.claude/worktrees/\n.claude/logs/\n.claude/hooks.log\n.claude/state/\n');
  git(dir, 'remote', 'add', 'origin', remote);
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'start');
  git(dir, 'push', '-q', 'origin', 'main');
  for (let i = 0; i < 12; i++) { git(dir, 'branch', `work/b${i}`); git(dir, 'push', '-q', 'origin', `work/b${i}`); }
  for (let i = 0; i < 7; i++) git(dir, 'worktree', 'add', '-q', join(dir, '.claude/worktrees', `agent-${i}`), `work/b${i}`);
  for (const i of [8, 9, 10]) { git(dir, 'checkout', '-q', `work/b${i}`); commit(dir, i); }
  git(dir, 'checkout', '-q', 'main');
  const shim = join(root, 'shim');
  mkdirSync(shim);
  const exec = sh('git --exec-path', dir).out.trim();
  for (const f of readdirSync(exec)) if (f !== 'git-upload-pack') symlinkSync(join(exec, f), join(shim, f)); // git looks in GIT_EXEC_PATH first
  writeFileSync(join(shim, 'git-upload-pack'), `#!/bin/sh\nsleep ${(lag / 1000).toFixed(2)}\nexec "${exec}/git-upload-pack" "$@"\n`);
  chmodSync(join(shim, 'git-upload-pack'), 0o755);
  return { root, dir, remote, shim };
}

interface Entry { matcher?: string; hooks: { command: string; async?: boolean }[] }
/** The command the project's settings run for an event of a tool (null: none judges it). */
export function settingsCommandOf(dir: string): (event: string, tool: string) => string | null {
  const settings = readJson<{ hooks: Record<string, Entry[]> }>(join(dir, '.claude/settings.json'), { hooks: {} }) ?? { hooks: {} };
  return (event, tool) => {
    const match = (x: Entry): boolean => x.matcher === undefined || x.matcher === '*' || new RegExp(`^(?:${x.matcher})$`).test(tool);
    const entry = (settings.hooks[event] ?? []).find((x) => match(x) && x.hooks.some((h) => !h.async));
    return entry?.hooks.find((h) => !h.async)?.command ?? null;
  };
}

export interface Fixture { event: string; tool: string }
/** The fixture's events in order. */
export const fixtureEvents = (): Fixture[] => readFileSync(join(KIT, 'test/fixtures/replay/bandwarp-hooks.jsonl'), 'utf8').split('\n').filter(Boolean)
  .map((l) => parseJson<Fixture>(l)).filter((e): e is Fixture => e !== null);

const bashes = ['ls src', 'git status --short', 'cmake --build build -j4', 'git log --oneline -3', 'cat docs/chart.mmd', 'git commit -m x -- n1.txt'];
const writeInput = (dir: string, k: number): object => ({
  file_path: join(dir, `src/dsp/m${k % 20}/f${k % 700}.cpp`), content: `// w${k}\nint f${k}() { return ${k}; }\n`, old_string: `// ${k % 700}`, new_string: `// w${k}`,
});
/** The stdin JSON of an event of the fixture, the `k`th of a run. */
export const payloadOf = (dir: string, e: Fixture, k: number): string => {
  const head = { session_id: 'replay', cwd: dir, hook_event_name: e.event };
  if (e.event === 'Stop') return toJson({ ...head, stop_hook_active: false });
  if (e.event === 'UserPromptSubmit') return toJson({ ...head, prompt: `step ${k}` });
  const input = e.tool === 'Bash' ? { command: bashes[k % bashes.length] } : e.tool === 'Write' || e.tool === 'Edit' ? writeInput(dir, k) : { file_path: join(dir, 'docs/chart.mmd') };
  return toJson({ ...head, tool_name: e.tool, tool_input: input, ...(e.event === 'PostToolUse' ? { tool_response: { success: true } } : {}) });
};
