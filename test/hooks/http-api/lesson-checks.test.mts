// The http-api pack's checks (0.25.0, from senior reviews of three real repos), fired through the base lesson-checks hook: the pack
// refuses what it says it refuses, and takes the fix.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../hook-rig.mts';
import { assertRefused, assertTaken, holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['http-api', 'src/routes/segments.ts', 'const s = await findSegmentById(id);\nreturn json(s);\n', 'const s = await findSegmentById(id, session.user.id);\nreturn json(s);\n'],
  ['http-api', 'src/app.ts', 'app.use(cors({ credentials: true }));\n', 'app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));\n'],
  ['http-api', 'src/mount.ts', "app.use('/api/orders', router);\n", "app.use('/api/v1/orders', router);\n"],
  ['http-api', 'src/app/api/orders/route.ts', 'export async function GET(request) {\n  return list();\n}\n', 'export const dynamic = 1;\n'],
  ['http-api', 'src/ui/orders.ts', "const r = await fetch('/api/orders');\n", "const r = await fetch('/api/v1/orders');\n"],
]);

test('a route file under a version folder passes', () => {
  assertTaken(fixture('http-api-family'), 'src/app/api/v2/orders/route.ts', 'export async function GET(request) {\n  return list();\n}\n');
});

test('a wider check replaces a narrower one, so a project with both packs sees a hit once', () => {
  const r = assertRefused(fixture('http-api-family'), 'src/routes/a.ts', "app.get('/api/orders', handler);\n", 'api-path-versioned');
  assert.doesNotMatch(r.stderr, /api-routes-versioned/);
});
