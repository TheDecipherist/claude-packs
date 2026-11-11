// 0.6.0: doctor --strict skips git-ignored build output, and doctor fails a hook that fails its selftest.
import { CLI, assert, doctorRunning, git, join, mkdirSync, readFileSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
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
  assert.doesNotMatch(strict(), /no rule covers/, strict());
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'lib/Stray.cpp'), 'int x;\n');
  const out = strict();
  assert.match(out, /1 source file\(s\) no rule covers.*lib\/Stray\.cpp/);
  assert.doesNotMatch(out, /out\/|table\.gen/);
});

test('doctor fails when a hook fails its selftest', () => {
  const dir = fixture('audio-core+gpu-painter');
  const hook = join(dir, '.claude/hooks/git-guard.mjs');
  const text = readFileSync(hook, 'utf8');
  const law = "return 'Nothing is rebased or amended. Make a new commit.';";
  assert.ok(text.includes(law), 'the rebase law is in the emitted git-guard');
  writeFileSync(hook, text.replace(law, 'return null;'));
  const guard = join(dir, '.claude/hooks/browser-guard.mjs');
  writeFileSync(guard, readFileSync(guard, 'utf8').replace('LAUNCH_BASH.some((rx) => rx.test(seg))', 'false'));
  const r = doctorRunning(dir);   // the selftests run: the gate would take them as proved (KWB-166)
  assert.equal(r.status, 1);
  assert.match(r.stdout, /git-guard\.mjs fails its selftest/);
  assert.match(r.stdout, /browser-guard\.mjs fails its selftest/, 'the ported browser-guard too');
});
