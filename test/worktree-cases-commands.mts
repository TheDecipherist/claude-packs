// The worktree cases for base's hooks that judge a command or a read by the layout of the checkout it runs in: what the project's
// whole suite is, which assets may be added, which files are read only through a skill, and which looks a branch must prove.
// worktrees.test.mjs joins them with the other cases, and fails for an installed hook with no case.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { put } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { worktreeCase as AGENTS_HELD } from '../packs/base/hooks/agents-held.mts';
import { worktreeCase as BRIEF_GUARD } from '../packs/base/hooks/brief-guard.mts';
import { worktreeCase as BRIEF_GUARD_COUNT } from '../packs/base/hooks/brief-guard-count.mts';
import { worktreeCase as INSIDE_THE_PROJECT } from '../packs/base/hooks/inside-the-project.mts';
import { worktreeCase as STAY_INSIDE } from '../packs/base/hooks/stay-inside.mts';
import { worktreeCase as LOOK_GATE } from '../packs/base/hooks/look-gate.mts';
import { worktreeCase as MAKING_CHECK } from '../packs/base/hooks/making-check.mts';
import { worktreeCase as GOVERNOR_ROUTE } from '../packs/base/hooks/governor-route.mts';
import { worktreeCase as MAKING_CHECK_COUNT } from '../packs/base/hooks/making-check-count.mts';
import { worktreeCase as NO_FIND } from '../packs/base/hooks/no-find.mts';
import { worktreeCase as NO_POLLING } from '../packs/base/hooks/no-polling.mts';
import { worktreeCase as REPO_LITTER } from '../packs/base/hooks/repo-litter.mts';
import { worktreeCase as SUITE_ONCE } from '../packs/base/hooks/suite-once.mts';
import { worktreeCase as TEMPLATE_LAW } from '../packs/base/hooks/template-law.mts';
import { worktreeCase as UNTRUSTED_BOUNDARY } from '../packs/base/hooks/untrusted-boundary.mts';
import { git, withLayout } from './fixtures/installs.mts';
import { bash, caseFrom, fireAs } from './worktree-rig.mts';
import type { Checkouts } from './worktree-rig.mts';

type CheckoutCase = (checkouts: Checkouts) => void;
const objectOf = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? { ...value } : {});

export const COMMAND_CASES: Record<string, CheckoutCase> = {
  'inside-the-project.mjs': (checkouts) => {
    // A worktree inside the project (.claude/worktrees/) is the project's, and work there passes; a worktree of the same repo
    // kept beside the project is outside the kit, and a write into it is refused (KWB-103). The hook's own data case first; the
    // beside-the-project write needs a real `git worktree add`, so it stays here until slice 6.
    caseFrom('inside-the-project.mjs', INSIDE_THE_PROJECT)(checkouts);
    const { here, wt } = checkouts;
    const write = (file: string) => fireAs(here, 'inside-the-project.mjs', { tool_name: 'Write', tool_input: { file_path: file, content: 'x' }, cwd: here }).status;
    assert.equal(write(join(wt, 'src/n.ts')), 0);
    const beside = `${here}-beside`;
    git(here, 'worktree', 'add', '-q', beside, '-b', 'beside-case');
    assert.equal(write(join(beside, 'src/n.ts')), 2);
  },
  'agents-held.mjs': (checkouts) => {
    caseFrom('agents-held.mjs', AGENTS_HELD)(checkouts);
    const { here, wt } = checkouts;
    // A session with nobody there, working in a worktree, is refused the end of its turn while a background agent is pending
    // (KWB-124, KWB-199); a returned one passes, and a background start passes.
    const line = (block: unknown): string => JSON.stringify({ type: 'assistant', message: { content: [block] } });
    const launch = line({ type: 'tool_use', id: 'w1', name: 'Agent', input: { description: 'part', run_in_background: true } });
    const note = JSON.stringify({ type: 'queue-operation', content: '<task-notification><tool-use-id>w1</tool-use-id></task-notification>' });
    put(join(wt, 'pending.jsonl'), `${launch}\n`);
    put(join(wt, 'returned.jsonl'), `${launch}\n${note}\n`);
    const stopAt = (cwd: string, transcript: string) => fireAs(here, 'agents-held.mjs', { hook_event_name: 'Stop', transcript_path: join(wt, transcript), cwd }, { CLAUDE_PACKS_UNATTENDED: '1' }).status;
    assert.equal(stopAt(wt, 'pending.jsonl'), 2);
    assert.equal(stopAt(wt, 'returned.jsonl'), 0);
    assert.equal(fireAs(here, 'agents-held.mjs', { tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: true }, cwd: wt }, { CLAUDE_PACKS_UNATTENDED: '1' }).status, 0);
  },
  'suite-once.mjs': (checkouts) => {
    caseFrom('suite-once.mjs', SUITE_ONCE)(checkouts);
    const { here, wt } = checkouts;
    // The worktree's layout names its own suite command, main's does not. Nobody asked for a full run (1.3.0: the gate is the
    // changed tests; a full run only on the user's request).
    withLayout(wt, (l) => ({ commands: { ...objectOf(l.commands), test: 'bash tools/all.sh' } }));
    assert.equal(bash(here, 'suite-once.mjs', `cd ${wt} && bash tools/all.sh`), 2);
    assert.equal(bash(here, 'suite-once.mjs', `cd ${here} && bash tools/all.sh`), 0);
  },
  'kit-fresh.mjs': ({ here, wt }) => {
    // a session in the worktree reads the worktree's own install: its installed package older than npm's (the run's kept answer is
    // this kit's version; the package wins over the lock, KWB-162); the main checkout's install of this kit is the newest and says
    // nothing. Someone is there whatever the run's environment says (KWB-185): a block would put the notice on stderr.
    put(join(wt, 'node_modules/@thedecipherist/claude-packs/package.json'), toJson({ name: '@thedecipherist/claude-packs', version: '0.0.1' }));
    const start = (cwd: string) => fireAs(here, 'kit-fresh.mjs', { hook_event_name: 'SessionStart', cwd }, { CLAUDE_PACKS_UNATTENDED: '0' });
    assert.match(start(wt).stdout, /runs the kit 0\.0\.1/);
    assert.equal(start(here).stdout, '');
  },
  // a hook moved onto the contract (W4) exports its own worktree case as data, beside its selftest
  'no-find.mjs': caseFrom('no-find.mjs', NO_FIND),
  'stay-inside.mjs': caseFrom('stay-inside.mjs', STAY_INSIDE),
  'no-polling.mjs': caseFrom('no-polling.mjs', NO_POLLING),
  'governor-route.mjs': caseFrom('governor-route.mjs', GOVERNOR_ROUTE),
  'untrusted-boundary.mjs': caseFrom('untrusted-boundary.mjs', UNTRUSTED_BOUNDARY),
  'template-law.mjs': caseFrom('template-law.mjs', TEMPLATE_LAW),
  'brief-guard.mjs': caseFrom('brief-guard.mjs', BRIEF_GUARD),
  'brief-guard-count.mjs': caseFrom('brief-guard-count.mjs', BRIEF_GUARD_COUNT),
  'making-check.mjs': caseFrom('making-check.mjs', MAKING_CHECK),
  'making-check-count.mjs': caseFrom('making-check-count.mjs', MAKING_CHECK_COUNT),
  'repo-litter.mjs': (checkouts) => {
    caseFrom('repo-litter.mjs', REPO_LITTER)(checkouts);
    const { here, wt } = checkouts;
    // The worktree's layout allows this asset; main's does not.
    put(join(wt, 'hero.png'), 'x');
    put(join(here, 'hero.png'), 'x');
    withLayout(wt, () => ({ guards: { repoLitter: { allow: ['hero.png'] } } }));
    const add = (cwd: string) => fireAs(here, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git add hero.png' }, cwd }).status;
    assert.equal(add(wt), 0);
    assert.equal(add(here), 2);
  },
  'skill-first.mjs': ({ here, wt }) => {
    // The worktree's layout names its sheets as circuit material; main's does not. The transcript has no skill loaded, and the
    // project installs read-a-circuit-diagram (reverse-engineering), so the row applies.
    put(join(wt, 'sheets/board.png'), 'x');
    put(join(here, 'sheets/board.png'), 'x');
    withLayout(wt, (l) => ({ guards: { ...objectOf(l.guards), circuitSkill: { sources: ['sheets/**'] } } }));
    const transcript = join(here, 'unloaded.jsonl');
    put(transcript, '{"type":"user"}\n');
    const read = (root: string) => fireAs(here, 'skill-first.mjs', { tool_name: 'Read', tool_input: { file_path: join(root, 'sheets/board.png') }, cwd: root, transcript_path: transcript }).status;
    assert.equal(read(wt), 2);
    assert.equal(read(here), 0);
  },
  'look-gate.mjs': (checkouts) => {
    caseFrom('look-gate.mjs', LOOK_GATE)(checkouts);
    const { here, wt } = checkouts;
    // The worktree's layout declares a look and its branch changes the look's code; main's declares none. After a build the
    // worktree is told its look is due, and main says nothing.
    withLayout(wt, () => ({ looks: [{ name: 'card', reference: 'design/reference/card.png', code: ['src/app/look/**'] }] }));
    git(here, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    put(join(wt, 'src/app/look/Card.cpp'), 'int card;\n');
    git(wt, 'add', 'src/app/look/Card.cpp');
    git(wt, 'commit', '-qm', 'card', '--', 'src/app/look/Card.cpp');
    const build = (cwd: string) => fireAs(here, 'look-gate.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'ninja -C out' }, cwd }).stdout;
    assert.match(build(wt), /look-gate: this branch changed the code that draws card/);
    assert.equal(build(here), '');
  },
};
