// 0.10.0 (STEP 3 item 4): the full-stack configuration. Fastify and Next.js only (stack-guard), Zod 4 schemas only in the schemas
// folder (schemas-only), rules per folder (thin routes, handlers, one database gateway with chain keys first, one error contract,
// env.ts shapes, health and logs, multistage Docker, inject() tests), its folder template, and doctor's coverage counting
// TypeScript as source (KWB-32). No hook owns these: the install. The hooks' own refusals are in stack-guard.test.mts and
// ../zod/schemas-only.test.mts.
import { assert, cli, existsSync, fresh, join, mkdirSync, readFileSync, renameSync, selftest, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('init --config full-stack: its folders, its laws and no synth law', () => {
  const dir = fixture('full-stack');
  // admiral-fleet W3: one packages/ tree, the web app in it; nothing of the API or a channel at the root
  for (const f of ['packages/core/src/schemas', 'packages/api/src/routes', 'packages/api/src/handlers', 'packages/api/src/adapters', 'packages/api/src/auth', 'packages/api/test', 'packages/web/app', 'packages/web/components']) assert.ok(existsSync(join(dir, f)), f);
  for (const f of ['api', 'channel']) assert.ok(!existsSync(join(dir, f)), `no ${f}/ at the root`);
  assert.ok(!existsSync(join(dir, 'src')), 'no synth src/ folder');
  const rule = readFileSync(join(dir, '.claude/rules/routes-are-thin.md'), 'utf8');
  assert.match(rule, /"packages\/api\/src\/routes\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/zod-4-schemas.md'), 'utf8'), /"packages\/core\/src\/schemas\/\*\*"/);
  for (const r of ['math-domain-guards.md', 'debug-by-measurement.md']) assert.ok(!existsSync(join(dir, '.claude/rules', r)), r);
  for (const h of ['build-guard.mjs', 'realtime-guard.mjs', 'time-guard.mjs']) assert.ok(!existsSync(join(dir, '.claude/hooks', h)), h);
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /a Zod schema outside the schemas folder/);
  assert.doesNotMatch(md, /drawing code/);
  assert.match(md, /Installed packs: base, js-ts, stored-text, ui-craft\./);
  for (const h of ['stack-guard.mjs', 'schemas-only.mjs', 'secrets-guard.mjs', 'untrusted-boundary.mjs']) {
    const s = selftest(dir, h);
    assert.equal(s.status, 0, `${h}: ${s.stdout}${s.stderr}`);
  }
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.match(strict.stdout, /configuration: full-stack/);
});

test('doctor --strict counts TypeScript as source in a full-stack project (KWB-32)', () => {
  const dir = fresh('fs-cover-');   // without js-ts, whose rules cover every .ts file: this install is the subject, so it is made here
  assert.equal(cli(dir, 'init', 'stored-text', '--config', 'full-stack').status, 0);
  mkdirSync(join(dir, 'stray'), { recursive: true });
  writeFileSync(join(dir, 'stray/util.ts'), 'export const x = 1;\n');
  const red = cli(dir, 'doctor', '--strict');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /1 source file\(s\) no rule covers .*stray\/util\.ts/);
  renameSync(join(dir, 'stray/util.ts'), join(dir, 'packages/api/src/util.ts'));
  assert.doesNotMatch(cli(dir, 'doctor', '--strict').stdout, /no rule covers/, 'a file in the API folder is covered');
});
