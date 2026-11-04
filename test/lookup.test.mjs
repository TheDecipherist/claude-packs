// The first rule this package came from: three branches on one value are a lookup. It lives in base,
// so every project gets it, and its check blocks the edit in C++ and in JS/TS. (v7 additions, 0.11.0: the js-ts, mongo,
// fastify, ai, docker, shell-hooks and html-ui packs, the node configuration and the presets that pick its packs.)
import { assert, fresh, hookRun, join, readFileSync, readdirSync, existsSync, run, test, writeFileSync } from './kit-cli.mjs';

// A write fired at the project's lesson checks, as Claude Code fires it.
const write = (dir, rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });

const chainCpp = 'if (mode == Mode::saw) return a();\nelse if (mode == Mode::square) return b();\nelse if (mode == Mode::noise) return c();\n';
const chainTs = "if (action === 'create') return a(p);\nelse if (action === 'update') return b(p);\nelse if (action === 'delete') return d(p);\n";

test('every install gets the lookup rule and check, with real paths', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'audio-core');
  const rule = readFileSync(join(dir, '.claude/rules/lookup-over-if-chains.md'), 'utf8');
  assert.match(rule, /src\/\*\*\/\*\.cpp/);
  assert.match(rule, /src\/\*\*\/\*\.\{[^}]*\bts\b/);   // base's js concept, scoped like cpp (0.11.0: src/, tests/, test/)
  assert.ok(existsSync(join(dir, '.claude/checks/lookup-over-if-chains.json')));
});

test('the check refuses a new if/else chain in C++ (a synth) and TS (a node project), and passes a switch or a lookup', () => {
  const synth = fresh('cpl-');
  run(synth, 'init', 'audio-core');
  assert.equal(write(synth, 'src/dsp/Osc.cpp', chainCpp).status, 2);
  assert.equal(write(synth, 'src/dsp/Osc.cpp', 'switch (mode) { case Mode::saw: return a(); case Mode::square: return b(); case Mode::noise: return c(); }\n').status, 0);
  const node = fresh('cpl-');
  run(node, 'init', 'js-ts');
  assert.equal(write(node, 'web/routes/items.ts', chainTs).status, 2);
  assert.match(write(node, 'web/routes/items.ts', chainTs).stderr, /lookup-over-if-chains/);
  assert.equal(write(node, 'web/routes/items.ts', 'const builders = { create: a, update: b, delete: d } satisfies Record<Action, Builder>;\n').status, 0);
  assert.equal(write(node, 'web/node_modules/x/index.js', chainTs).status, 0);
});

test('ifs in a row that each return on the same value are a chain too (the act-line renderer)', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const rows = "if (row.kind === 'turn') return `<div class=\"act-line\">${turn(row)}</div>`;\n" +
    "if (row.kind === 'system') return `<div class=\"act-line\">${esc(row.note ?? row.tool)}</div>`;\n" +
    "if (row.kind === 'bash') return detailed(row, `<code>$ ${esc(row.command ?? '')}</code>${failed}`);\n";
  const r = write(dir, 'src/ui/activity.ts', rows);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /lookup-over-if-chains/);
  assert.equal(write(dir, 'src/ui/activity.ts', 'const RENDER = { turn: renderTurn, system: renderSystem, bash: renderBash } satisfies Record<RowKind, Render>;\nreturn RENDER[row.kind](row);\n').status, 0);
  assert.equal(write(dir, 'src/ui/two.ts', "if (row.kind === 'turn') return a(row);\nif (row.kind === 'system') return b(row);\n").status, 0);
});

test('the js-ts pack brings all 17 JS/TS rules, scoped to JS/TS files', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const rules = readdirSync(join(dir, '.claude/rules'));
  for (const r of ['no-any.md', 'zod-at-route-boundaries.md', 'tsconfig-strict.md', 'test-names-describe-behavior.md', 'no-floating-promises.md']) assert.ok(rules.includes(r), r);
  assert.match(readFileSync(join(dir, '.claude/rules/tsconfig-strict.md'), 'utf8'), /tsconfig\*\.json/);
  assert.match(run(dir, 'doctor'), /OK: base, js-ts/);
});

test('a run of ifs on one object\'s fields is refused; a field table passes', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const run3 = '  if (args.filter?.flag !== undefined) filter.flags = args.filter.flag;\n  if (args.filter?.kind !== undefined) filter.kind = args.filter.kind;\n  if (args.filter?.path !== undefined) filter.path = { $regex: escapeRe(args.filter.path) };\n';
  const r = write(dir, 'server/tools/list.ts', run3);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /field-map-over-if-runs/);
  const table = 'const FILTER_FIELDS = { flag: (v) => ({ flags: v }), kind: (v) => ({ kind: v }) };\nfor (const [k, put] of Object.entries(FILTER_FIELDS)) if (args.filter?.[k] !== undefined) Object.assign(filter, put(args.filter[k]));\n';
  assert.equal(write(dir, 'server/tools/list.ts', table).status, 0);
  assert.equal(write(dir, 'server/tools/two.ts', 'if (o.a !== undefined) x.a = o.a;\nif (o.b !== undefined) x.b = o.b;\n').status, 0);
});

test('dispatch-once: a second switch on the same kind in another file is refused', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'audio-core');
  const hook = (rel, content) => hookRun(dir, 'dispatch-once.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
  writeFileSync(join(dir, 'src/dsp/Osc.cpp'), 'float render (Osc& o) { switch (o.mode) { case Mode::saw: return 1.0f; } return 0.0f; }\n');
  const r = hook('src/app/Label.cpp', 'juce::String label (Osc& o) { switch (o.mode) { case Mode::saw: return "SAW"; } return {}; }\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"mode" is already switched on in: src\/dsp\/Osc\.cpp/);
  assert.equal(hook('src/app/Arp.cpp', 'void step (Arp& a) { switch (a.direction) { case Dir::up: break; } }\n').status, 0);
  assert.equal(hook('tests/osc_test.cpp', 'switch (o.mode) { case Mode::saw: break; }\n').status, 0);
  assert.equal(hook('../elsewhere/Label.cpp', 'switch (o.mode) { case Mode::saw: break; }\n').status, 0);
});

test('raw JSON.parse / JSON.stringify are refused outside lib/json.ts', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const logLine = "export function logLine(level: 'info' | 'warn' | 'error', fields: Record<string, unknown>): void {\n  console.log(JSON.stringify({ ts: new Date().toISOString(), level, ...fields }));\n}\n";
  const r = write(dir, 'server/log.ts', logLine);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /json-only-through-helper/);
  assert.equal(write(dir, 'server/routes/a.ts', 'const cfg = JSON.parse(text);\n').status, 2);
  assert.equal(write(dir, 'server/lib/json.ts', 'export const toJson = (v: unknown) => stringify(v);\nconst raw = JSON.parse(text);\n').status, 0);
  assert.equal(write(dir, 'server/routes/a.test.ts', 'expect(JSON.parse(body)).toEqual({});\n').status, 0);
  assert.equal(write(dir, 'server/routes/b.ts', "request.log.warn({ jobId, err }, 'job retry');\n").status, 0);
});

test('async callbacks nobody awaits, and swallowed errors, are refused', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const timer = write(dir, 'server/jobs/sweep.ts', 'setInterval(async () => { await sweepExpired(db); }, 60_000);\n');
  assert.equal(timer.status, 2);
  assert.match(timer.stderr, /async-callback-unguarded/);
  assert.equal(write(dir, 'server/ws.ts', "socket.on('message', async (m) => { await handle(m); });\n").status, 2);
  assert.equal(write(dir, 'server/notify.ts', 'users.forEach(async (u) => await notify(u));\n').status, 2);
  assert.equal(write(dir, 'server/jobs/ok.ts', "setInterval(guarded(() => sweepExpired(db), log, 'sweep'), 60_000);\nconst f = async () => { await x(); };\n").status, 0);
  const empty = write(dir, 'server/save.ts', 'try { await save(x); } catch {}\n');
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /no-swallowed-errors/);
  assert.equal(write(dir, 'server/send.ts', 'await send(m).catch(() => {});\n').status, 2);
  assert.equal(write(dir, 'server/get.ts', 'const v = await get(k).catch(() => null);\n').status, 2);
  assert.equal(write(dir, 'server/save2.ts', "try { await save(x); } catch (err: unknown) { throw new Error('save failed', { cause: err }); }\n").status, 0);
});

test('mongo pack: one client in the gateway, driver only there, safe deletes', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts', 'mongo');
  const bare = write(dir, 'src/db/gateway.ts', "client = new MongoClient(uri, { ignoreUndefined: true });\n");
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /mongoclient-cached-and-named/);
  assert.match(bare.stderr, /appName/);
  assert.equal(write(dir, 'src/db/gateway2.ts', "const g = globalThis as { __mongoClient?: MongoClient };\ng.__mongoClient ??= new MongoClient(env.MONGODB_URI, { appName: env.APP_NAME, maxPoolSize: 10 });\n").status, 0);
  assert.equal(write(dir, 'scripts/seed.ts', "const client = new MongoClient(uri);\nawait client.close();\n").status, 0);
  const route = write(dir, 'src/routes/sessions.ts', "const rows = await getDb().collection('sessions').find({}).toArray();\n");
  assert.equal(route.status, 2);
  assert.match(route.stderr, /driver-outside-gateway|mongoclient-outside-gateway/);
  assert.equal(write(dir, 'src/db/reads.ts', 'const docs = await col.find({ a: 1 }).toArray();\n').status, 2);
  assert.equal(write(dir, 'src/db/reads2.ts', 'const docs = await col.aggregate([{ $match: { a: 1 } }]).toArray();\nconst x = items.find((i) => i.id === id);\n').status, 0);
  assert.equal(write(dir, 'src/db/wipe.ts', 'await col.deleteMany({});\n').status, 2);
  assert.equal(write(dir, 'src/db/neg.ts', 'await col.deleteMany({ version: { $ne: v } });\n').status, 2);
  assert.equal(write(dir, 'src/db/ok.ts', "await col.deleteMany({ sessionId, status: 'expired' });\n").status, 0);
  assert.equal(write(dir, 'test/db.test.ts', 'await col.deleteMany({});\n').status, 0);
});

test('an entry file that listens must register shutdown on all four paths', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'js-ts');
  const r = write(dir, 'src/index.ts', "const app = Fastify();\nawait app.listen({ port: 3000 });\n");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /entry-registers-shutdown/);
  assert.match(r.stderr, /unhandledRejection/);
  assert.equal(write(dir, 'src/index2.ts', "installLifecycle(app);\nawait app.listen({ port: 3000 });\n").status, 0);
  assert.equal(write(dir, 'src/lifecycle.ts', "process.on('SIGTERM', () => shutdown('SIGTERM', 0).catch(() => process.exit(1)));\n").status, 0);
  assert.equal(write(dir, 'src/old.ts', "process.on('SIGTERM', () => void shutdown('SIGTERM', 0));\n").status, 2);
  assert.equal(write(dir, 'src/util.ts', 'export const x = 1;\n').status, 0);
});

test('presets install the packs a stack needs; docker, fastify, ai, shell-hooks and html-ui checks fire', () => {
  const dir = fresh('cpl-');
  run(dir, 'init', 'node-api', 'shell-hooks', 'html-ui');
  const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
  for (const p of ['base', 'js-ts', 'mongo', 'fastify', 'ai', 'docker', 'shell-hooks', 'html-ui']) assert.ok(lock.packs.includes(p), p);
  // docker
  assert.equal(write(dir, 'Dockerfile', 'FROM node:latest\nCMD node dist/index.js\n').status, 2);
  assert.equal(write(dir, 'compose.yml', 'services:\n  api:\n    image: registry/api:1.2.3\n    restart: always\n').status, 2);
  assert.equal(write(dir, 'compose.ok.yml', 'services:\n  api:\n    image: registry/api:1.2.3\n    init: true\n    healthcheck:\n      test: ["CMD", "true"]\n').status, 0);
  // fastify
  const prod = write(dir, 'src/app.ts', "if (prod) {\n  await app.register(helmet, {});\n}\n");
  assert.equal(prod.status, 2);
  assert.match(prod.stderr, /security-not-behind-node-env/);
  assert.equal(write(dir, 'src/routes/a.ts', "const origin = `${req.headers['x-forwarded-proto']}://${req.headers.host}`;\n").status, 2);
  assert.equal(write(dir, 'src/routes/b.ts', 'const parsed = LoginInput.safeParse(req.body);\n').status, 0);
  // ai
  const critic = write(dir, 'src/critic/claude.ts', "const r = await client.messages.create({ model: MODELS.critic.id, messages: [{ role: 'user', content: input.diff }] });\n");
  assert.equal(critic.status, 2);
  assert.match(critic.stderr, /model-call-needs-boundary/);
  assert.equal(write(dir, 'src/critic/ok.ts', "const content = wrapBoundary(input.diff, 'diff');\nconst r = await client.messages.create({ model: MODELS.critic.id, messages: [{ role: 'user', content }] });\n").status, 0);
  // shell-hooks
  assert.equal(write(dir, 'hooks/x.sh', 'NOW=$(date +%s%3N)\n').status, 2);
  assert.equal(write(dir, 'hooks/y.sh', "NOW=$(node -e 'console.log(Date.now())')\n").status, 0);
  // html-ui
  assert.equal(write(dir, 'src/ui/page.ts', 'const h = `<span style="color:red">x</span>`;\n').status, 2);
  // js-ts additions
  assert.equal(write(dir, 'src/routes/c.ts', 'const Body = z.object({ name: z.string().max(80) });\n').status, 2);
  assert.equal(write(dir, 'src/x.ts', "import express from 'express';\n").status, 2);
  assert.equal(write(dir, 'src/schemas/user.ts', 'export const User = z.object({ name: z.string() });\n').status, 2);
  assert.equal(write(dir, 'src/schemas/user2.ts', 'export const User = z.object({ name: z.string().max(80), _id: z.string() });\n').status, 0);
});
