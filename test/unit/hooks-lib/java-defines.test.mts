// The java row's `define` (languages.mts), read through definesOf: it names a file's methods and no control keyword, on one line
// each, and stays linear on the blanked text definesOf gives it (KWB-next of 2026-11-24, found in collider as its WB-9: a 60-line
// Java file took 24 ms a call, as the old pattern's modifier group and type class both took the blanked comments' whitespace).
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { definesOf } from '../../../packs/base/hooks/lib/near-copies.mts';

const JAVA = [
  'package demo;',
  'import java.util.Map;',
  '/** A census of what was decoded. */',
  'public class Census extends Base {',
  '    @Override',
  '    public void run() throws Exception {',
  '        // seeds: proven boundaries only',
  '        for (String seed : getScriptArgs()) {',
  '            if (seed.isEmpty()) {',
  '                continue;',
  '            } else if (seed.length() > 3) {',
  '                println("long");',
  '            }',
  '        }',
  '        while (it.hasNext()) {',
  '            it.next();',
  '        }',
  '    }',
  '    private static Map<String, Integer> countOf(String text, int width) {',
  '        return new HashMap<>();',
  '    }',
  '    int plain(long a) {',
  '        Runnable r = new Runnable() {',
  '            public void run() { }',
  '        };',
  '        switch (a) { default: return 0; }',
  '    }',
  '    protected final synchronized String[] names()',
  '        throws IOException {',
  '        return null;',
  '    }',
  '}',
].join('\n');

const CSHARP = [
  'namespace Demo {',
  '    public class Gain {',
  '        public override async Task<int> Render(float[] buffer, int count) {',
  '            foreach (var x in buffer) { }',
  '            using (var s = Open()) { }',
  '            return 0;',
  '        }',
  '        internal static bool IsLoud(double level) {',
  '            lock (gate) { return level > 1.0; }',
  '        }',
  '    }',
  '}',
].join('\n');

test('definesOf on Java names each method on its own line, and no control keyword or anonymous class', () => {
  assert.deepEqual(definesOf(JAVA, '.java'), [['run', 6], ['countOf', 19], ['plain', 22], ['run', 24], ['names', 28]]);
});

test('definesOf on C# names its methods and none of foreach, using or lock', () => {
  assert.deepEqual(definesOf(CSHARP, '.cs'), [['Render', 3], ['IsLoud', 8]]);
});

// The trigger is a long run of blanked text: `//` comment lines blank to spaces, and the old pattern split one such run about n³
// ways (three 120-column comment lines took it 42 ms). A header of eight such lines, then 24 commented methods.
test('definesOf on Java stays linear on long comment lines: under 5 ms a call on 300 lines, where the old pattern took 42 ms on 3', () => {
  const header = Array.from({ length: 8 }, (_, i) => `// ${i}: ${'what this file decodes and why the census counts it, '.repeat(2)}`);
  const method = (i: number): string[] => [`    // step ${i}: ${'a note on the step and its operand, '.repeat(3)}`,
    `    public int step${i}(int a) {`, '        // a comment', `        return a + ${i};`, '    }', '', '', '', '', '', '', ''];
  const text = [...header, 'public class Big {', ...Array.from({ length: 24 }, (_, i) => method(i)).flat(), '}'].join('\n');
  assert.ok(text.split('\n').length >= 290);
  assert.equal(definesOf(text, '.java').length, 24);
  const runs: number[] = [];
  for (let k = 0; k < 5; k++) {
    const t = performance.now();
    definesOf(`${text}\n// ${k}\n`, '.java');
    runs.push(performance.now() - t);
  }
  const best = Math.min(...runs);
  assert.ok(best < 5, `best of 5 calls took ${best.toFixed(1)} ms`);
});
