// shape-symmetry.mjs --selftest: a throwaway project whose design/shape.json declares fake members and swap commands, and the
// gate run as the generated test runs it. Planted: a member missing from one instance, a swap difference on one pair, a
// members command that fails, a many concept with no symmetry block, a one concept asked for symmetry. Each must be red;
// the clean manifest green with every pair printed (6 for N = 4, 3 for N = 3).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scratchProject, verdicts } from '../hooks/lib/selftest.mjs';

const FAKE = `const [what, i, j] = process.argv.slice(2);
if (what === 'members') {
  if (process.env.PLANT_MEMBERS_FAIL === i) process.exit(3);
  for (const m of ['gain', 'cutoff', 'reverb', 'delay']) if (!(m === 'delay' && process.env.PLANT_MISSING === i)) console.log(m);
} else if (what === 'swap') process.exit(process.env.PLANT_SWAP === i + ',' + j ? 1 : 0);
`;

export function selftest(tool) {
  const node = JSON.stringify(process.execPath);
  const sym = { members: `${node} fake.mjs members {i}`, swap: `${node} fake.mjs swap {i} {j}` };
  const shape = {
    concepts: {
      slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', owns: ['parameters', 'effects'], symmetry: sym },
      lane: { shape: 'many', count: 3, symmetry: { ...sym, first: 1 } },
      voice: { shape: 'many', count: 8 },
      mixer: { shape: 'one', id: 'mixer' },
    },
  };
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(shape), 'fake.mjs': FAKE });
  const run = (concept, env = {}) => {
    const r = spawnSync(process.execPath, [tool, 'run', concept, '--dir', dir], { encoding: 'utf8', env: { ...process.env, ...env } });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  const swaps = (out) => (out.match(/^ {2}swap \d+<->\d+:/gm) ?? []).length;

  const clean = run('slot');
  const missing = run('slot', { PLANT_MISSING: '2' });
  const swapped = run('slot', { PLANT_SWAP: '1,3' });
  const failing = run('slot', { PLANT_MEMBERS_FAIL: '0' });
  const lane = run('lane');
  const cmake = join(dir, 'out', 'shape_symmetry.cmake');
  const gen = spawnSync(process.execPath, [tool, 'gen', '--cmake', cmake, '--dir', dir], { encoding: 'utf8' });
  const list = spawnSync(process.execPath, [tool, 'gen', '--list', '--dir', dir], { encoding: 'utf8' }).stdout.trim().split('\n');
  const text = existsSync(cmake) ? readFileSync(cmake, 'utf8') : '';

  if (process.env.SHAPE_SYMMETRY_SELFTEST_VERBOSE) for (const r of [clean, missing, swapped]) console.log(r.out);
  return verdicts('shape-symmetry', [
    ['the clean manifest is green', clean.code, 0],
    ['the clean run prints all 6 pairs for N = 4', swaps(clean.out), 6],
    ['the clean run says 6 pairs checked', /6 pairs checked/.test(clean.out), true],
    ['planted: a member missing from instance 2 is red', missing.code, 1],
    ['planted: the missing member is named, with who has it and who lacks it', /instance 0 has delay that instance 2 lacks/.test(missing.out), true],
    ['planted: a swap difference on pair 1<->3 is red', swapped.code, 1],
    ['planted: the differing pair is named', /swap 1<->3: DIFFERS/.test(swapped.out), true],
    ['planted swap: every pair is still checked (6)', swaps(swapped.out), 6],
    ['planted: a members command that fails is red', failing.code, 1],
    ['N = 3, counted from 1: green with 3 pairs', `${lane.code} ${swaps(lane.out)} ${/swap 1<->2/.test(lane.out)}`, '0 3 true'],
    ['a many concept with no symmetry block is red, and says what to add', `${run('voice').code} ${/no symmetry block/.test(run('voice').out)}`, '1 true'],
    ['a one concept has no symmetry: red', run('mixer').code, 1],
    ['an unknown concept: red', run('nothing').code, 1],
    ['gen --cmake succeeds', gen.status, 0],
    ['gen --cmake: one add_test per many concept (slot, lane, voice)', (text.match(/^add_test\(NAME shape_symmetry\.(slot|lane|voice) /gm) ?? []).length, 3],
    ['gen --cmake: no test for a one concept', /shape_symmetry\.mixer/.test(text), false],
    ['gen --cmake: the manifest is a configure dependency', /CMAKE_CONFIGURE_DEPENDS .*design\/shape\.json/.test(text), true],
    ['gen --list: one line per many concept', list.length, 3],
  ]);
}
