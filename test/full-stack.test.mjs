// 0.10.0 (Tim, STEP 3 item 4): the full-stack configuration. Fastify and Next.js only (stack-guard), Zod 4 schemas only in the
// schemas folder (schemas-only), rules per folder (thin routes, handlers, one database gateway with chain keys first, one error
// contract, env.ts shapes, health and logs, multistage Docker, inject() tests), its folder template, and doctor's coverage
// counting TypeScript as source (KWB-32).
import { assert, cli, execFileSync, existsSync, fresh, hookStatus as hook, join, mkdirSync, readFileSync, renameSync, selftest, test, writeFileSync } from './kit-cli.mjs';


function fullStack() {
  const dir = fresh('fs-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const r = cli(dir, 'init', '--config', 'full-stack');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return dir;
}

test('init --config full-stack: its folders, its laws and no synth law', () => {
  const dir = fullStack();
  for (const f of ['packages/core/src/schemas', 'api/src/routes', 'api/src/handlers', 'api/src/adapters', 'api/src/auth', 'channel']) assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, 'src')), 'no synth src/ folder');
  const rule = readFileSync(join(dir, '.claude/rules/routes-are-thin.md'), 'utf8');
  assert.match(rule, /"api\/src\/routes\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/zod-4-schemas.md'), 'utf8'), /"packages\/core\/src\/schemas\/\*\*"/);
  for (const r of ['math-domain-guards.md', 'debug-by-measurement.md']) assert.ok(!existsSync(join(dir, '.claude/rules', r)), r);
  for (const h of ['build-guard.mjs', 'realtime-guard.mjs', 'time-guard.mjs']) assert.ok(!existsSync(join(dir, '.claude/hooks', h)), h);
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /a Zod schema outside the schemas folder/);
  assert.doesNotMatch(md, /drawing code/);
  assert.match(md, /Installed packs: base, stored-text, ui-craft\./);
  for (const h of ['stack-guard.mjs', 'schemas-only.mjs', 'secrets-guard.mjs', 'untrusted-boundary.mjs']) {
    const s = selftest(dir, h);
    assert.equal(s.status, 0, `${h}: ${s.stdout}${s.stderr}`);
  }
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.match(strict.stdout, /configuration: full-stack/);
});

test('the full-stack hooks refuse express, a schema in a route and a .env git does not ignore, in the installed project', () => {
  const dir = fullStack();
  const run = (name, rel, content) => hook(dir, name, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
  assert.equal(run('stack-guard.mjs', 'api/package.json', '{"dependencies":{"express":"5.1.0"}}\n'), 2);
  assert.equal(run('stack-guard.mjs', 'api/package.json', '{"dependencies":{"fastify":"5.6.1"}}\n'), 0);
  assert.equal(run('schemas-only.mjs', 'api/src/routes/user.ts', 'const B = z.object({});\n'), 2);
  assert.equal(run('schemas-only.mjs', 'packages/core/src/schemas/user.ts', 'export const B = z.object({});\n'), 0);
  assert.equal(run('placement-law.mjs', 'api/src/handlers/user.ts', "import { MongoClient } from 'mongodb';\n"), 2, 'the driver only in the adapters');
  assert.equal(run('placement-law.mjs', 'api/src/adapters/db.ts', "import { MongoClient } from 'mongodb';\n"), 0);
  assert.equal(run('secrets-guard.mjs', '.env', 'A=1\n'), 2, 'a .env git does not ignore');
  assert.equal(run('schemas-only.mjs', 'api/src/routes/ok.ts', "import { User } from '../../../packages/core/src/schemas/user';\n"), 0);
});

test('doctor --strict counts TypeScript as source in a full-stack project (KWB-32)', () => {
  const dir = fullStack();
  mkdirSync(join(dir, 'stray'), { recursive: true });
  writeFileSync(join(dir, 'stray/util.ts'), 'export const x = 1;\n');
  const red = cli(dir, 'doctor', '--strict');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /1 source file\(s\) no rule covers .*stray\/util\.ts/);
  renameSync(join(dir, 'stray/util.ts'), join(dir, 'api/src/util.ts'));
  assert.doesNotMatch(cli(dir, 'doctor', '--strict').stdout, /no rule covers/, 'a file in the API folder is covered');
});
