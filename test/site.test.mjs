// The kit's web page. Like the README, it must not fall behind what the kit holds, and it names no person and carries nobody's tracking.
import { KIT, assert, existsSync, join, readdirSync, readFileSync, test } from './kit-cli.mjs';

const PAGE = readFileSync(join(KIT, 'site/index.html'), 'utf8');
const packs = readdirSync(join(KIT, 'packs'));
const inPacks = (kind, keep) => packs.flatMap((p) => { try { return readdirSync(join(KIT, 'packs', p, kind)).filter(keep); } catch { return []; } }).length;
const shown = (name) => Number(PAGE.match(new RegExp(`data-count="${name}">(\\d+)<`))?.[1]);

test('the numbers on the page are the kit\'s true counts', () => {
  assert.equal(shown('packs'), packs.length);
  assert.equal(shown('rules'), inPacks('rules', (f) => f.endsWith('.md')));
  assert.equal(shown('checks'), inPacks('checks', (f) => f.endsWith('.json')));
  assert.equal(shown('hooks'), inPacks('hooks', (f) => /\.(mjs|py)$/.test(f)));
  assert.equal(shown('skills'), inPacks('skills', (f) => !f.startsWith('.')));
  assert.equal(shown('configurations'), readdirSync(join(KIT, 'configurations')).length);
});

test('every file the page loads is in the site, by a relative path, so it works under any repo name', () => {
  for (const [, href] of PAGE.matchAll(/(?:href|src)="(?!https?:|#)([^"]+)"/g)) assert.ok(existsSync(join(KIT, 'site', href)), href);
  assert.doesNotMatch(PAGE, /(?:href|src)="\//);
});

test('the page carries no analytics, and the refusal it shows is the check\'s own words', () => {
  assert.doesNotMatch(PAGE, /rybbit|analytics|gtag/i);
  const check = JSON.parse(readFileSync(join(KIT, 'packs/rust/checks/rust-unwrap-in-library.json'), 'utf8'));
  assert.ok(PAGE.includes(check.id));
  assert.ok(PAGE.replace(/\s+/g, ' ').includes(check.why));
});

test('the site is not shipped in the npm package', () => {
  assert.ok(!JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).files.includes('site'));
});
