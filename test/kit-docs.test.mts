// The kit's own guide (typescript order W7 c): CLAUDE.md names the hook form the kit has now and only test files that exist, so a
// session that reads it is not sent to a file that was renamed or removed. The block `update` generates (between the claude-packs
// markers) comes from layout.json and is not read here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDir, readText } from '../packs/base/hooks/lib/files.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));

/** The hand-written part of a guide: everything before the generated block. */
export const handWritten = (text: string): string => text.split('<!-- claude-packs:start -->')[0] ?? '';

/** The old hook form (a `main` exported as `hook(text)`, `asHook`) a guide must not teach any more. */
export const oldHookForms = (text: string): string[] =>
  [/export const hook = main\b/, /\bhook\(text\)/, /(?<![A-Za-z])asHook\(/].filter((form) => form.test(text)).map(String);

/** The test paths a guide names (`test/...`) that are not in the tree; a pattern (`<`, `*`, a capitalised placeholder) is not a path. */
export function missingTests(root: string, text: string): string[] {
  const named = [...text.matchAll(/`(test\/[^`\s]+)`/g)].map((m) => m[1] ?? '');
  return named.filter((p) => !/[<*]|\/[A-Z]+[./]/.test(p)).filter((p) => readText(join(root, p)) === null && !isDir(join(root, p)));
}

test('CLAUDE.md teaches the hook form the kit has: hook(event, ctx) on runAsHook, in .mts', () => {
  const guide = handWritten(readText(join(KIT, 'CLAUDE.md')) ?? '');
  assert.deepEqual(oldHookForms(guide), []);
  assert.match(guide, /hook\(event, ctx\)/);
  assert.match(guide, /runAsHook/);
  assert.deepEqual(oldHookForms('export const hook = main;\nasHook(\'x\', main)\nhook(text)').length, 3);
});

test('every test file CLAUDE.md names is in the tree, and a stale name is found', () => {
  const guide = handWritten(readText(join(KIT, 'CLAUDE.md')) ?? '');
  assert.deepEqual(missingTests(KIT, guide), []);
  assert.deepEqual(missingTests(KIT, 'see `test/readme.test.mjs` and `test/counts.test.mts` and `test/hooks/PACK/HOOK.test.mts`'), ['test/readme.test.mjs']);
});

test('CLAUDE.md names the build, the check and the Node it is developed on', () => {
  const guide = handWritten(readText(join(KIT, 'CLAUDE.md')) ?? '');
  for (const word of ['npm run build', 'npm run check', 'Node 22.18', 'proxy/']) assert.ok(guide.includes(word), word);
});
