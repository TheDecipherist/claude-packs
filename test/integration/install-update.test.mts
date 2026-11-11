// An edited rule survives updates (split from install.test.mts so no file sums over a minute).
import { appendFileSync, assert, existsSync, join, readFileSync, run, test } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

test('an edited rule survives repeated updates', () => {
  const dir = fixture('audio-core+gpu-painter');
  const rule = join(dir, '.claude', 'rules', 'gpu-bloom.md');
  appendFileSync(rule, '- my own note\n');
  run(dir, 'update');
  run(dir, 'update');
  assert.match(readFileSync(rule, 'utf8'), /my own note/);
  assert.ok(existsSync(`${rule}.pack-new`), 'new pack version saved beside the edited rule');
  assert.match(run(dir, 'doctor'), /OK:/);
  run(dir, 'update', '--force');
  assert.doesNotMatch(readFileSync(rule, 'utf8'), /my own note/);
});
