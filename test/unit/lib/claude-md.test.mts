// lib/claude-md.mts: the block between the markers is the kit's; everything outside is the user's.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { writeClaudeMd } from '../../../lib/claude-md.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const layout: Layout = {
  folders: { src: { path: 'src', purpose: 'code' }, docs: { path: 'docs', purpose: 'notes' }, tests: { path: 'test', purpose: 'tests' } },
  concepts: {},
  kinds: { t: { what: 'the tests', in: 'tests' } },
  commands: { test: 'npm test' },
};
const preamble = { always: ['Ask first.'], never: ['Skip a hook.'] };

test('a project with no CLAUDE.md gets the block: kinds, other folders, preamble, commands, packs', () => {
  const dir = scratchDir('claude-md-new-');
  writeClaudeMd(dir, layout, ['base', 'cpp'], preamble);
  const text = readText(join(dir, 'CLAUDE.md')) ?? '';
  assert.match(text, /^<!-- claude-packs:start -->/);
  assert.match(text, /- the tests → `test\/`/);
  assert.match(text, /- `docs\/`: notes/);
  assert.ok(!text.includes('`src/`'), 'src is never listed');
  assert.match(text, /- Ask first\./);
  assert.match(text, /Never do:\n- Skip a hook\./);
  assert.match(text, /- test: `npm test`/);
  assert.match(text, /Installed packs: base, cpp\.\n<!-- claude-packs:end -->\n$/);
});

test('a second write replaces the block and keeps the user\'s text before and after it', () => {
  const dir = scratchDir('claude-md-keep-');
  put(join(dir, 'CLAUDE.md'), 'mine before\n');
  writeClaudeMd(dir, layout, ['base'], preamble);
  const once = readText(join(dir, 'CLAUDE.md')) ?? '';
  put(join(dir, 'CLAUDE.md'), `${once.trimEnd()}\n\nmine after\n`);
  writeClaudeMd(dir, layout, ['base', 'go'], preamble);
  const text = readText(join(dir, 'CLAUDE.md')) ?? '';
  assert.ok(text.startsWith('mine before\n\n<!-- claude-packs:start -->'));
  assert.ok(text.endsWith('<!-- claude-packs:end -->\n\nmine after\n'));
  assert.equal(text.split('claude-packs:start').length, 2, 'one block');
  assert.match(text, /Installed packs: base, go\./);
});

test('a project with no package.json is told how to run the kit', () => {
  const dir = scratchDir('claude-md-nopkg-');
  writeClaudeMd(dir, layout, ['base'], preamble);
  assert.match(readText(join(dir, 'CLAUDE.md')) ?? '', /This project has no package\.json/);
  put(join(dir, 'package.json'), '{}');
  writeClaudeMd(dir, layout, ['base'], preamble);
  assert.ok(!(readText(join(dir, 'CLAUDE.md')) ?? '').includes('no package.json'));
});
