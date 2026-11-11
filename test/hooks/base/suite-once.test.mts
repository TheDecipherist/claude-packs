// suite-once: the whole suite runs only when the user's prompt asks for a full run. The hook's contract, then its refusals.
import { join } from 'node:path';
import { bash, git, withLayout } from '../../fixtures/installs.mts';
import { assert, put, test } from '../../kit-cli.mts';
import { commandCase } from '../command-case.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { bashAt, workProject } from '../work-project.mts';

holdsTheContract({
  hook: 'suite-once.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('npm test', project), status: 2 }),
  worktree: commandCase('suite-once.mjs'),
});

test('KF-23: suite-once sees the whole suite through the project\'s own wrapper', () => {
  const dir = workProject();
  withLayout(dir, { commands: { test: 'tools/build.sh test' } });
  put(join(dir, 'a.txt'), 'one\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'x', '--', 'a.txt');
  put(join(dir, 'a.txt'), 'two\n');
  const status = (command: string): number | null => bashAt(dir, 'suite-once.mjs', command).status;
  for (const command of ['tools/build.sh test --full-gate', 'tools/build.sh test', 'bash tools/build.sh test --full-gate', './tools/build.sh test', 'tools/build.sh test --full-gate > /tmp/log 2>&1 &', 'nohup tools/build.sh test --full-gate &']) assert.equal(status(command), 2, command);
  for (const command of ['tools/build.sh test control_input', 'tools/build.sh build', "echo 'tools/build.sh test'"]) assert.equal(status(command), 0, command);
});
