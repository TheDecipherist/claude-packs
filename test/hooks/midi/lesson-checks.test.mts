// The midi pack's checks (0.28.0, from the playbook of rebuilding classic machines from firmware): guards against the faults that
// passed every test (nine units deaf to the transport). Fired through the base lesson-checks hook.
import { assert, lessonWrite, test } from '../../kit-cli.mts';
import { audioPacksInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(audioPacksInstall, [
  ['midi', 'src/in.cpp', 'int k = b & 0xF0;\n', 'if (b >= 0xF8) { rt (b); return; }\nint k = b & 0xF0;\n'],
  ['midi', 'src/rt.cpp', 'if (b >= 0xF8) ++pulses;\n', 'if (b == 0xF8) ++pulses;\n'],
  ['midi', 'src/host.cpp', 'bpm.store (tempo);\n', 'resolveTempo (bpm.load(), transport);\n'],
  ['midi', 'src/load.cpp', 'loadPatch (m.getSysExData(), n);\n', 'sysexInbox.push (m);\n'],
]);

test('KF-25: a test\'s stub may advance its play head; the code may not', () => {
  const dir = audioPacksInstall();
  const stub = 'head.ppq += head.bpm / 60.0 * unitBlock / unitRate;\n';
  assert.equal(lessonWrite(dir, 'tests/unit_harness.h', stub).status, 0);
  assert.equal(lessonWrite(dir, 'src/audio/Transport.cpp', stub).status, 2);
});
