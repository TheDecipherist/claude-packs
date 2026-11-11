// lib/zip.mts: a stored zip that every unzip reads (the planner's upload of a skill folder).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32 } from 'node:zlib';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { zipOf } from '../../../lib/zip.mts';

test('the end record counts the entries, and each local header holds the name, the size and the crc of its text', () => {
  const files = { 'a/SKILL.md': 'one\n', 'b.txt': 'two: é\n' };
  const zip = zipOf(files);
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 2);
  let at = 0;
  for (const [path, text] of Object.entries(files)) {
    assert.equal(zip.readUInt32LE(at), 0x04034b50);
    const size = zip.readUInt32LE(at + 22);
    const nameLength = zip.readUInt16LE(at + 26);
    assert.equal(zip.subarray(at + 30, at + 30 + nameLength).toString('utf8'), path);
    const data = zip.subarray(at + 30 + nameLength, at + 30 + nameLength + size);
    assert.equal(data.toString('utf8'), text);
    assert.equal(zip.readUInt32LE(at + 14), crc32(data));
    at += 30 + nameLength + size;
  }
});

test('the system unzip reads it, and a planted flipped byte is caught by its own test', () => {
  const dir = scratchDir('zip-');
  put(join(dir, 'x.zip'), zipOf({ 'skill/SKILL.md': 'hello\n' }));
  assert.match(execFileSync('unzip', ['-p', join(dir, 'x.zip'), 'skill/SKILL.md'], { encoding: 'utf8' }), /^hello\n$/);
  const bad = zipOf({ 'skill/SKILL.md': 'hello\n' });
  bad[30 + 'skill/SKILL.md'.length] = 0x58;
  put(join(dir, 'bad.zip'), bad);
  assert.throws(() => execFileSync('unzip', ['-tq', join(dir, 'bad.zip')], { stdio: 'pipe' }));
});

test('no files is an empty zip with an end record only', () => {
  const zip = zipOf({});
  assert.equal(zip.length, 22);
  assert.equal(zip.readUInt16LE(10), 0);
});
