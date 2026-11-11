// scripts/count-copies.mts counts the hand copies W4 takes out (typescript order W4's Done when). Each kind is seen found when
// planted outside its owner, and not counted in the owner itself; a builder that runs git among other work is not a runner.
import { countCopies, report } from '../scripts/count-copies.mts';
import { assert, fresh, join, put, test } from './kit-cli.mts';

const PLANTED: Readonly<Record<string, string>> = {
  'test/a.test.mjs': "const git = (cwd, ...a) => execFileSync('git', a, { cwd });\n",
  'packs/x/hooks/judge.mts': 'let payload; try { payload = JSON.parse(text); } catch { payload = {}; }\n',
  'packs/x/hooks/old.mts': "if (isMain(import.meta.url)) process.exit(argv.includes('--selftest') ? selftest() : await asHook('old', main));\n",
  'scripts/s.mts': 'if (process.argv[1] === fileURLToPath(import.meta.url)) main();\n',
  'packs/x/hooks/cut.mts': String.raw`const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');` + '\n',
};
const OWNERS: Readonly<Record<string, string>> = {
  'packs/base/hooks/lib/git-run.mts': "export function gitRun(args) {\n  return spawnSync('git', args);\n}\n",
  'packs/base/hooks/lib/shell-lex.mts': String.raw`export const dropHeredocs = (c) => c.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');` + '\n',
};
const CLEAN: Readonly<Record<string, string>> = {
  // builds a repo: runs git among other work, so it is not a git runner
  'test/b.test.mjs': "function repo() {\n  const dir = fresh('r-');\n  put(dir, 'a', 'x');\n  execFileSync('git', ['init'], { cwd: dir });\n}\n",
  // a sample hook written by a test to prove the runner still runs one is not a hook tail
  'test/c.test.mjs': "write('if (isMain(import.meta.url)) process.exit(await asHook(\\'h\\', main))');\n",
};

function kitWith(files: Readonly<Record<string, string>>): { root: string; files: string[] } {
  const root = fresh('count-copies-');
  for (const [rel, text] of Object.entries(files)) put(join(root, rel), text);
  return { root, files: Object.keys(files) };
}

test('each kind is found once where it was planted, and the report is over', () => {
  const { root, files } = kitWith({ ...PLANTED, ...OWNERS });
  const counts = countCopies(root, files);
  assert.deepEqual(counts.map((c) => [c.kind.name, c.hits.map((h) => h.file)]), [
    ['git runners (definitions)', ['test/a.test.mjs']],
    ['payload parses by hand', ['packs/x/hooks/judge.mts']],
    ['hook tails by hand', ['packs/x/hooks/old.mts']],
    ['isMain by hand', ['scripts/s.mts']],
    ['heredoc cutting', ['packs/x/hooks/cut.mts']],
  ]);
  assert.equal(report(counts).over, 5);
});

test('the owners and a clean tree count nothing: the report is not over', () => {
  const { root, files } = kitWith({ ...OWNERS, ...CLEAN });
  const counts = countCopies(root, files);
  assert.deepEqual(counts.flatMap((c) => c.hits), []);
  assert.equal(counts.find((c) => c.kind.name === 'heredoc cutting')?.owned, 1);
  assert.equal(report(counts).over, 0);
});
