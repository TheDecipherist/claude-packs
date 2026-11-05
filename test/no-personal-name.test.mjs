// The kit is for everyone: nothing it ships or keeps in its repo names one person. lib/settings.mjs keeps one old hook name, so a project that
// still runs it can be moved on.
import { KIT, assert, execFileSync, join, readFileSync, test } from './kit-cli.mjs';

const NAME = new RegExp(['\\b[Tt]' + 'im\\b', 'Clau' + 'sen', 'ti' + 'ms-', 'ti' + 'm-writing', 'tim_' + 'carter'].join('|'));
const LEFT_OUT = new Set(['lib/settings.mjs']);

test('no file names a person', () => {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: KIT, encoding: 'utf8' }).split('\n').filter((f) => f && !LEFT_OUT.has(f));
  const hits = [];
  for (const f of files.filter((name) => !name.startsWith('test/fixtures/'))) { // real projects' files, kept verbatim and never shipped
    if (NAME.test(f)) hits.push(f);
    let text = '';
    try { text = readFileSync(join(KIT, f), 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => { if (NAME.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 90)}`); });
  }
  assert.deepEqual(hits, []);
});
