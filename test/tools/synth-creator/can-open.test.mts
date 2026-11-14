// can-open (synth-creator's tool): a fake build tree in a temp folder with each fault planted (U27). The tool runs from an install.
import { utimesSync } from 'node:fs';
import { assert, fresh, join, mkdirSync, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

const dir = fixture('synth-creator');
const TOOL = join(dir, '.claude/tools/can-open.mjs');
const at = (file: string, seconds: number): void => utimesSync(file, seconds, seconds);

/** A project: a source, an asset, a Release binary holding the asset's bytes, built after the source. */
function tree(options: { stale?: boolean; leftover?: boolean; dropAsset?: boolean }) {
  const root = fresh('can-open-');
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'build/Release'), { recursive: true });
  writeFileSync(join(root, 'src/voice.cpp'), 'code');
  writeFileSync(join(root, 'knob.bin'), 'KNOB-BYTES-123');
  const binary = join(root, 'build/Release/Synth');
  writeFileSync(binary, `head ${options.dropAsset ? '' : 'KNOB-BYTES-123'} tail MARK-7`);
  at(join(root, 'src/voice.cpp'), 1000);
  at(binary, options.stale ? 500 : 2000);
  if (options.leftover) {
    mkdirSync(join(root, 'build/RelWithDebInfo'), { recursive: true });
    writeFileSync(join(root, 'build/RelWithDebInfo/Synth'), 'old');
  }
  return { root, binary };
}
const check = (t: { root: string; binary: string }, ...more: string[]) =>
  spawnSync('node', [TOOL, join(t.root, 'build'), t.binary, '--source', join(t.root, 'src'), '--asset', join(t.root, 'knob.bin'), '--marker', 'MARK-7', ...more], { encoding: 'utf8' });

test('a fresh binary that holds its asset and marker passes, and the report names the file and its build time', () => {
  const t = tree({});
  const done = check(t);
  assert.equal(done.status, 0, done.stdout);
  assert.ok(done.stdout.includes(`launched: ${t.binary}`) && /built: 1970-01-01T00:33:20/.test(done.stdout));
});

test('a binary older than a changed source is named stale', () => {
  const done = check(tree({ stale: true }));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /stale: .*Synth/);
});

test('a RelWithDebInfo folder left beside Release is named', () => {
  const done = check(tree({ leftover: true }));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /RelWithDebInfo sits beside Release and sorts first/);
});

test('an asset whose bytes are not in the executable is named', () => {
  const done = check(tree({ dropAsset: true }));
  assert.equal(done.status, 1);
  assert.match(done.stdout, /asset not inside the launched file: .*knob\.bin/);
});

test('a missing marker is named, and a command without a launched file says how to use it', () => {
  const t = tree({});
  assert.match(check(t, '--marker', 'NOT-THERE').stdout, /marker not inside the launched file: "NOT-THERE"/);
  assert.equal(spawnSync('node', [TOOL], { encoding: 'utf8' }).status, 2);
});

test('a mistyped --source folder is a wrong use (exit 2), not a source that is never stale', () => {
  const t = tree({});
  const done = spawnSync('node', [TOOL, join(t.root, 'build'), t.binary, '--source', join(t.root, 'scr')], { encoding: 'utf8' });
  assert.equal(done.status, 2, done.stdout);
  assert.match(done.stderr, /--source.*scr/);
});
