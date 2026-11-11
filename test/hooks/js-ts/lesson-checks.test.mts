// untrusted: none
// The js-ts pack's checks (and the stack presets built on it), fired through the base lesson-checks hook at copies of an install.
// Moved from the old lookup, review-packs and stored-text root tests. (v7 additions, 0.11.0: the js-ts, mongo, fastify, ai, docker,
// shell-hooks and html-ui packs, the node configuration and the presets that pick its packs; v8: web, tui, nginx.)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { lockOf } from '../../fixtures/installs.mts';
import { run } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';
import { assertRefused, assertTaken, lintWrite } from '../lesson-cases.mts';

test('the js-ts pack brings all 17 JS/TS rules, scoped to JS/TS files', () => {
  const dir = fixture('js-ts');
  const rules = readdirSync(join(dir, '.claude/rules'));
  for (const r of ['no-any.md', 'zod-at-route-boundaries.md', 'tsconfig-strict.md', 'test-names-describe-behavior.md', 'no-floating-promises.md']) assert.ok(rules.includes(r), r);
  assert.match(readFileSync(join(dir, '.claude/rules/tsconfig-strict.md'), 'utf8'), /tsconfig\*\.json/);
  assert.match(run(dir, 'doctor'), /OK: base, js-ts/);
});

test('a run of ifs on one object\'s fields is refused; a field table passes', () => {
  const dir = fixture('js-ts');
  const run3 = '  if (args.filter?.flag !== undefined) filter.flags = args.filter.flag;\n  if (args.filter?.kind !== undefined) filter.kind = args.filter.kind;\n  if (args.filter?.path !== undefined) filter.path = { $regex: escapeRe(args.filter.path) };\n';
  assertRefused(dir, 'server/tools/list.ts', run3, 'field-map-over-if-runs');
  const table = 'const FILTER_FIELDS = { flag: (v) => ({ flags: v }), kind: (v) => ({ kind: v }) };\nfor (const [k, put] of Object.entries(FILTER_FIELDS)) if (args.filter?.[k] !== undefined) Object.assign(filter, put(args.filter[k]));\n';
  assertTaken(dir, 'server/tools/list.ts', table);
  assertTaken(dir, 'server/tools/two.ts', 'if (o.a !== undefined) x.a = o.a;\nif (o.b !== undefined) x.b = o.b;\n');
});

test('raw JSON.parse / JSON.stringify are refused outside lib/json.ts', () => {
  const dir = fixture('js-ts');
  const logLine = "export function logLine(level: 'info' | 'warn' | 'error', fields: Record<string, unknown>): void {\n  console.log(JSON.stringify(entryOf({ ts: new Date().toISOString(), level, ...fields })));\n}\n";
  assertRefused(dir, 'server/log.ts', logLine, 'json-only-through-helper');
  assert.equal(lintWrite(dir, 'server/routes/a.ts', 'const cfg = JSON.parse(text);\n').status, 2);
  assertTaken(dir, 'server/lib/json.ts', 'export const toJson = (v: unknown) => stringify(v);\nconst raw = JSON.parse(text);\n');
  assertTaken(dir, 'server/routes/a.test.ts', 'expect(JSON.parse(body)).toEqual({});\n');
  assertTaken(dir, 'server/routes/b.ts', "request.log.warn({ jobId, err }, 'job retry');\n");
});

test('async callbacks nobody awaits, and swallowed errors, are refused', () => {
  const dir = fixture('js-ts');
  assertRefused(dir, 'server/jobs/sweep.ts', 'setInterval(async () => { await sweepExpired(db); }, 60_000);\n', 'async-callback-unguarded');
  assert.equal(lintWrite(dir, 'server/ws.ts', "socket.on('message', async (m) => { await handle(m); });\n").status, 2);
  assert.equal(lintWrite(dir, 'server/notify.ts', 'users.forEach(async (u) => await notify(u));\n').status, 2);
  assertTaken(dir, 'server/jobs/ok.ts', "setInterval(guarded(() => sweepExpired(db), log, 'sweep'), 60_000);\nconst f = async () => { await x(); };\n");
  assertRefused(dir, 'server/save.ts', 'try { await save(x); } catch {}\n', 'no-swallowed-errors');
  assert.equal(lintWrite(dir, 'server/send.ts', 'await send(m).catch(() => {});\n').status, 2);
  assert.equal(lintWrite(dir, 'server/get.ts', 'const v = await get(k).catch(() => null);\n').status, 2);
  assertTaken(dir, 'server/save2.ts', "try { await save(x); } catch (err: unknown) { throw new Error('save failed', { cause: err }); }\n");
});

test('an entry file that listens must register shutdown on all four paths', () => {
  const dir = fixture('js-ts');
  const r = assertRefused(dir, 'src/index.ts', "const app = Fastify();\nawait app.listen({ port: 3000 });\n", 'entry-registers-shutdown');
  assert.match(r.stderr, /unhandledRejection/);
  assertTaken(dir, 'src/index2.ts', "installLifecycle(app);\nawait app.listen({ port: 3000 });\n");
  assertTaken(dir, 'src/lifecycle.ts', "process.on('SIGTERM', () => shutdown('SIGTERM', 0).catch(() => process.exit(1)));\n");
  assert.equal(lintWrite(dir, 'src/old.ts', "process.on('SIGTERM', () => void shutdown('SIGTERM', 0));\n").status, 2);
  assertTaken(dir, 'src/util.ts', 'export const x = 1;\n');
});

test('a check for one major version leaves a project on an older one alone', () => {
  const dir = fixture('js-ts');
  put(join(dir, 'package.json'), JSON.stringify({ dependencies: { zod: '^3.22.0' } }));
  assertTaken(dir, 'src/s.ts', 'const a = z.string().email();\n');
  put(join(dir, 'package.json'), JSON.stringify({ dependencies: { zod: '^4.1.0' } }));
  assert.equal(lintWrite(dir, 'src/t.ts', 'const a = z.string().email();\n').status, 2);
});

test('the stack choice is the full-stack configuration\'s, not every node project\'s', () => {
  const dir = fixture('js-ts');
  assertTaken(dir, 'src/s.ts', "import express from 'express';\n");
  assert.doesNotMatch(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'), /no-express-no-vite/);
});

test('presets install the packs a stack needs; docker, fastify, ai, shell-hooks and html-ui checks fire', () => {
  const dir = extraFixture('node-api-shell-hooks-html-ui', ['node-api', 'shell-hooks', 'html-ui']);
  const packs = lockOf(dir).packs ?? [];
  for (const p of ['base', 'js-ts', 'mongo', 'fastify', 'ai', 'docker', 'shell-hooks', 'html-ui']) assert.ok(packs.includes(p), p);
  // docker
  assert.equal(lintWrite(dir, 'Dockerfile', 'FROM node:latest\nCMD node dist/index.js\n').status, 2);
  assert.equal(lintWrite(dir, 'compose.yml', 'services:\n  api:\n    image: registry/api:1.2.3\n    restart: always\n').status, 2);
  assertTaken(dir, 'compose.ok.yml', 'services:\n  api:\n    image: registry/api:1.2.3\n    init: true\n    healthcheck:\n      test: ["CMD", "true"]\n');
  // fastify
  assertRefused(dir, 'src/app.ts', "const app = Fastify({ logger });\nawait app.register(rateLimit, {});\n", 'sec-headers-present');
  assert.equal(lintWrite(dir, 'src/routes/a.ts', "const origin = `${req.headers['x-forwarded-proto']}://${req.headers.host}`;\n").status, 2);
  assertTaken(dir, 'src/routes/b.ts', 'const parsed = LoginInput.safeParse(req.body);\n');
  // ai
  assertRefused(dir, 'src/critic/claude.ts', "const r = await client.messages.create({ model: MODELS.critic.id, messages: [{ role: 'user', content: input.diff }] });\n", 'model-call-needs-boundary');
  assertTaken(dir, 'src/critic/ok.ts', "const content = wrapBoundary(input.diff, 'diff');\nconst r = await client.messages.create({ model: MODELS.critic.id, messages: [{ role: 'user', content }] });\nconst out = CriticOutput.safeParse(parseJson(textOf(r)));\n");
  // shell-hooks
  assert.equal(lintWrite(dir, 'hooks/x.sh', 'NOW=$(date +%s%3N)\n').status, 2);
  assertTaken(dir, 'hooks/y.sh', "NOW=$(node -e 'console.log(Date.now())')\n");
  // html-ui
  assert.equal(lintWrite(dir, 'src/ui/page.ts', 'const h = `<span style="color:red">x</span>`;\n').status, 2);
  // js-ts additions
  assert.equal(lintWrite(dir, 'src/routes/c.ts', 'const Body = z.object({ name: z.string().max(80) });\n').status, 2);
  assertTaken(dir, 'src/x.ts', "import express from 'express';\n");   // 0.25.0: one stack's choice, in full-stack
  assert.equal(lintWrite(dir, 'src/schemas/user.ts', 'export const User = z.object({ name: z.string() });\n').status, 2);
  assertTaken(dir, 'src/schemas/user2.ts', 'export const User = z.object({ name: z.string().max(80), _id: z.string() });\n');
});

test('v8: web, tui, nginx packs and the fastify security switch', () => {
  const dir = extraFixture('next-app-node-cli-edge-fastify', ['next-app', 'node-cli', 'edge', 'fastify']);
  // web
  assert.equal(lintWrite(dir, 'src/app/page.tsx', '<div onClick={open}>Open</div>\n').status, 2);
  assert.equal(lintWrite(dir, 'src/app/x/page.tsx', '<button className="px-2" onClick={save}>Save</button>\n').status, 2);
  assert.equal(lintWrite(dir, 'src/components/Hero.tsx', '<img src="/hero.png" loading="lazy" class="hero">\n').status, 2);
  assertTaken(dir, 'src/components/Ok.tsx', '<img src="/a.png" alt="a" width="320" height="200" />\n<Button onClick={save}>Save changes</Button>\n');
  assert.equal(lintWrite(dir, 'src/styles/globals.css', '.hero { width: 100vw; }\n').status, 2);
  assertTaken(dir, 'src/styles/ok.css', '.hero { width: 100%; max-width: 640px; }\nbutton, [role="button"] { cursor: pointer; }\n');
  assert.equal(lintWrite(dir, 'src/app/layout.tsx', '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />\n').status, 2);
  const client = assertRefused(dir, 'src/components/Admin.tsx', "'use client';\nimport { getDb } from '../server/gateway';\nwindow.location.href = '/admin';\n", 'client-no-server-import');
  assert.match(client.stderr, /client-no-window-location-nav/);
  // tui
  assert.equal(lintWrite(dir, 'src/tui/index.tsx', "process.stdout.write('\\x1Bc');\n").status, 2);
  const entry = assertRefused(dir, 'src/cli.tsx', "process.stdout.write('\\x1B[?1049h');\nrender(<App />);\n", 'tui-entry-restores-terminal');
  assert.match(entry.stderr, /tui-gates-on-tty/);
  // nginx
  assert.equal(lintWrite(dir, 'nginx/nginx.conf', 'server { location / { proxy_pass http://api:3000; } }\n').status, 2);
  assertTaken(dir, 'nginx/ok.conf', 'http { resolver 127.0.0.11 ipv6=off valid=10s; access_log /dev/stdout json; server { location / { set $api http://api:3000; proxy_pass $api; } } }\n');
  // fastify: the single switch is allowed; a missing helmet is not
  assertTaken(dir, 'src/app.ts', "const app = Fastify({ trustProxy: 1 });\nif (isProd) { await app.register(helmet, {}); await app.register(rateLimit, {}); }\n");
  assert.equal(lintWrite(dir, 'src/plugins/proxy.ts', "const app = Fastify({ trustProxy: true });\n").status, 2);
  assert.equal(lintWrite(dir, 'src/routes/login.ts', "if (token === expected) ok();\nreturn reply.code(500).send({ error: { message: err.message } });\n").status, 2);
});
