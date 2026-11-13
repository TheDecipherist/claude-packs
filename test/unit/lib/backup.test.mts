// lib/backup.mts: the copy before an install, the last five kept, and the .gitignore lines appended once.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { backup, ensureGitignore, MAKER_DOCS } from '../../../lib/backup.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('backup copies the managed files that exist and names the folder it made', () => {
  const dir = scratchDir('backup-');
  put(join(dir, 'CLAUDE.md'), 'mine');
  put(join(dir, '.claude/layout.json'), '{}');
  const rel = backup(dir);
  assert.equal(readText(join(dir, rel, 'CLAUDE.md')), 'mine');
  assert.equal(readText(join(dir, rel, '.claude/layout.json')), '{}');
  assert.equal(existsSync(join(dir, rel, '.claude/settings.json')), false, 'a file the project lacks is not invented');
});

test('backup keeps the last five and removes the older ones', () => {
  const dir = scratchDir('backup-keep-');
  const root = join(dir, '.claude', '.claude-packs-backup');
  for (let i = 1; i <= 7; i += 1) put(join(root, `2000-01-0${i}`, 'x'), 'old');
  backup(dir);
  const left = readdirSync(root);
  assert.equal(left.length, 5);
  assert.deepEqual(left, ['2000-01-03', '2000-01-04', '2000-01-05', '2000-01-06', '2000-01-07'], 'the oldest two went first');
});

test('ensureGitignore appends each line once, after a file with no final newline, and is stable when run again', () => {
  const dir = scratchDir('backup-ignore-');
  put(join(dir, '.gitignore'), 'dist');
  ensureGitignore(dir);
  const once = readText(join(dir, '.gitignore')) ?? '';
  assert.ok(once.startsWith('dist\n.claude/.claude-packs-backup/\n'), once);
  ensureGitignore(dir);
  assert.equal(readText(join(dir, '.gitignore')), once, 'a second run adds nothing');
});

test('ensureGitignore keeps the compiled checks file out of git, a checkout\'s own state (KWB-194)', () => {
  const dir = scratchDir('backup-ignore-compiled-');
  ensureGitignore(dir);
  assert.ok((readText(join(dir, '.gitignore')) ?? '').split('\n').includes('.claude/checks.compiled.json'));
});

// makers' PDFs (data sheets, family manuals) are never committed where they are read, and only there: a project shipping its own PDFs keeps them
test('ensureGitignore adds the makers\' PDF lines only when asked, once', () => {
  const plain = scratchDir('gitignore-plain-');
  ensureGitignore(plain);
  assert.doesNotMatch(readText(join(plain, '.gitignore')) ?? '', /\*\.pdf/);
  const synth = scratchDir('gitignore-maker-');
  ensureGitignore(synth, MAKER_DOCS);
  ensureGitignore(synth, MAKER_DOCS);
  const text = readText(join(synth, '.gitignore')) ?? '';
  assert.equal(text.split('\n').filter((l) => l === '*.pdf').length, 1);
  assert.ok(text.split('\n').includes('*.PDF'));
});
