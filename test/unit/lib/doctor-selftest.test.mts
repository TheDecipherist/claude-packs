// doctor runs a hook's selftest when the hook has one, whichever way its tail is written (KWB-181).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hasSelftest } from '../../../lib/doctor.mjs';

test('a hook on runAsHook has a selftest, as a hook that names --selftest does; a file with neither has none (KWB-181)', () => {
  const emitted = readFileSync(fileURLToPath(new URL('../../../packs/base/hooks/no-find.mjs', import.meta.url)), 'utf8');
  assert.ok(!emitted.includes('--selftest') || emitted.includes('runAsHook('), 'no-find is on runAsHook');
  assert.equal(hasSelftest(emitted), true);
  assert.equal(hasSelftest("if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : 0);"), true);
  assert.equal(hasSelftest('export const hook = () => 0;\n'), false);
});
