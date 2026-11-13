// KWB-219: a test file that says `// runs alone:` on one of its first lines is started after every other file has ended, one at a time.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { runTests, splitAlone } from '../../../scripts/run-tests.mts';

const KIT = fileURLToPath(new URL('../../..', import.meta.url));

/** A test file that records when it starts and ends in `log` and holds for `ms`. */
const recorder = (name: string, log: string, ms: number, header = ''): string => `${header}import { appendFileSync } from 'node:fs';
import { test } from 'node:test';
test('${name}', async () => {
  appendFileSync(${toJson(log)}, '${name} start ' + Date.now() + '\\n');
  await new Promise((done) => setTimeout(done, ${ms}));
  appendFileSync(${toJson(log)}, '${name} end ' + Date.now() + '\\n');
});
`;

test('a file with the mark in its header is split off; a mark further down, or without a reason, is not', () => {
  const dir = scratchDir('run-tests-');
  put(join(dir, 'a.test.mts'), '// a header\n// runs alone: it measures a time\nimport "x";\n');
  put(join(dir, 'b.test.mts'), '// a header\nimport "x";\n');
  put(join(dir, 'c.test.mts'), '// runs alone:\nimport "x";\n');
  put(join(dir, 'd.test.mts'), `${'// filler\n'.repeat(8)}// runs alone: too far down\n`);
  assert.deepEqual(splitAlone(['a.test.mts', 'b.test.mts', 'c.test.mts', 'd.test.mts'], dir), { together: ['b.test.mts', 'c.test.mts', 'd.test.mts'], alone: ['a.test.mts'] });
});

test('the marked file starts only after every other file has ended, and a red alone-file makes the run red', async () => {
  const dir = scratchDir('run-tests-run-');
  const log = join(dir, 'log');
  put(log, '');
  const names = ['one', 'two', 'solo'];
  put(join(dir, 'one.test.mts'), recorder('one', log, 600));
  put(join(dir, 'two.test.mts'), recorder('two', log, 600));
  put(join(dir, 'solo.test.mts'), recorder('solo', log, 100, '// runs alone: planted\n'));
  const code = await runTests(names.map((n) => join(dir, `${n}.test.mts`)), 2, KIT, { ...process.env });
  assert.equal(code, 0);
  const at = Object.fromEntries(readFileSync(log, 'utf8').trim().split('\n').map((l) => { const [n, w, t] = l.split(' '); return [`${n} ${w}`, Number(t)]; }));
  assert.ok((at['solo start'] ?? 0) >= Math.max(at['one end'] ?? Infinity, at['two end'] ?? Infinity), `solo started beside the others: ${toJson(at)}`);
  put(join(dir, 'red.test.mts'), '// runs alone: a planted red\nimport assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("red", () => assert.equal(1, 2));\n');
  assert.notEqual(await runTests([join(dir, 'one.test.mts'), join(dir, 'red.test.mts')], 2, KIT, { ...process.env }), 0);
});
