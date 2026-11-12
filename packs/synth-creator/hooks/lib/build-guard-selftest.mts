// build-guard's selftest: each law planted (its refused commands and its quiet twins), then the hook itself through the runner.
// The hook hands in its own laws (importing it here would be a cycle: it imports this file to run its selftest).
import { join } from 'node:path';
import { bashOf, put, runHook, scratchProject, snapshot, verdicts, writtenSince } from './selftest.mts';
import type { VerdictRow } from './types.d.mts';

/** The laws of build-guard.mts, as its selftest plants them. */
export interface BuildLaws {
  offending: (cmd: string) => string | null;
  launchesApp: (cmd: string) => boolean;
  tooWide: (cmd: string, cwd: string, countTests: (dir: string, pat: string) => number) => string | null;
}

type Plant = readonly [command: string, refused: boolean];

const OFFENDING: readonly Plant[] = [
  ['cmake --build build --target X -j18', true], ['cd x && cmake --build build', true], ['ctest --test-dir build', true],
  ['make -j8', true], ['ninja -C out', true], ['cargo build --release', true], ['xcodebuild -scheme A', true],
  ['(cd w && ctest -j6)', true], ['FOO=1 time make', true],
  ['buildq cmake --build build -j18', false], ['~/.claude/bin/buildq ctest --test-dir b', false],
  ['bash tools/build.sh build build Synth_Standalone', false], ['cmake -B build -DX=1', false],
  ['./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter', true],
  ['cd w && build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --pad', true],
  ['buildq ./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter', false],
  ['ls build/', false], ['command -v ninja', false], ['ninja -C build -t inputs X', false], ['/opt/homebrew/bin/ninja --version', false],
  ['ninja -C build X', true], ['ctest --test-dir build -N', false], ['ctest --test-dir build --show-only=json-v1', false], ['ctest --version', false],
  ['which ninja', false], ['cargo fmt', false], ['go vet ./...', false], ["grep -n 'cmake --build' f.md", false], ["git commit -m 'make it'", false],
  ["cat > f.py <<'EOF'\ncases = [(\"cmake --build b\", True)]\nmake -j8\nEOF\npython3 f.py", false],
  ['python3 - <<EOF\nctest --test-dir b\nEOF', false], ['echo "run ctest later"', false],
  ['for f in $(git diff --name-only a b) build/evidence/M17/differences.txt; do [ -f "$f" ] && grep -l x "$f"; done', false], // KWB-89: a list's word
  ['ls $(pwd)/x build/notes.txt', false], ['for i in 1 2; do ./build/A_artefacts/Release/AProbe --x; done', true], // a command after do
  ['if true; then make -j8; fi', true], ['while read x; do ninja -C out; done < l', true], ['true || { ctest --test-dir b; }', true],
];
const LAUNCHES: readonly Plant[] = [
  ['open build/Synth_artefacts/RelWithDebInfo/Standalone/Synth.app', true], ['open -a Synth', true],
  ['python3 tools/record_app_probe.py build/x/Synth.app/Contents/MacOS/Synth', true],
  ['cd w && build/T.app/Contents/MacOS/Synth --record /tmp/x.mov &', true],
  ['ls build/Synth_artefacts', false], ['open docs/report.md', false], ["echo 'open X.app'", false],
];
const WIDE: readonly Plant[] = [
  ['cmake --build build --target all -j6', true], ['cd w && cmake --build build -j6', true], ['bash tools/build.sh build build', true],
  // one word after build: a folder that exists (or a path) builds everything; a target name builds one (WB-90/95)
  ['bash tools/build.sh build synth_block_probe', false], ['bash tools/build.sh build out/', true],
  ['bash tools/build.sh build synth_slots_probe && echo ok', false],
  ['bash tools/build.sh build build SynthFaceProbe Synth_Standalone', false], ['cmake --build build --target SynthBankProbe -j5', false],
  ['bash tools/build.sh test build --output-on-failure', true], ['ctest --test-dir build -j3', true],
  ["bash tools/build.sh test build -R 'record' --output-on-failure", false], ["ctest --test-dir build -R 'gate'", true],
  // a note or title that names the test runner is not a test run; a real bare run after a quoted note still is
  ['python3 tools/step.py save "the look gate hung inside ctest"', false], ["python3 tools/next_number.py wb --take 'ctest holds the turn'", false],
  ['git commit -m "ctest: fix"', false], ['python3 tools/step.py save "note" && bash tools/build.sh test build', true],
  ['bash tools/build.sh test build --full-gate', false], ['bash tools/build.sh test build --changed', false],
];

const plantedRows = (name: string, found: (cmd: string) => unknown, plants: readonly Plant[]): VerdictRow[] =>
  plants.map(([cmd, refused]): VerdictRow => [`${name}: ${cmd.replace(/\n/g, ' / ')}`, found(cmd) !== null && found(cmd) !== false ? 1 : 0, refused ? 1 : 0]);

export function selftest(hookFile: string, laws: BuildLaws): number {
  const dir = scratchProject();
  put(join(dir, 'build/.keep'), '');
  const before = snapshot(dir);
  const sh = (command: string): number | null => runHook(hookFile, dir, bashOf(command, dir)).status;
  return verdicts('build-guard', [
    ...plantedRows('offending', laws.offending, OFFENDING),
    ...plantedRows('launchesApp', laws.launchesApp, LAUNCHES),
    ...plantedRows('tooWide', (cmd) => laws.tooWide(cmd, dir, (_dir, pat) => (pat === 'record' ? 4 : 99)), WIDE),
    ['a build outside the queue is refused through the runner', sh('cmake --build build --target X -j8'), 2],
    ['the same through buildq passes', sh('buildq cmake --build build --target X -j8'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}
