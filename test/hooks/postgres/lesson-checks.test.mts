// The postgres pack's lesson checks, fired through the base lesson-checks hook in a copy of an install with the pack (1.1.0). Every
// check was measured on 5,653 real .sql files and 5,520 source files; the cases here are what that reading taught.
import { assert, cli, existsSync, join, lessonWrite, test } from '../../kit-cli.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { extraFixture } from '../hook-rig.mts';

const installed = (): string => extraFixture('postgres', ['postgres']);
const sql = (dir: string, text: string): number | null => lessonWrite(dir, 'db/migrations/002_change.sql', text).status;

test('the checks that need a live table stay off until the project chooses them', () => {
  const dir = installed();
  for (const id of ['pg-index-concurrently', 'pg-fk-not-valid', 'pg-timestamptz']) assert.ok(!existsSync(join(dir, `.claude/checks/${id}.json`)), id);
  assert.equal(sql(dir, 'CREATE INDEX i ON orders (a);\n'), 0);
  withLayout(dir, { enable: ['checks/pg-index-concurrently.json'] });
  const updated = cli(dir, 'update');
  assert.equal(updated.status, 0, updated.stdout + updated.stderr);
  assert.equal(sql(dir, 'CREATE INDEX i ON orders (a);\n'), 2);
  assert.equal(sql(dir, 'CREATE TABLE orders (a int);\nCREATE INDEX i ON orders (a);\n'), 0, 'a table made in the same file holds no rows');
  assert.equal(sql(dir, 'CREATE INDEX CONCURRENTLY i ON orders (a);\n'), 0);
  assert.equal(sql(dir, 'CREATE INDEX i ON orders (a); -- pg: allow a table of ten rows\n'), 0);
});

test('a default is refused only where it rewrites the table', () => {
  const dir = installed();
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN token uuid DEFAULT gen_random_uuid();\n'), 2);
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN created_at timestamptz DEFAULT now();\n'), 0, 'now() is not volatile');
  assert.equal(sql(dir, "ALTER TABLE t ADD COLUMN state text DEFAULT 'new';\n"), 0, 'a constant is instant since PostgreSQL 11');
});

test('a required column needs a default, wherever the default sits, and a new table is exempt', () => {
  const dir = installed();
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN owner_id bigint NOT NULL;\n'), 2);
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN owner_id bigint NOT NULL DEFAULT 0;\n'), 0);
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN owner_id bigint DEFAULT 0 NOT NULL;\n'), 0);
  assert.equal(sql(dir, 'ALTER TABLE t ADD COLUMN n bigint GENERATED ALWAYS AS IDENTITY NOT NULL;\n'), 0);
  assert.equal(sql(dir, 'ALTER TABLE t ADD CONSTRAINT c CHECK (a IS NOT NULL);\n'), 0);
  assert.equal(sql(dir, 'CREATE TABLE t (id int);\nALTER TABLE t ADD COLUMN owner_id bigint NOT NULL;\n'), 0);
});

test('money, NULL traps and CONCURRENTLY in a transaction are refused, and a comment is not code', () => {
  const dir = installed();
  assert.equal(sql(dir, 'CREATE TABLE t (price money);\n'), 2);
  assert.equal(sql(dir, 'CREATE TABLE t (\n  unit_price double precision\n);\n'), 2);
  assert.equal(sql(dir, 'CREATE TABLE t (\n  lat double precision\n);\n'), 0, 'not every float is money');
  assert.equal(sql(dir, 'DELETE FROM a WHERE id NOT IN (SELECT a_id FROM b);\n'), 2);
  assert.equal(sql(dir, "DELETE FROM a WHERE kind NOT IN ('x', 'y');\n"), 0, 'a constant list is fine');
  assert.equal(sql(dir, '-- DELETE FROM a WHERE id NOT IN (SELECT a_id FROM b);\n'), 0);
  assert.equal(sql(dir, 'BEGIN;\nCREATE INDEX CONCURRENTLY i ON t (a);\nCOMMIT;\n'), 2);
  assert.equal(sql(dir, 'BEGIN;\nUPDATE t SET a = 1;\nCOMMIT;\nCREATE INDEX CONCURRENTLY i ON t (a);\n'), 0);
});

test('a value in SQL text is refused in each language; a bound value, a tag and a table name are not', () => {
  const dir = installed();
  const code = (rel: string, text: string): number | null => lessonWrite(dir, rel, text).status;
  assert.equal(code('src/a.ts', "await db.query(`SELECT * FROM users WHERE email = '${email}'`);\n"), 2);
  assert.equal(code('src/b.py', 'cur.execute(f"SELECT * FROM users WHERE id = {user_id}")\n'), 2);
  assert.equal(code('src/c.go', 'db.Query(fmt.Sprintf("SELECT * FROM users WHERE name = \'%s\'", name))\n'), 2);
  assert.equal(code('src/d.rs', 'sqlx::query(&format!("SELECT * FROM users WHERE id = {id}"));\n'), 2);
  assert.equal(code('src/e.ts', 'await pool.query("SELECT * FROM t WHERE id = $1", [id]);\n'), 0);
  assert.equal(code('src/f.ts', 'await sql`SELECT * FROM t WHERE id = ${id}`;\n'), 0);
  assert.equal(code('src/g.ts', 'await prisma.$queryRaw`SELECT 1 WHERE a = ${b}`;\n'), 0);
  assert.equal(code('src/h.py', 'cur.execute(f"SELECT * FROM {TABLE} WHERE id = %s", (user_id,))\n'), 0);
  assert.equal(code('src/i.go', 'query := fmt.Sprintf("DELETE FROM %s WHERE id IN (%s)", table, marks)\n'), 0);
  assert.equal(code('src/j.ts', "const q = `SELECT 1 WHERE a = ${A}`; // pg: allow A is a constant\n"), 0);
});
