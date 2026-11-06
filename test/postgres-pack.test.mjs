// 1.1.0: the postgres pack. Every check was measured on 5,653 real .sql files and 5,520 source files; the cases here are what that reading taught.
import { assert, cli, execFileSync, existsSync, fresh, hookRun, join, lessonWrite, mkdirSync, readFileSync, run, test, writeFileSync } from './kit-cli.mjs';

function project(deps = { pg: '8.0.0' }) {
  const dir = fresh('pg-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: deps }));
  writeFileSync(join(dir, 'src/a.ts'), 'export const a = 1;\n');
  return dir;
}
const installed = () => { const dir = project(); run(dir, 'init', '--auto'); return dir; };
const sql = (dir, text) => lessonWrite(dir, 'db/migrations/002_change.sql', text).status;

test('suggest finds Postgres in a dependency, and init --auto installs the pack and its hook', () => {
  const dir = project();
  assert.match(cli(dir, 'suggest').stdout, /postgres +dependency: pg/);
  run(dir, 'init', '--auto');
  assert.ok(existsSync(join(dir, '.claude/rules/postgres-values-are-bound.md')));
  assert.match(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), /db-wipe-guard/);
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
});

test('suggest reads Postgres from a project in any language, and a tool that speaks several databases says nothing alone', () => {
  const rows = [
    ['requirements.txt', 'psycopg2-binary==2.9\n', 'src/a.py'],
    ['go.mod', 'module a\nrequire github.com/jackc/pgx/v5 v5.0.0\n', 'src/a.go'],
    ['Cargo.toml', '[dependencies]\nsqlx = { version = "0.8", features = ["postgres"] }\n', 'src/lib.rs'],
    ['schema.prisma', 'datasource db {\n  provider = "postgresql"\n}\n', 'src/a.ts'],
    ['docker-compose.yml', 'services:\n  db:\n    image: postgres:17\n', 'src/a.ts'],
  ];
  for (const [file, text, source] of rows) {
    const dir = fresh('pgfind-');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, source), '\n');
    writeFileSync(join(dir, file), text);
    assert.match(cli(dir, 'suggest').stdout, /^ +postgres /m, file);
  }
  const mysql = fresh('pgnot-');
  mkdirSync(join(mysql, 'src'));
  writeFileSync(join(mysql, 'src/lib.rs'), '\n');
  writeFileSync(join(mysql, 'Cargo.toml'), '[dependencies]\nsqlx = { version = "0.8", features = ["mysql"] }\n');
  assert.doesNotMatch(cli(mysql, 'suggest').stdout, /^ +postgres /m);
});

test('the checks that need a live table stay off until the project chooses them', () => {
  const dir = installed();
  for (const id of ['pg-index-concurrently', 'pg-fk-not-valid', 'pg-timestamptz']) assert.ok(!existsSync(join(dir, `.claude/checks/${id}.json`)), id);
  assert.equal(sql(dir, 'CREATE INDEX i ON orders (a);\n'), 0);
  const file = join(dir, '.claude/layout.json');
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), enable: ['checks/pg-index-concurrently.json'] }));
  run(dir, 'update');
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
  const code = (rel, text) => lessonWrite(dir, rel, text).status;
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

test('a wipe is judged against the worktree it runs in, by that checkout\'s .env', () => {
  const dir = installed();
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@e.c', '-c', 'user.name=t', ...a], { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('add', 'package.json');
  git('commit', '-qm', 'one');
  git('worktree', 'add', '-q', '.claude/worktrees/w', '-b', 'w');
  const wt = join(dir, '.claude/worktrees/w');
  writeFileSync(join(dir, '.env'), 'DATABASE_URL=postgres://u@db.prod.example.com/app\n');
  writeFileSync(join(wt, '.env'), 'DATABASE_URL=postgres://u@localhost/app\n');
  const reset = (cwd) => hookRun(dir, 'db-wipe-guard.mjs', { tool_name: 'Bash', cwd, tool_input: { command: 'npx prisma migrate reset' } });
  assert.equal(reset(wt).status, 0);
  const refused = reset(dir);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /its target is db\.prod\.example\.com/);
});
