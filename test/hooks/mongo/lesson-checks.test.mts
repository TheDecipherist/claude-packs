// The mongo pack's checks, fired through the base lesson-checks hook: one client in the gateway, driver only there, safe deletes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { extraFixture } from '../hook-rig.mts';
import { assertRefused, assertTaken, lintWrite } from '../lesson-cases.mts';

test('mongo pack: one client in the gateway, driver only there, safe deletes', () => {
  const dir = extraFixture('js-ts-mongo', ['js-ts', 'mongo']);
  const bare = assertRefused(dir, 'src/db/gateway.ts', "client = new MongoClient(uri, { ignoreUndefined: true });\n", 'mongoclient-cached-and-named');
  assert.match(bare.stderr, /appName/);
  assertTaken(dir, 'src/db/gateway2.ts', "const g = globalThis as { __mongoClient?: MongoClient };\ng.__mongoClient ??= new MongoClient(env.MONGODB_URI, { appName: env.APP_NAME, maxPoolSize: 10 });\n");
  assertTaken(dir, 'scripts/seed.ts', "const client = new MongoClient(uri);\nawait client.close();\n");
  assertRefused(dir, 'src/routes/sessions.ts', "const rows = await getDb().collection('sessions').find({}).toArray();\n", /driver-outside-gateway|mongoclient-outside-gateway/);
  assert.equal(lintWrite(dir, 'src/db/reads.ts', 'const docs = await col.find({ a: 1 }).toArray();\n').status, 2);
  assertTaken(dir, 'src/db/reads2.ts', 'const docs = await col.aggregate([{ $match: { a: 1 } }]).toArray();\nconst x = items.find((i) => i.id === id);\n');
  assert.equal(lintWrite(dir, 'src/db/wipe.ts', 'await col.deleteMany({});\n').status, 2);
  assert.equal(lintWrite(dir, 'src/db/neg.ts', 'await col.deleteMany({ version: { $ne: v } });\n').status, 2);
  assertTaken(dir, 'src/db/ok.ts', "await col.deleteMany({ sessionId, status: 'expired' });\n");
  assertTaken(dir, 'test/db.test.ts', 'await col.deleteMany({});\n');
});
