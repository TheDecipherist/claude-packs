// KWB-198: the TypeScript laws reach .mts and .cts files. A glob that names .ts names the module forms too (glob.mts withModuleForms), so a
// check refuses in src/a.mts and src/a.cts what it refuses in src/a.ts, a rule's generated `paths:` match lib/x.mts in a project whose code
// folder is lib/, and typescript-only judges a file the project starts, not one it holds.
import { assert, join, lessonWrite, mkdirSync, readFileSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { matchesAny } from '../../packs/base/hooks/lib/glob.mts';
import { put } from '../../packs/base/hooks/lib/files.mts';
import { layoutOf } from './rules-follow-the-code-rig.mts';

const CHAIN = "if (action === 'create') return a(p);\nelse if (action === 'update') return b(p);\nelse if (action === 'delete') return d(p);\n";

test('a check that refuses a fault in a .ts file refuses it in .mts and .cts, and a clean one passes in each', () => {
  const dir = fixture('js-ts');
  for (const ext of ['ts', 'mts', 'cts']) {
    const rel = `web/routes/items.${ext}`;
    assert.equal(lessonWrite(dir, rel, CHAIN).status, 2, `${rel} is refused`);
    assert.match(lessonWrite(dir, rel, CHAIN).stderr, /lookup-over-if-chains/);
    assert.equal(lessonWrite(dir, rel, 'const builders = { create: a, update: b, delete: d } satisfies Record<Action, Builder>;\n').status, 0, `${rel} takes the fix`);
  }
});

test('a rule of js-ts has paths that match lib/x.mts in a project whose code folder is lib/ (followFolders)', () => {
  const dir = fixture('js-ts');
  const mine = layoutOf(dir);
  mine.folders.lib = { path: 'lib', purpose: 'the code' };
  mine.followFolders = true;
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(mine, null, 2));
  mkdirSync(join(dir, 'lib'));
  put(join(dir, 'lib/x.mts'), 'export const x = 1;\n');
  run(dir, 'update');
  const paths = [...readFileSync(join(dir, '.claude/rules/no-any.md'), 'utf8').matchAll(/^\s*-\s*"([^"]+)"/gm)].map((m) => m[1] ?? '');
  for (const rel of ['lib/x.mts', 'lib/x.cts', 'lib/x.ts', 'src/y.mts', 'web/z.cts']) assert.ok(matchesAny(rel, paths), `${rel} is in no path of no-any.md: ${paths.join(' ')}`);
});

test('typescript-only refuses a new .mjs and passes an edit to an existing .js file, its first line included', () => {
  const dir = fixture('js-ts');
  assert.equal(lessonWrite(dir, 'src/fresh.mjs', 'export const answer = 42;\n').status, 2);
  put(join(dir, 'src/old.js'), 'const a = 1;\nconst b = 2;\n');
  assert.equal(lessonWrite(dir, 'src/old.js', 'const first = 3;\nconst b = 2;\n').status, 0, 'a changed first line of an existing file passes');
});
