// KWB-146: the kit's own code goes through its one JSON helper (packs/base/hooks/lib/json.mjs), as its js-ts rule
// json-only-through-one-helper tells every project. The kit installs only base on itself, and that check skips hooks/, so
// nothing judged the kit at write time, and new raw calls kept coming (the user: "how come you are still writing
// JSON.stringify function calls"). Until the migration takes the count to zero, this holds the line: the raw calls left in
// the kit's code may only go down, and the number below is lowered with them.
import { assert, execFileSync, join, readFileSync, test } from './kit-cli.mjs';
import { languageOf } from '../packs/base/hooks/lib/languages.mjs';

const KIT = join(import.meta.dirname, '..');
const RAW_CALLS_LEFT = 547;   // lowered 2026-11-11 (was 560; measured 2026-11-10) (code and tests); lower it with every migration, never raise it
const RAW = /\bJSON\s*\.\s*(?:parse|stringify)\s*\(/g;

function rawCalls() {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: KIT, encoding: 'utf8' }).split('\n')
    .filter((f) => /\.(?:mjs|cjs|js)$/.test(f) && !f.startsWith('test/fixtures/') && !f.endsWith('/hooks/lib/json.mjs'));
  return files.map((f) => ({ f, n: (languageOf('.mjs').blank(readFileSync(join(KIT, f), 'utf8')).match(RAW) ?? []).length })).filter((x) => x.n > 0);
}

test('the raw JSON calls left in the kit never rise: new code calls toJson, parseJson, readJson or writeJson', () => {
  const left = rawCalls();
  const total = left.reduce((n, x) => n + x.n, 0);
  const worst = left.sort((a, b) => b.n - a.n).slice(0, 5).map((x) => `${x.f} ${x.n}`).join(', ');
  assert.ok(total <= RAW_CALLS_LEFT, `${total} raw JSON.parse/JSON.stringify calls, more than the ${RAW_CALLS_LEFT} left: call the helper in packs/base/hooks/lib/json.mjs (most: ${worst})`);
  assert.equal(total, RAW_CALLS_LEFT, `${total} raw calls left, fewer than ${RAW_CALLS_LEFT}: lower RAW_CALLS_LEFT to ${total} so the line holds there`);
});
