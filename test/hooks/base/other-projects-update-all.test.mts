// update-all (split from other-projects.test.mts so no file sums over a minute).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { CLI, assert, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { stellixLike } from './other-projects-rig.mts';

test('update-all updates every project that has claude-packs and skips the rest', () => {
  const root = scratchDir('cpo-');
  const a = stellixLike();
  const b = fixture('audio-core');
  mkdirSync(join(root, 'notes'));
  const out = execFileSync('node', [CLI, 'update-all', a, b, join(root, 'notes')], { encoding: 'utf8' });
  assert.match(out, new RegExp(`== .*${basename(a)}[\\s\\S]*OK: base, audio-core, gpu-painter, stellix`));
  assert.match(out, new RegExp(`== .*${basename(b)}[\\s\\S]*OK: base, audio-core`));
  assert.doesNotMatch(out, /notes/);
});
