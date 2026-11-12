// 1.1.0: the postgres pack. No hook owns these: what suggest finds, and what init --auto installs for a project that uses Postgres.
// The pack's checks fired through the hook are in lesson-checks.test.mts, its wipe guard in db-wipe-guard.test.mts.
import { assert, cli, existsSync, fresh, initAuto, join, mkdirSync, registeredHooks, test, writeFileSync } from '../../kit-cli.mts';

test('suggest finds Postgres in a dependency, and init --auto installs the pack and its hook', () => {
  const dir = fresh('pg-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: { pg: '8.0.0' } }));
  writeFileSync(join(dir, 'src/a.ts'), 'export const a = 1;\n');
  assert.match(cli(dir, 'suggest').stdout, /postgres +dependency: pg/);
  initAuto(dir);
  assert.ok(existsSync(join(dir, '.claude/rules/postgres-values-are-bound.md')));
  assert.ok(registeredHooks(dir).includes('db-wipe-guard'), 'the wipe guard is registered and run');
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
});

test('suggest reads Postgres from a project in any language, and a tool that speaks several databases says nothing alone', () => {
  const rows: readonly (readonly [file: string, text: string, source: string])[] = [
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
