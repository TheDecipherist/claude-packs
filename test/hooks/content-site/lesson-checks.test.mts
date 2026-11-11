// The content-site pack's checks beside the http-api pack's, fired through the base lesson-checks hook (0.27.0: the first
// content-heavy repo scanned showed the kit judging published text as code). The hook's own contract is in test/hooks/base/lesson-checks.test.mts.
import { extraFixture } from '../hook-rig.mts';
import { assert, lessonWrite, test } from '../../kit-cli.mts';

test('a real bug still fires beside it: a failure that looks empty, a CSP switched off, a constant captcha', () => {
  const dir = extraFixture('http-api-content-site', ['http-api', 'content-site']);
  assert.equal(lessonWrite(dir, 'server/a.js', 'if (!db) return res.json({ comments: [], total: 0 });\n').status, 2);
  assert.equal(lessonWrite(dir, 'server/b.js', "if (!db) return res.status(503).json({ code: 'unavailable' });\n").status, 0);
  assert.equal(lessonWrite(dir, 'server/c.js', 'app.use(helmet({ contentSecurityPolicy: false }));\n').status, 2);
  assert.equal(lessonWrite(dir, 'server/d.js', "const CAPTCHA_ANSWER = 'K';\n").status, 2);
  assert.equal(lessonWrite(dir, 'server/e.js', "router.get('/adminTools/api/config', handler);\n").status, 2);
  assert.equal(lessonWrite(dir, 'page.html', '<html lang="en"><head><title>A</title></head></html>\n').status, 2);
});
