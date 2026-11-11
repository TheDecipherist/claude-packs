// KWB-163: a file's own path is fileURLToPath(import.meta.url), never new URL(...).pathname: on Windows the pathname is
// `/C:/Users/...`, a path no tool can open, so every selftest that took its hook's path that way failed there (doctor red,
// `workorder check` refusing every run). Every shipped and tooling source is read, so no file brings the form back.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const ROOTS = ['packs', 'lib', 'bin', 'global', 'scripts', 'prompts'];
const FORM = /new URL\([^)]*import\.meta\.url\)\.pathname/;

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sources(path);
    return /\.(mjs|js|cjs)$/.test(e.name) ? [path] : [];
  });
}

test('no source takes its own path from a URL\'s pathname (Windows reads it as /C:/...)', () => {
  const found = ROOTS.flatMap((r) => sources(join(KIT, r))).filter((f) => FORM.test(readFileSync(f, 'utf8'))).map((f) => relative(KIT, f));
  assert.deepEqual(found, []);
});
