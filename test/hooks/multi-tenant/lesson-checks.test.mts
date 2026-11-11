// The multi-tenant pack's checks on Go (admiral-fleet W2), fired through the base lesson-checks hook in a go project with the pack: each
// Go pair of the two tenant checks, the bad refused by that check, the good taken; the rule loads on .go files; and the hook's selftest
// proves every examples pair of a check and names the one that fails.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { selftest } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { assertTaken, holdsEachCaseIn, lintWrite, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['multi-tenant', 'src/routes/company.ts', "await deleteOne('companies', { slug: req.params.slug });\n", "await deleteOne('companies', { slug: req.params.slug, company_id: user.company_id });\n"],
]);

interface TenantCheck { examples?: Array<{ bad: string; good: string }> }
const checkOf = (dir: string, id: string): TenantCheck => parseJson<TenantCheck>(readFileSync(join(dir, '.claude/checks', `${id}.json`), 'utf8')) ?? {};

test('go: the tenant checks refuse their Go faults and take the fixes, and the tenant rule loads on .go', () => {
  const dir = fixture('go+multi-tenant');
  for (const id of ['tenant-filter-from-url', 'role-sees-all-tenants']) {
    const examples = checkOf(dir, id).examples ?? [];
    assert.ok(examples.length, `${id}: a Go pair`);
    for (const [i, { bad, good }] of examples.entries()) {
      const r = lintWrite(dir, `internal/api/bad${i}.go`, `package api\n\n${bad}\n`);
      assert.ok(r.status === 2 && r.stderr.includes(id), `${id} examples[${i}]: the bad refused (${r.status})`);
      assertTaken(dir, `internal/api/good${i}.go`, `package api\n\n${good}\n`);
    }
  }
  assert.match(readFileSync(join(dir, '.claude/rules/no-role-crosses-a-tenant.md'), 'utf8'), /"\*\*\/\*\.go"/);
});

// A check's "examples" pairs are proved like its first (doctor runs the lesson-checks selftest): a Go bad the pattern misses is named.
test('the lesson-checks selftest proves every examples pair of a check, and names the one that fails', () => {
  const dir = fixture('go+multi-tenant');
  assert.equal(selftest(dir, 'lesson-checks.mjs').status, 0, 'as shipped');
  const check = checkOf(dir, 'tenant-filter-from-url');
  const second = check.examples?.[1];
  assert.ok(second, 'a second pair');
  second.bad = 'row := db.QueryRowContext(ctx, "SELECT name FROM sites WHERE tenant_id = $1", sess.TenantID)';   // planted: a bad the pattern misses
  put(join(dir, '.claude/checks/tenant-filter-from-url.json'), toJson(check, { pretty: true }));
  const s = selftest(dir, 'lesson-checks.mjs');
  assert.equal(s.status, 1);
  assert.match(s.stderr, /tenant-filter-from-url\.json: does not catch its "bad" example \(examples\[1\]\)/);
});
