// 0.27.0: the first content-heavy repo scanned showed the kit judging published text as code. Every "secret" and compose fault was a tutorial sample, and a
// thousand dates were the subject of the articles they sat in. Published text is read by the writing laws, and left alone by the code laws, at the write and in a scan.
import { assert, cli, existsSync, fresh, hookRun, join, lessonWrite, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mts';
import { isContent } from '../packs/base/hooks/lib/content.mjs';
import { addedSecret } from '../packs/base/hooks/secrets-guard.mjs';

const put = (dir, rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };

test('a content folder is content; the same word under a code root is code; a project can add its own', () => {
  for (const f of ['articles/a/deploy.sh', 'blog/post.md', 'website/posts/x.md', 'content/page.mdx', 'examples/app.ts']) assert.ok(isContent(f), f);
  for (const f of ['src/app/blog/page.tsx', 'app/posts/route.ts', 'src/components/content/Card.tsx', 'server/routes/articles/list.js', 'packages/web/content/a.ts', 'lib/a.ts']) assert.ok(!isContent(f), f);
  assert.ok(isContent('handbook/a.ts', { guards: { content: ['handbook/**'] } }));
});

test('a date in an article is a fact: the check is opt-in, and even switched on leaves articles alone', () => {
  const dir = fresh('cs-date-');
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
  assert.ok(!existsSync(join(dir, '.claude/checks/no-time-or-date.json')), 'held back');
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 0);
  const file = join(dir, '.claude/layout.json');
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), enable: ['checks/no-time-or-date.json'] }));
  assert.equal(cli(dir, 'update').status, 0);
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 2);
  mkdirSync(join(dir, 'articles'), { recursive: true });
  assert.equal(lessonWrite(dir, 'articles/zodiac.md', 'The letter arrived in August 1969.\n').status, 0);
});

test('the writing laws still read an article; the code laws do not', () => {
  const dir = fresh('cs-laws-');
  assert.equal(cli(dir, 'init', 'shell', 'js-ts', '--config', 'node').status, 0);
  mkdirSync(join(dir, 'articles/guide'), { recursive: true });
  mkdirSync(join(dir, 'tools'), { recursive: true });
  assert.equal(lessonWrite(dir, 'articles/guide/a.md', 'It is fast — really.\n').status, 2);
  assert.equal(lessonWrite(dir, 'articles/guide/run.sh', 'now=`date`\n').status, 0);
  assert.equal(lessonWrite(dir, 'tools/run.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=`date`\n').status, 2);
});

test('a placeholder password is no secret; a real-looking one is', () => {
  for (const p of ['password', 'yourpassword', 'changeme', 'example123', 'xxxxxxxx', 'YourSecret1']) assert.equal(addedSecret('', `mongodb://admin:${p}@db:27017`), null, p);
  assert.ok(addedSecret('', `mongodb://admin:${['Tr0ub', 'adour9'].join('')}@db:27017`));
});

test('scan and suggest: samples are left out, public text comes last, and the weight of the repo is reported', () => {
  const dir = fresh('cs-scan-');
  put(dir, 'server.js', "const app = require('express')();\n");
  put(dir, 'package.json', JSON.stringify({ dependencies: { express: '5.0.0' } }));
  put(dir, 'index.html', '<html lang="en"><head><title>Home</title></head><body></body></html>\n');
  put(dir, 'articles/guide/index.md', 'It is fast — really.\n');
  put(dir, 'articles/guide/Dockerfile', 'FROM node:latest\n');
  put(dir, 'articles/guide/compose.yml', `url: mongodb://root:${['Tr0ub', 'adour9'].join('')}@db\n`);
  put(dir, 'shot.png', 'x');
  const said = cli(dir, 'suggest').stdout;
  assert.doesNotMatch(said, /docker +file/, 'a sample is no evidence');
  assert.match(said, /web +web UI: index\.html/);
  assert.match(said, /content-site +published page/);
  const r = cli(dir, 'scan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 possible secret\(s\)/);
  const text = readFileSync(r.stdout.match(/Report: (\S+)/)[1], 'utf8');
  assert.match(text, /in public text, listed last/);
  assert.match(text, /In test files and content folders \(1\)/);
  assert.match(text, /### public text/);
  assert.match(text, /1 image\(s\) in the repo root/);
  assert.match(text, /MB tracked/);
});

test('a real bug still fires beside it: a failure that looks empty, a CSP switched off, a constant captcha', () => {
  const dir = fresh('cs-api-');
  assert.equal(cli(dir, 'init', 'http-api', 'content-site').status, 0);
  mkdirSync(join(dir, 'server'), { recursive: true });
  assert.equal(lessonWrite(dir, 'server/a.js', 'if (!db) return res.json({ comments: [], total: 0 });\n').status, 2);
  assert.equal(lessonWrite(dir, 'server/b.js', "if (!db) return res.status(503).json({ code: 'unavailable' });\n").status, 0);
  assert.equal(lessonWrite(dir, 'server/c.js', 'app.use(helmet({ contentSecurityPolicy: false }));\n').status, 2);
  assert.equal(lessonWrite(dir, 'server/d.js', "const CAPTCHA_ANSWER = 'K';\n").status, 2);
  assert.equal(lessonWrite(dir, 'server/e.js', "router.get('/adminTools/api/config', handler);\n").status, 2);
  assert.equal(lessonWrite(dir, 'page.html', '<html lang="en"><head><title>A</title></head></html>\n').status, 2);
});

test('repo-litter comes with base and judges a git add', () => {
  const dir = fresh('cs-litter-');
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
  assert.ok(existsSync(join(dir, '.claude/hooks/repo-litter.mjs')));
  assert.equal(hookRun(dir, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: dir }).status, 0);
});
