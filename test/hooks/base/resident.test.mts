// resident: the resident runner. Its selftest starts real daemons in scratch projects and plants every case of the order's list that
// does not need the Go client (the 10,000-event memory case is test/integration/resident-load.test.mts). Its parts, one by one, are
// in resident-parts.test.mts.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { assert, KIT, test } from '../../kit-cli.mts';

const DAEMON = join(KIT, 'packs/base/hooks/resident.mjs');

test('the daemon\'s selftest passes: every planted case answered right', () => {
  const r = spawnSync('node', [DAEMON, '--selftest'], { encoding: 'utf8', timeout: 120_000 });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout + r.stderr, /resident selftest: OK \(\d+ cases\)/);
});

test('with no argument it says how it is started and exits 2: it is not a hook any settings entry runs', () => {
  const r = spawnSync('node', [DAEMON], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--serve <project>/);
});
