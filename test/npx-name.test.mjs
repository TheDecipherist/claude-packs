// KWB-28: in a project with no node_modules, `npx claude-packs doctor` downloaded and ran someone else's public npm package
// (claude-packs@1.0.0: "Unknown command: doctor"). Everything the kit prints or installs names the kit itself: the scoped
// name with --no-install (`npx --no-install @thedecipherist/claude-packs ...`), which never downloads, or the installed path.
// CHANGELOG.md and workflow-bugs.md are the record of what was, and are left as they were written.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fresh } from './kit-cli.mjs';

const KIT = fileURLToPath(new URL('..', import.meta.url));
// npx (any flags) then the bare name: never the scoped one
const BARE = /\bnpx(?:\s+-[-\w]+)*\s+claude-packs\b/;
// test/fixtures: other projects' files as they were (0.10.0, the no-op proof's Sub37 copy names the bare form), a record like the CHANGELOG
// evidence: a work order's recorded run output, which quotes this test's own title whenever a kept gate ran it (KWB-99)
const SKIP = new Set(['node_modules', '.git', 'worktrees', '.claude-packs-backup', 'CHANGELOG.md', 'workflow-bugs.md', 'npx-name.test.mjs', 'fixtures', 'evidence']);

export function bareNpx(root) {
  const hits = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      if (SKIP.has(f)) continue;
      const p = join(d, f);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(mjs|js|cjs|mts|cts|ts|py|sh|md|json|txt)$/.test(f)) continue;   // TypeScript sources too (W2.7 gate 8)
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => { if (BARE.test(line) && !line.includes('BARE')) hits.push(`${relative(root, p)}:${i + 1}`); });
    }
  };
  walk(root);
  return hits;
}

test('nothing in the kit names the bare `npx claude-packs` (it resolves to someone else\'s package)', () => {
  assert.deepEqual(bareNpx(KIT), [], 'use `npx --no-install @thedecipherist/claude-packs ...` or the installed path');
});

test('the bare-name reader finds a planted line', () => {
  assert.ok(BARE.test('run `npx claude-packs doctor`') && BARE.test('npx -y claude-packs update'));
  assert.ok(!BARE.test('npx --no-install @thedecipherist/claude-packs doctor'));
});

test('recorded run output under evidence/ is left out, and the same line anywhere else is found (KWB-99)', () => {
  const root = fresh('npx-evidence-');
  for (const f of ['build/evidence/W1/gate.txt', 'docs/how.md']) { mkdirSync(join(root, dirname(f)), { recursive: true }); writeFileSync(join(root, f), 'run `npx claude-packs doctor`\n'); }
  assert.deepEqual(bareNpx(root), ['docs/how.md:1']);
});
