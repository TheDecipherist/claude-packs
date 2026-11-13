// audit U36: bank-coverage fails a control no program varies. A planted flat control is seen red; a control behind an off switch is flat;
// an exemption needs a reason. Run from an install, as a project runs it.
import { assert, fresh, join, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const INSTALL = fixture('synth-creator');
run(INSTALL, 'add', 'sound-design');
const TOOL = join(INSTALL, '.claude/tools/bank-coverage.mjs');

const program = (name: string, values: Record<string, number>) => ({ name, values });
const bank = (flat: number) => ({
  controls: [{ id: 'cutoff' }, { id: 'drive' }, { id: 'keytrack', needs: 'filterOn' }],
  programs: [program('A', { cutoff: 0.2, drive: flat, filterOn: 1, keytrack: 0.1 }), program('B', { cutoff: 0.8, drive: flat === 0.5 ? 0.5 : 0.9, filterOn: 1, keytrack: 0.7 })],
});
function check(data: unknown, exempt?: unknown) {
  const dir = fresh('coverage-');
  writeFileSync(join(dir, 'bank.json'), toJson(data));
  if (exempt) writeFileSync(join(dir, 'exempt.json'), toJson(exempt));
  return spawnSync('node', [TOOL, join(dir, 'bank.json'), ...(exempt ? [join(dir, 'exempt.json')] : [])], { encoding: 'utf8' });
}

test('every control varied: exit 0', () => {
  const done = check(bank(0.1));
  assert.equal(done.status, 0, done.stdout);
});

test('a planted flat control fails and is named', () => {
  const done = check(bank(0.5));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /flat control: drive takes 1 distinct value/);
});

test('a control behind a switch that is off in every program is flat', () => {
  const data = bank(0.1);
  for (const p of data.programs) p.values.filterOn = 0;
  assert.match(check(data).stdout, /flat control: keytrack .* where filterOn is on/);
});

test('an exemption with a reason passes the flat control; with none it fails', () => {
  assert.equal(check(bank(0.5), { drive: 'a fixed trim, set by the machine' }).status, 0);
  assert.match(check(bank(0.5), { drive: ' ' }).stdout, /exempt with no reason: drive/);
});

test('no bank given: exit 2', () => {
  assert.equal(spawnSync('node', [TOOL], { encoding: 'utf8' }).status, 2);
});
