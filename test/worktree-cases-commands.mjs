// The worktree cases for base's hooks that judge a command or a read by the layout of the checkout it runs in: what the project's
// whole suite is, which assets may be added, which files are read only through a skill, and which looks a branch must prove.
// worktrees.test.mjs joins them with the other cases, and fails for an installed hook with no case.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bash, fireAs, put } from './worktree-rig.mjs';

// The worktree's layout with these keys merged in; main's stays as it was.
const withLayout = (wt, keys) => {
  const layout = JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8'));
  put(join(wt, '.claude/layout.json'), JSON.stringify({ ...layout, ...keys(layout) }));
};

export const COMMAND_CASES = {
  'inside-the-project.mjs': ({ here, wt }) => {
    // A worktree inside the project (.claude/worktrees/) is the project's, and work there passes; a worktree of the same repo
    // kept beside the project is outside the kit, and a write into it is refused (KWB-103).
    const write = (file) => fireAs(here, 'inside-the-project.mjs', { tool_name: 'Write', tool_input: { file_path: file, content: 'x' }, cwd: here }).status;
    assert.equal(write(join(wt, 'src/n.ts')), 0);
    const beside = `${here}-beside`;
    spawnSync('git', ['-C', here, 'worktree', 'add', '-q', beside, '-b', 'beside-case'], { stdio: 'ignore' });
    assert.equal(write(join(beside, 'src/n.ts')), 2);
  },
  'suite-once.mjs': ({ here, wt }) => {
    // The worktree's layout names its own suite command, main's does not. Nobody asked for a full run (1.3.0: the gate is the
    // changed tests; a full run only on the user's request).
    withLayout(wt, (l) => ({ commands: { ...l.commands, test: 'bash tools/all.sh' } }));
    assert.equal(bash(here, 'suite-once.mjs', `cd ${wt} && bash tools/all.sh`), 2);
    assert.equal(bash(here, 'suite-once.mjs', `cd ${here} && bash tools/all.sh`), 0);
  },
  'repo-litter.mjs': ({ here, wt }) => {
    // The worktree's layout allows this asset; main's does not.
    put(join(wt, 'hero.png'), 'x');
    put(join(here, 'hero.png'), 'x');
    withLayout(wt, () => ({ guards: { repoLitter: { allow: ['hero.png'] } } }));
    const add = (cwd) => fireAs(here, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git add hero.png' }, cwd }).status;
    assert.equal(add(wt), 0);
    assert.equal(add(here), 2);
  },
  'skill-first.mjs': ({ here, wt }) => {
    // The worktree's layout names its sheets as circuit material; main's does not. The transcript has no skill loaded, and the
    // project installs read-a-circuit-diagram (reverse-engineering), so the row applies.
    put(join(wt, 'sheets/board.png'), 'x');
    put(join(here, 'sheets/board.png'), 'x');
    withLayout(wt, (l) => ({ guards: { ...l.guards, circuitSkill: { sources: ['sheets/**'] } } }));
    const transcript = join(here, 'unloaded.jsonl');
    put(transcript, '{"type":"user"}\n');
    const read = (root) => fireAs(here, 'skill-first.mjs', { tool_name: 'Read', tool_input: { file_path: join(root, 'sheets/board.png') }, cwd: root, transcript_path: transcript }).status;
    assert.equal(read(wt), 2);
    assert.equal(read(here), 0);
  },
  'look-gate.mjs': ({ here, wt }) => {
    // The worktree's layout declares a look and its branch changes the look's code; main's declares none. After a build the
    // worktree is told its look is due, and main says nothing.
    const g = (cwd, ...a) => spawnSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
    withLayout(wt, () => ({ looks: [{ name: 'card', reference: 'design/reference/card.png', code: ['src/app/look/**'] }] }));
    g(here, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    put(join(wt, 'src/app/look/Card.cpp'), 'int card;\n');
    g(wt, 'add', 'src/app/look/Card.cpp');
    g(wt, 'commit', '-qm', 'card', '--', 'src/app/look/Card.cpp');
    const build = (cwd) => fireAs(here, 'look-gate.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'ninja -C out' }, cwd }).stdout;
    assert.match(build(wt), /look-gate: this branch changed the code that draws card/);
    assert.equal(build(here), '');
  },
};
