// The stored-text pack's install, with no hook of its own: the presets and the full-stack configuration bring it, and its rule reaches markup.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { lockOf } from '../../fixtures/installs.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

test('the UI presets and the full-stack configuration bring the pack; the rule reaches markup', () => {
  assert.ok(lockOf(extraFixture('node-ui', ['node-ui'])).packs?.includes('stored-text'), 'node-ui');
  assert.ok(lockOf(fixture('next-app')).packs?.includes('stored-text'), 'next-app');
  const dir = fixture('full-stack');
  assert.match(readFileSync(join(dir, '.claude/rules/stored-text-renders-once.md'), 'utf8'), /\*\*\/\*\.tsx/);
});
