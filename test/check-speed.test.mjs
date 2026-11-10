// KWB-43: a lesson check runs on every edit and over every file of a scan. A pattern that backtracks across a file stops both, so every check
// must get through a large, realistic file within a budget.
import { KIT, assert, join, readdirSync, readFileSync, test } from './kit-cli.mjs';

const BUDGET_MS = 1500;
const LINE = "  const value = await thing.call(other, 'text', { key: 1 }); // a note\n  if (value === other) { import('x'); }\n  for (const a of list) total += a.size;\n";
const BIG = `'use client';\nimport a from 'b';\n${LINE.repeat(1200)}`;
const NOT_CLIENT = LINE.repeat(1200);
// admiral-fleet W2: the tenant checks read Go too, so a large Go file of handlers and queries runs here as well
const GO_LINE = '\tid := r.PathValue("id") // a note\n\trow := db.QueryRowContext(ctx, "SELECT name FROM sites WHERE id = $1 AND tenant_id = $2", id, sess.TenantID)\n' +
  '\tif user.Role == RoleOwner { log.Printf("owner %s", id) }\n\tres, err := coll.FindOne(ctx, bson.M{"company_id": sess.CompanyID, "slug": r.PathValue("slug")})\n';
const GO_BIG = `package api\n\nimport "net/http"\n\nfunc handle(w http.ResponseWriter, r *http.Request) {\n${GO_LINE.repeat(600)}}\n`;

const checks = readdirSync(join(KIT, 'packs')).flatMap((pack) => {
  try { return readdirSync(join(KIT, 'packs', pack, 'checks')).map((f) => JSON.parse(readFileSync(join(KIT, 'packs', pack, 'checks', f), 'utf8'))); } catch { return []; }
});

test('every lesson check gets through a large file within its budget', () => {
  const slow = [];
  for (const c of checks.filter((x) => x.pattern)) {
    const re = new RegExp(c.pattern, `${(c.flags ?? '').replace('g', '')}g`);
    for (const text of [BIG, NOT_CLIENT, GO_BIG]) {
      const start = performance.now();
      for (const m of text.matchAll(re)) if (m.index < 0) break;
      const ms = performance.now() - start;
      if (ms > BUDGET_MS) slow.push(`${c.id}: ${Math.round(ms)} ms`);
    }
  }
  assert.deepEqual(slow, []);
});
