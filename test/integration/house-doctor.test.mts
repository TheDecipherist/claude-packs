// 0.6.0: doctor --strict skips git-ignored build output. (Doctor failing a hook that fails its selftest: house-doctor-selftest.test.mts.)
import { CLI, assert, git, join, mkdirSync, readFileSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

// Bug (3): build output the project ignores (Stellix's out/**) is not "source no rule covers".
test('doctor --strict skips git-ignored files and folders', () => {
  const dir = fixture('audio-core');
  git(dir, 'init', '-q');
  writeFileSync(join(dir, '.gitignore'), `${readFileSync(join(dir, '.gitignore'), 'utf8')}out/\n*.gen.cpp\n`);
  mkdirSync(join(dir, 'out/_deps/x'), { recursive: true });
  writeFileSync(join(dir, 'out/_deps/x/big.cpp'), 'int x;\n');
  writeFileSync(join(dir, 'out/moc.cpp'), 'int y;\n');
  writeFileSync(join(dir, 'src/dsp/table.gen.cpp'), 'int z;\n');
  writeFileSync(join(dir, 'src/dsp/Svf.cpp'), 'int s;\n');
  const strict = (): string => spawnSync('node', [CLI, 'doctor', '--strict', '--dir', dir], { encoding: 'utf8' }).stdout;
  const quiet = strict();   // once: as the assert's message it was a second doctor run
  assert.doesNotMatch(quiet, /no rule covers/, quiet);
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'lib/Stray.cpp'), 'int x;\n');
  const out = strict();
  assert.match(out, /1 source file\(s\) no rule covers.*lib\/Stray\.cpp/);
  assert.doesNotMatch(out, /out\/|table\.gen/);
});
