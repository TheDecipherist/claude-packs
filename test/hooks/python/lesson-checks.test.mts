// The python and shell packs' checks, fired through the base lesson-checks hook (0.25.0).
import assert from 'node:assert/strict';
import test from 'node:test';
import { extraFixture } from '../hook-rig.mts';
import { lintWrite } from '../lesson-cases.mts';

test('the python and shell packs refuse what they say they refuse', () => {
  // `init python shell` names the two packs; the 'python+shell' fixture is the python configuration with shell, which takes no python checks
  const dir = extraFixture('python-shell', ['python', 'shell']);
  const status = (rel: string, content: string): number | null => lintWrite(dir, rel, content).status;
  assert.equal(status('src/a.py', 'try:\n    run()\nexcept:\n    log()\n'), 2);
  assert.equal(status('src/b.py', 'try:\n    run()\nexcept ValueError:\n    log()\n'), 0);
  assert.equal(status('src/a.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=`date`\n'), 2);
  assert.equal(status('src/b.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=$(date)\n'), 0);
});
