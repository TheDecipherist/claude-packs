// docs-current (synth-creator's tool): a deterministic current generator passes; a generator that writes the time and a stale
// document are each refused; no generator passes with a word (U30). The tool runs from an install.
import { assert, fresh, join, mkdirSync, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { fixture } from '../../fixtures/installs.mts';

const TOOL = join(fixture('synth-creator'), '.claude/tools/docs-current.mjs');

/** A project whose generator writes one document: `body` is a shell fragment that prints it; `committed` is what is in docs/machine. */
function project(body: string | null, committed: string) {
  const root = fresh('docs-current-');
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'docs/machine'), { recursive: true });
  writeFileSync(join(root, 'docs/machine/params.md'), committed);
  writeFileSync(join(root, '.claude/layout.json'), toJson(body === null ? {} : { commands: { docs: `${body} > {out}/params.md` } }));
  return root;
}
const run = (root: string) => spawnSync('node', [TOOL, '--dir', root], { encoding: 'utf8' });

test('a deterministic generator whose output equals the committed document passes', () => {
  const done = run(project('echo cutoff', 'cutoff\n'));
  assert.equal(done.status, 0, done.stdout);
  assert.match(done.stdout, /current/);
});

test('a generator that writes the time is refused as not deterministic', () => {
  const done = run(project('node -e "console.log(process.hrtime.bigint())"', 'x\n'));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /not deterministic/);
});

test('a committed document that differs from the generated one is refused as stale', () => {
  const done = run(project('echo cutoff', 'cutoff old\n'));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /stale[\s\S]*differs: params\.md/);
});

test('no generator configured says so and passes; a failing generator is refused', () => {
  const none = run(project(null, ''));
  assert.equal(none.status, 0);
  assert.match(none.stdout, /no generator configured/);
  assert.equal(run(project('exit 3 #', '')).status, 1);
});
