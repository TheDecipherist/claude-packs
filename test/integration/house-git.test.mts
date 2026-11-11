// 0.6.0: the house git laws and the copy-tree law, each taking its values from layout.json "guards" and the layout's folders.
import { assert, existsSync, git, hookRun, join, readFileSync, run, test } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { fixture, withLayout } from '../fixtures/installs.mts';

const startRepo = (dir: string): void => {
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'x');
};
const layoutOf = (dir: string): { guards: { git: { owner: string } } } => JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) as { guards: { git: { owner: string } } };

test('git-guard takes the project\'s owner, token, trunk and commands from layout.json', () => {
  const dir = fixture('audio-core');
  startRepo(dir);
  const bash = (command: string): Spawned => hookRun(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: dir });
  withLayout(dir, { guards: undefined }); // a project installed before 1.1.0: test/kf-fail-open.test.mjs holds that the laws are off for it
  assert.equal(bash('git push -u https://x-access-token:abc@github.com/a/b.git work/x').status, 2, 'the token law is always on (Sub37 WB-3)');
  withLayout(dir, { guards: { git: { house: true } } });
  assert.equal(bash('git add -A').status, 2);
  assert.equal(bash('git commit -m x -- a.h').status, 0, 'the trunk refusal is off by default');
  withLayout(dir, { guards: { git: { house: true, refuseTrunk: true } } });
  assert.equal(bash('git commit -m x -- a.h').status, 2, 'and on when the project enables it');
  const house = 'git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git work/x';
  assert.equal(bash(house).status, 0, 'the default owner is the house');
  withLayout(dir, { guards: { git: { house: true, owner: 'Acme', tokenVar: 'ACME_TOKEN' } } });
  const r = bash(house);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /github\.com\/Acme\/<repo>\.git/);
  assert.equal(bash('git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git work/x').status, 0);
  run(dir, 'update');
  assert.deepEqual(layoutOf(dir).guards.git.owner, 'Acme', 'guards survive an update');
});

test('a copy tree is read-only by its kind; the copy-trees rule loads there and in layout.json', () => {
  const dir = fixture('audio-core');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /paths:\n {2}- "\.claude\/layout\.json"\n---/);
  withLayout(dir, (l) => ({
    folders: { ...(l.folders as Record<string, unknown>), engines_copy: { path: 'src/engines/tabula', kind: 'copy', purpose: 'copied' } },
    guards: { copy: { tools: ['tools/copy_in.py'] } },
  }));
  run(dir, 'update');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /"src\/engines\/tabula\/\*\*"/);
  const w = (file_path: string): Spawned => hookRun(dir, 'protect-vendor.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, file_path) } });
  const r = w('src/engines/tabula/Voice.h');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /copy tree src\/engines\/tabula.*\n.*python3 tools\/copy_in\.py/);
  assert.equal(w('src/engines/Voice.h').status, 0);
  const b = (command: string): number | null => hookRun(dir, 'protect-vendor.mjs', { tool_name: 'Bash', tool_input: { command } }).status;
  assert.equal(b('echo x >> src/engines/tabula/Voice.h'), 2);
  assert.equal(b('python3 tools/copy_in.py src/engines/tabula/Voice.h'), 0);
  assert.equal(hookRun(dir, 'protect-vendor.mjs', { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(dir, 'src/engines/tabula/a.ipynb') } }).status, 2);
  assert.match(run(dir, 'doctor'), /OK:/);
});

// The house git laws hold in a real git worktree: a commit there is judged by the worktree's branch, not main's.
test('the house git laws judge a commit by the checkout it runs in, inside a real worktree', () => {
  const dir = fixture('audio-core');
  withLayout(dir, { guards: { git: { house: true, refuseTrunk: true } } });
  startRepo(dir);
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  const wt = join(dir, '.claude/worktrees/agent-x');
  const bash = (command: string): number | null => hookRun(dir, 'git-guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: dir }).status;
  assert.equal(bash(`git -C ${wt} commit -m x -- src/dsp/Svf.cpp`), 0, 'the worktree is on a branch');
  assert.equal(bash(`git -C ${dir} commit -m x -- src/dsp/Svf.cpp`), 2, 'main is the trunk');
  assert.equal(bash(`cd ${wt} && git add -A`), 2);
  assert.equal(bash(`cd ${wt} && git add src/dsp/Svf.cpp`), 0);
  assert.ok(existsSync(wt));
});
