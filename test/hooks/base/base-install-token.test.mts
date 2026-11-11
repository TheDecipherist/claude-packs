// WB-3: doctor finds a token in any repo's .git/config and never prints it (split from base-install.test.mts so no file sums over a minute).
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { git } from '../../fixtures/installs.mts';
import { assert, cli, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('WB-3: doctor finds a token in any repo\'s .git/config and never prints it', () => {
  const dir = fixture('audio-core');
  try {
    git(dir, 'init', '-q');
    const doctor = () => cli(dir, 'doctor');
    assert.doesNotMatch(doctor().stdout, /PROBLEM.*token/i); // 0.9.0: doctor prints the making hook's model-token cost, never a git token
    git(dir, 'remote', 'add', 'origin', 'https://github.com/a/b.git');
    git(dir, 'config', 'branch.main.remote', 'https://x-access-token:ghp_SECRET1@github.com/a/b.git');
    let r = doctor();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /PROBLEM: .*\.git\/config.*token/);
    assert.doesNotMatch(r.stdout, /SECRET1/);
    git(dir, 'config', '--unset', 'branch.main.remote');
    put(join(dir, 'build/_deps/juce-src/x'), '');
    git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
    git(join(dir, 'build/_deps/juce-src'), 'remote', 'add', 'origin', 'https://u:SECRET2@example.com/j.git');
    r = doctor();
    assert.match(r.stdout, /PROBLEM: build\/_deps\/juce-src\/\.git\/config.*token/);
    assert.doesNotMatch(r.stdout, /SECRET2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
