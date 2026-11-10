// KWB-83: a file could be legal and have no rules. folder-law allowed any layout folder, while base's cpp and js concepts meant only src/ and tests/, and a
// first install never read where a repo's code lives, so folder-law refused a new file in the project's own lib/.
import { assert, cli, execFileSync, existsSync, hookRun, join, mkdirSync, projectWith, readFileSync, run, test, writeFileSync } from './kit-cli.mjs';

function repo(files) {
  const dir = projectWith(files, 'follow-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}
const layoutOf = (dir) => JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
const pathsOf = (dir) => Object.values(layoutOf(dir).folders).map((f) => f.path);
const write = (dir, rel) => hookRun(dir, 'folder-law.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content: 'int x;\n' } }).status;

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

test('a folder added to the layout later gets its rules on update; test/structure.test.mjs holds that a stray file is still reported', () => {
  const dir = repo({ 'src/m.cpp': 'int a;\n' });
  run(dir, 'init', '--config', 'cpp');
  const mine = layoutOf(dir);
  mine.folders.engine = { path: 'engine', purpose: 'the engine' };
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(mine, null, 2));
  mkdirSync(join(dir, 'engine'));
  writeFileSync(join(dir, 'engine/a.cpp'), 'int a;\n');
  run(dir, 'update');
  assert.ok(layoutOf(dir).concepts.cpp.includes('engine/**/*.cpp'));
});

test('an installed project keeps its own concepts and folders on update: a new law never moves under it', () => {
  const dir = repo({ 'src/m.cpp': 'int a;\n' });
  run(dir, 'init', '--config', 'cpp');
  const mine = layoutOf(dir);
  mine.concepts.cpp = ['src/**/*.cpp'];
  delete mine.followFolders; // a project from before 1.1.0 has no such key
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(mine, null, 2));
  mkdirSync(join(dir, 'later'));
  writeFileSync(join(dir, 'later/a.cpp'), 'int a;\n');
  run(dir, 'update');
  assert.deepEqual(layoutOf(dir).concepts.cpp, ['src/**/*.cpp']);
  assert.ok(!pathsOf(dir).includes('later'));
});

test('the new-project skill comes with every install', () => {
  const dir = repo({ 'src/m.cpp': 'int a;\n' });
  run(dir, 'init', '--config', 'cpp');
  assert.ok(existsSync(join(dir, '.claude/skills/new-project/SKILL.md')));
});
