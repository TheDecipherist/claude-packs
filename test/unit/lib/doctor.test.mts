// lib/doctor.mts: what doctor says of an install, with the selftest mode and the pool size taken from the env it is given.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { doctor } from '../../../lib/doctor.mts';

const CLI = fileURLToPath(new URL('../../../bin/claude-packs.mjs', import.meta.url));
const GATE = { ...process.env, CLAUDE_PACKS_SELFTESTS: 'gate' };

function installed(): string {
  const dir = scratchDir('doctor-unit-');
  execFileSync('node', [CLI, 'init', 'base', '--dir', dir], { encoding: 'utf8', env: GATE, stdio: 'pipe' });
  return dir;
}

test('an install under the gate is OK, takes its selftests as proved, and notes a hook with no --selftest', async () => {
  const dir = installed();
  put(join(dir, '.claude/hooks/zz-plain.mjs'), 'export const hook = () => 0;\n');
  const said: string[] = [];
  const code = await doctor(dir, (l) => said.push(l), { env: GATE });
  const text = said.join('\n');
  assert.match(text, /selftests: \d+ of \d+ taken as proved by the gate/);
  assert.match(text, /note: zz-plain\.mjs has no --selftest/);
  assert.equal(code, 1, 'the unregistered hook is the one problem');
  assert.deepEqual(said.filter((l) => l.includes('PROBLEM')), ['  PROBLEM: zz-plain.mjs is in .claude/hooks but no settings entry runs it, so it refuses nothing']);
  assert.equal((await doctor(installed(), () => undefined, { env: GATE })), 0, 'a clean install is OK');
});

test('a layout folder that is gone is a problem, and the exit code is 1 (planted fault)', async () => {
  const dir = installed();
  rmSync(join(dir, 'docs'), { recursive: true, force: true });
  const said: string[] = [];
  const code = await doctor(dir, (l) => said.push(l), { env: GATE });
  assert.equal(code, 1);
  assert.ok(said.some((l) => /PROBLEM: layout folder missing: docs\//.test(l)), said.join('\n'));
});

test('the env decides which selftests run: a hook that hangs is timed out under the S the env names, and a hook with a selftest passes', async () => {
  const dir = installed();
  put(join(dir, '.claude/hooks/zz-hangs.mjs'), '// --selftest\nsetTimeout(() => {}, 60000);\n');
  put(join(dir, '.claude/hooks/zz-fine.mjs'), "// --selftest\nprocess.stdout.write('ok\\n');\n");
  const only = scratchDir('doctor-cache-');
  const env = { ...process.env, CLAUDE_PACKS_SELFTESTS: 'fresh-only', CLAUDE_PACKS_SELFTEST_S: '2', CLAUDE_PACKS_SELFTEST_CACHE: only };
  const said: string[] = [];
  await doctor(dir, (l) => said.push(l), { env });
  const text = said.join('\n');
  assert.match(text, /zz-hangs\.mjs's selftest timed out after 2 s/);
  assert.doesNotMatch(text, /zz-fine\.mjs fails its selftest/);
});
