// 0.25.0: packs made from senior reviews of three real repos. The worst faults there had no check: one customer reading another's data, a guard that
// passed on an empty list, a password in a log. Each pack here installs alone, and refuses what it says it refuses.
import { assert, cli, existsSync, fresh, holdsEachCase, join, lessonWrite, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

const CASES = [
  ['http-api', 'src/routes/segments.ts', 'const s = await findSegmentById(id);\nreturn json(s);\n', 'const s = await findSegmentById(id, session.user.id);\nreturn json(s);\n'],
  ['http-api', 'src/app.ts', 'app.use(cors({ credentials: true }));\n', 'app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));\n'],
  ['react', 'src/Row.tsx', 'export const A = () => <button><Icon /></button>;\n', 'export const A = () => <button aria-label="Close"><Icon /></button>;\n'],
  ['multi-tenant', 'src/routes/company.ts', "await deleteOne('companies', { slug: req.params.slug });\n", "await deleteOne('companies', { slug: req.params.slug, company_id: user.company_id });\n"],
  ['websocket', 'src/ws.ts', 'streamManager.updateHeartbeat(msg.agent_id, msg.status);\n', 'streamManager.updateHeartbeat(conn.agentId, msg.status);\n'],
  ['host-agent', 'src/update.ts', 'if (expectedSha256 && actual !== expectedSha256) return fail();\n', 'if (!expectedSha256 || actual !== expectedSha256) return fail();\n'],
  ['go', 'src/a.go', 'package a\n_ = json.Unmarshal(raw, &rows)\n', 'package a\nif err := json.Unmarshal(raw, &rows); err != nil { return err }\n'],
  ['rust', 'src/a.rs', 'pub fn f(x: &str) -> u32 {\n    x.parse().unwrap()\n}\n', 'pub fn f(x: &str) -> Result<u32, E> {\n    Ok(x.parse()?)\n}\n'],
  ['postgres', 'db/1.sql', 'ALTER TABLE t ADD COLUMN a uuid DEFAULT gen_random_uuid();\n', 'ALTER TABLE t ADD COLUMN a timestamptz DEFAULT now();\n'],
  ['dynamic-data', 'src/save.ts', 'await col.updateOne({ _id: id }, { $set: req.body });\n', 'await write(entity, id, patch, { role, scope });\n'],
  ['dynamic-data', 'src/filter.ts', 'const f = new Function("return " + text)();\n', 'const f = FilterTree.parse(text);\n'],
  ['http-api', 'src/mount.ts', "app.use('/api/orders', router);\n", "app.use('/api/v1/orders', router);\n"],
  ['http-api', 'src/app/api/orders/route.ts', 'export async function GET(request) {\n  return list();\n}\n', 'export const dynamic = 1;\n'],
  ['http-api', 'src/ui/orders.ts', "const r = await fetch('/api/orders');\n", "const r = await fetch('/api/v1/orders');\n"],
  ['ci', '.github/workflows/test.yml', 'on: push\njobs:\n  t:\n    runs-on: x\n', 'on: push\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: x\n'],
];

holdsEachCase(CASES);

test('a check for one major version leaves a project on an older one alone', () => {
  const dir = fresh('rp-dep-');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { zod: '^3.22.0' } }));
  assert.equal(cli(dir, 'init', 'js-ts').status, 0);
  mkdirSync(join(dir, 'src'), { recursive: true });
  assert.equal(lessonWrite(dir, 'src/s.ts', 'const a = z.string().email();\n').status, 0);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { zod: '^4.1.0' } }));
  assert.equal(lessonWrite(dir, 'src/t.ts', 'const a = z.string().email();\n').status, 2);
});

test('a url inside a string is no comment, so what follows it is still read', async () => {
  const { blankCode } = await import('../packs/base/hooks/lib/cpp-scan.mjs');
  assert.match(blankCode("const u = 'http://x'; run();", true), /'http:\/\/x'; run\(\);/);
  assert.match(blankCode('const u = `https://x/${id}`; run();'), /run\(\);/);
  assert.doesNotMatch(blankCode('a(); // run();'), /run/);
});

test('a key under a custom prefix is a secret, and a private key file by its name', async () => {
  const { addedSecret, isSecretFile } = await import('../packs/base/hooks/secrets-guard.mjs');
  const key = ['zz', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4'].join('_');
  assert.ok(addedSecret('', `const k = '${key}';`));
  assert.equal(addedSecret('', 'const snake_case_long_identifier_name_here = 1;'), null);
  assert.ok(isSecretFile('conf/keys/mail.private'));
});

test('the stack choice is the full-stack configuration\'s, not every node project\'s', () => {
  const dir = fresh('rp-stack-');
  assert.equal(cli(dir, 'init', 'js-ts').status, 0);
  mkdirSync(join(dir, 'src'), { recursive: true });
  assert.equal(lessonWrite(dir, 'src/s.ts', "import express from 'express';\n").status, 0);
  assert.doesNotMatch(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'), /no-express-no-vite/);
});

test('a route file under a version folder passes', () => {
  const dir = fresh('rp-v2-');
  assert.equal(cli(dir, 'init', 'http-api').status, 0);
  mkdirSync(join(dir, 'src/app/api/v2/orders'), { recursive: true });
  assert.equal(lessonWrite(dir, 'src/app/api/v2/orders/route.ts', 'export async function GET(request) {\n  return list();\n}\n').status, 0);
});

test('a wider check replaces a narrower one, so a project with both packs sees a hit once', () => {
  const dir = fresh('rp-replaces-');
  assert.equal(cli(dir, 'init', 'fastify', 'http-api').status, 0);
  mkdirSync(join(dir, 'src/routes'), { recursive: true });
  const r = lessonWrite(dir, 'src/routes/a.ts', "app.get('/api/orders', handler);\n");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /api-path-versioned/);
  assert.doesNotMatch(r.stderr, /api-routes-versioned/);
});

test('full-stack is a composition: the stack choice is its own pack, and the rest is packs any project can take', () => {
  const dir = fresh('rp-split-');
  assert.equal(cli(dir, 'init', 'http-api', 'zod', '--config', 'node').status, 0);
  for (const f of ['rules/routes-are-thin.md', 'rules/one-error-contract.md', 'rules/apis-are-versioned.md', 'rules/zod-4-schemas.md', 'hooks/schemas-only.mjs']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  assert.ok(!existsSync(join(dir, '.claude/hooks/stack-guard.mjs')), 'the stack choice stays with full-stack');
  const stack = fresh('rp-stack2-');
  assert.equal(cli(stack, 'init', '--config', 'full-stack').status, 0);
  for (const f of ['hooks/stack-guard.mjs', 'hooks/schemas-only.mjs', 'rules/tests-use-inject.md', 'rules/dockerfile-multistage.md', 'rules/pointer-feedback.md', 'rules/three-layers.md']) assert.ok(existsSync(join(stack, '.claude', f)), f);
});
