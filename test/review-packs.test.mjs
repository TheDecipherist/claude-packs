// 0.25.0: packs made from senior reviews of three real repos. The worst faults there had no check: one customer reading another's data, a guard that
// passed on an empty list, a password in a log. Each pack here installs alone, and refuses what it says it refuses.
import { assert, cli, fresh, join, lessonWrite, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

const CASES = [
  ['http-api', 'src/routes/segments.ts', 'const s = await findSegmentById(id);\nreturn json(s);\n', 'const s = await findSegmentById(id, session.user.id);\nreturn json(s);\n'],
  ['http-api', 'src/app.ts', 'app.use(cors({ credentials: true }));\n', 'app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));\n'],
  ['react', 'src/Row.tsx', 'export const A = () => <button><Icon /></button>;\n', 'export const A = () => <button aria-label="Close"><Icon /></button>;\n'],
  ['multi-tenant', 'src/routes/company.ts', "await deleteOne('companies', { slug: req.params.slug });\n", "await deleteOne('companies', { slug: req.params.slug, company_id: user.company_id });\n"],
  ['websocket', 'src/ws.ts', 'streamManager.updateHeartbeat(msg.agent_id, msg.status);\n', 'streamManager.updateHeartbeat(conn.agentId, msg.status);\n'],
  ['host-agent', 'src/update.ts', 'if (expectedSha256 && actual !== expectedSha256) return fail();\n', 'if (!expectedSha256 || actual !== expectedSha256) return fail();\n'],
  ['go', 'src/a.go', 'package a\n_ = json.Unmarshal(raw, &rows)\n', 'package a\nif err := json.Unmarshal(raw, &rows); err != nil { return err }\n'],
  ['ci', '.github/workflows/test.yml', 'on: push\njobs:\n  t:\n    runs-on: x\n', 'on: push\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: x\n'],
];

for (const [pack, file, bad, good] of CASES) {
  test(`${pack}: installs alone and judges ${file}`, () => {
    const dir = fresh(`rp-${pack}-`);
    const r = cli(dir, 'init', pack);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    mkdirSync(join(dir, file, '..'), { recursive: true });
    assert.equal(lessonWrite(dir, file, bad).status, 2);
    assert.equal(lessonWrite(dir, file, good).status, 0);
  });
}

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
