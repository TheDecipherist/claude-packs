// shell-writes --selftest: the shell routes and each inline-program form (KWB-8), read in a throwaway folder. Each case is
// [label, command, wanted] where wanted is [[path relative to the folder, op, content]] (content undefined: not judged).
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shellWrites } from './shell-writes.mjs';

const H = (lang, body) => `${lang} - <<'EOF'\n${body}\nEOF`;
const CASES = [
  // the shell's own routes
  ['cat heredoc into a file', "cat > s.cpp <<'EOF'\nint a;\nEOF", [['s.cpp', 'write', 'int a;\n']]],
  ['echo >>', 'echo hi >> a.txt', [['a.txt', 'append', 'hi\n']]],
  ['a variable set earlier names its folder (KWB-18)', "S=d; cat > $S/v.md <<'EOF'\nx\nEOF", [['d/v.md', 'write', 'x\n']]],
  ['${VAR} too, set from another variable', 'A=d; B=$A/e; echo hi > ${B}.txt', [['d/e.txt', 'write', 'hi\n']]],
  // a cd inside a child shell ends with it (KWB-117)
  ['a cd in $( ) stays inside it', 'T=$(cd d && ls); echo hi > e.txt', [['e.txt', 'write', 'hi\n']]],
  ['a cd in ( ) stays inside it', '(cd d && echo in > i.txt); echo hi > e.txt', [['d/i.txt', 'write', 'in\n'], ['e.txt', 'write', 'hi\n']]],
  ['a cd in backticks stays inside them', 'T=`cd d && ls`; echo hi > e.txt', [['e.txt', 'write', 'hi\n']]],
  ['a plain cd still moves what follows', 'cd d && echo hi > e.txt', [['d/e.txt', 'write', 'hi\n']]],
  // python, each form
  ['python heredoc: open(p, "w").write', H('python3', "open('x.cpp', 'w').write('int a;\\n')"), [['x.cpp', 'write', 'int a;\n']]],
  ['python -c: open(p, "a")', 'python3 -c "open(\'x.cpp\', \'a\').write(\'more\')"', [['x.cpp', 'append', 'more']]],
  ['python: open(p, "x")', 'python3 -c "open(\'n.cpp\', \'x\')"', [['n.cpp', 'write', null]]],
  ['python: with open(...) as f, f.write twice', H('python3', "with open('x.cpp', 'w') as f:\n    f.write('one\\n')\n    f.write('two\\n')"), [['x.cpp', 'write', 'one\ntwo\n']]],
  ['python: Path.write_text after read_text and replace', H('python3', "from pathlib import Path\np = Path('a.txt')\ns = p.read_text()\ns = s.replace('PLACE', 'X')\np.write_text(s)"), [['a.txt', 'write', 'alpha\nX\nomega\n']]],
  ['python: Path(...) / name write_bytes', 'python3 -c "from pathlib import Path; (Path(\'src\') / \'n.bin\').write_bytes(b\'k\')"', [['src/n.bin', 'write', null]]],
  ['python: json.dump into an open file', H('python3', "import json\nwith open('o.json', 'w') as f:\n    json.dump({'a': 1}, f)"), [['o.json', 'write', null]]],
  ['python: shutil.copy into a folder', 'python3 -c "import shutil; shutil.copy(\'a.txt\', \'d\')"', [['d/a.txt', 'copy', 'alpha\nPLACE\nomega\n']]],
  ['python: shutil.move', 'python3 -c "import shutil; shutil.move(\'a.txt\', \'b.txt\')"', [['b.txt', 'move', undefined], ['a.txt', 'delete', null]]],
  ['python: a path it cannot work out names every path', H('python3', "for n in ['src/a.cpp', 'src/b.cpp']:\n    open(n, 'w').write('x')"), [['src/a.cpp', 'write', null], ['src/b.cpp', 'write', null]]],
  ['python: cat heredoc piped in', "cat <<'EOF' | python3\nopen('z.txt', 'w').write('z')\nEOF", [['z.txt', 'write', 'z']]],
  // node
  ['node -e: fs.writeFileSync', 'node -e "require(\'fs\').writeFileSync(\'n.js\', \'let a = 1;\\n\')"', [['n.js', 'write', 'let a = 1;\n']]],
  ['node heredoc: appendFileSync', H('node', "const fs = require('fs');\nfs.appendFileSync('a.txt', 'tail\\n');"), [['a.txt', 'append', 'tail\n']]],
  ['node -e: copyFileSync', 'node -e "fs.copyFileSync(\'a.txt\', \'c.txt\')"', [['c.txt', 'copy', 'alpha\nPLACE\nomega\n']]],
  // perl, ruby
  ['perl -e: open(F, ">", p)', 'perl -e \'open(my $f, ">", "p.txt") or die; print $f "x";\'', [['p.txt', 'write', null]]],
  ['perl -e: two-argument open ">>p"', 'perl -e \'open(F, ">>log.txt"); print F "x";\'', [['log.txt', 'append', null]]],
  ['perl -pi -e on a file', "perl -pi -e 's/a/b/' a.txt", [['a.txt', 'edit', null]]],
  ['ruby -e: File.write', 'ruby -e \'File.write("r.txt", "hi")\'', [['r.txt', 'write', 'hi']]],
  ['ruby -i -pe on a file', "ruby -i -pe 'sub(/a/, \"b\")' a.txt", [['a.txt', 'edit', null]]],
  // never a write
  ['read-only python: open(p), open(p, "r"), read_text', H('python3', "from pathlib import Path\nprint(open('a.txt').read())\nprint(open('a.txt', 'r').read())\nprint(Path('a.txt').read_text())"), []],
  ['read-only node: readFileSync', 'node -e "console.log(require(\'fs\').readFileSync(\'a.txt\', \'utf8\'))"', []],
  ['read-only perl -ne', "perl -ne 'print' a.txt", []],
  ['a script file is the project\'s tool', 'python3 tools/x.py a.txt', []],
  ['a script file with a heredoc on stdin', "python3 tools/x.py <<'EOF'\nopen('q.txt', 'w')\nEOF", []],
  ['python -m', 'python3 -m json.tool a.txt', []],
  ['node script', 'node tools/x.mjs out.txt', []],
  ['a program that only prints', 'python3 -c "print(\'src/a.cpp\')"', []],
];

export function selftest() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cp-shell-writes-')));
  const bad = [];
  try {
    writeFileSync(join(dir, 'a.txt'), 'alpha\nPLACE\nomega\n');
    mkdirSync(join(dir, 'd'));
    for (const [label, command, want] of CASES) {
      const got = shellWrites(command, dir).map((w) => [w.path.slice(dir.length + 1), w.op, w.content]);
      const same = got.length === want.length && want.every(([p, op, c], k) => got[k][0] === p && got[k][1] === op && (c === undefined || got[k][2] === c));
      if (!same) bad.push(`${label}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const b of bad) console.error(`shell-writes selftest FAILED: ${b}`);
  if (!bad.length) console.log(`shell-writes selftest: OK (${CASES.length} cases)`);
  return bad.length ? 1 : 0;
}
