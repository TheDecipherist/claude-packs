// W8.3: the TypeScript runner keeps the git facts the hooks read (lib/git-state.mts): after an event whose kept facts are stale it
// starts one detached refresh, and the facts appear without the event having waited on them. A project with no hook that reads them
// keeps nothing.
import { readdirSync } from 'node:fs';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../packs/base/hooks/lib/json.mts';
import { assert, git, join, put, run, spawnSync, test } from '../kit-cli.mts';

const bash = toJson({ session_id: 's', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
const kept = (tmp: string): string[] => readdirSync(tmp).filter((f) => /^claude-packs-gitstate-\w+\.json$/.test(f));
const wait = (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

test('an event through the runner keeps the git facts of its checkout, detached, and the next event finds them fresh', () => {
  const dir = scratchDir('gs-runner-');
  const tmp = scratchDir('gs-runner-tmp-');
  git(dir, 'init', '-q', '-b', 'main');
  run(dir, 'init', 'base');
  put(join(dir, 'README.md'), 'x\n');
  git(dir, 'add', 'README.md');
  git(dir, 'commit', '-q', '-m', 'start');
  const fire = (): number | null => spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs')], {
    cwd: dir, input: bash, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir, TMPDIR: tmp },
  }).status;
  assert.equal(fire(), 0);
  for (let i = 0; i < 100 && kept(tmp).length === 0; i++) wait(100);
  const files = kept(tmp);
  assert.equal(files.length, 1, 'the detached refresh wrote one facts file');
  const facts = readJson<{ head: string | null; tree: [string, number][] }>(join(tmp, files[0] ?? ''));
  assert.ok(facts?.head, 'HEAD\'s commit is in it');
  assert.ok(facts?.tree.some(([p]) => p === 'README.md'), 'and its non-empty files');
  assert.equal(fire(), 0);
  wait(500);
  assert.equal(readdirSync(tmp).filter((f) => f.endsWith('.start')).length, 1, 'the second event started no second refresh');
});
