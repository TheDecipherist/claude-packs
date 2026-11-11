// KWB-83: a file could be legal and have no rules. folder-law allowed any layout folder, while base's cpp and js concepts meant only src/ and tests/, and a
// first install never read where a repo's code lives, so folder-law refused a new file in the project's own lib/.
// The install is the subject here: a first install reads where the source is, so each test installs on purpose.
// (A folder added later, and an installed project's own concepts on update: rules-follow-the-code-update.test.mts, split so no file sums over a minute.)
import { assert, cli, execFileSync, existsSync, hookRun, join, projectWith, readFileSync, run, test } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { pathsOf } from './rules-follow-the-code-rig.mts';

function repo(files: Readonly<Record<string, string>>): string {
  const dir = projectWith(files, 'follow-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}
const write = (dir: string, rel: string): number | null => hookRun(dir, 'folder-law.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content: 'int x;\n' } }).status;

test('a first install adds the folders a repo\'s source is in, and folder-law then takes a new file there', () => {
  const dir = repo({ 'lib/net/socket.cpp': 'int a;\n', 'plugin/main.cpp': 'int b;\n' });
  assert.match(run(dir, 'init', '--config', 'cpp'), /your source is in lib\/, plugin\//);
  assert.ok(pathsOf(dir).includes('lib') && pathsOf(dir).includes('plugin'), pathsOf(dir).join());
  assert.equal(write(dir, 'lib/net/new.cpp'), 0);
  assert.equal(write(dir, 'stray/new.cpp'), 2, 'a folder nobody chose is still refused');
});

test('C++ outside src/ has rules on it, and doctor --strict passes', () => {
  const dir = repo({ 'lib/a.cpp': 'int a;\n' });
  run(dir, 'init', '--config', 'cpp');
  assert.match(readFileSync(join(dir, '.claude/rules/bug-fix-starts-red.md'), 'utf8'), /\*\*\/\*\.cpp/);
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
});

test('what is fetched, built or another project\'s is no source folder of the project', () => {
  const dir = repo({ 'vendor/x.cpp': 'int a;\n', 'third_party/y.cpp': 'int a;\n', 'build/z.cpp': 'int a;\n', 'src/m.cpp': 'int a;\n' });
  run(dir, 'init', '--config', 'cpp');
  for (const p of ['vendor', 'third_party', 'build']) assert.ok(!pathsOf(dir).includes(p), p);
});

test('the new-project skill comes with every install', () => {
  const dir = fixture('cpp');
  assert.ok(existsSync(join(dir, '.claude/skills/new-project/SKILL.md')));
});
