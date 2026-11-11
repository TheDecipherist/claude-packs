// Which top-level functions a diff touched in a JS module, and whether a test uses one (KWB-166): test-changed picks the tests
// that use a changed function, never every test that imports its module.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const git = (root, ...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
const esc = (n) => n.replace(/\$/g, '\\$');

// The top-level functions a diff touched in a JS module (KWB-166, the user: "only if a type changes in a core function ... or a
// function in a core is rewritten completely should that trigger a full test suite"): each changed line belongs to the top-level
// declaration it falls in; an internal helper that changed counts for every declaration in the file that calls it. null when the
// file is new, gone or not a module: then the whole file counts, as before.
const DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*([\w$]+)|(?:const|let|var|class)\s+([\w$]+))/;
export function changedNames(root, base, file) {
  if (!/\.(mjs|js)$/.test(file) || !existsSync(join(root, file))) return null;
  const diff = git(root, 'diff', '-U0', base, '--', file);
  if (diff.status !== 0 || !diff.stdout) return null;
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const decls = [];
  // a top-level declaration runs until the next top-level line that is code (a declaration, or a statement such as the
  // `if (isMain(...))` at a hook's end, which belongs to no function)
  const starts = [];
  lines.forEach((l, i) => { if (/^[^\s/}*)\]]/.test(l)) starts.push({ i: i + 1, m: DECL.exec(l) }); });
  starts.forEach((st, k) => { if (st.m) decls.push({ name: st.m[1] ?? st.m[2], from: st.i, to: (starts[k + 1]?.i ?? lines.length + 1) - 1 }); });
  if (!decls.length) return null;
  const touched = new Set();
  let header = false;
  for (const h of diff.stdout.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const from = Number(h[1]); const n = h[2] === undefined ? 1 : Number(h[2]);
    for (let l = Math.max(1, from); l < from + Math.max(1, n); l += 1) {
      const d = decls.find((x) => l >= x.from && l <= x.to);
      if (d) touched.add(d.name); else header = true;   // a change before the first declaration (imports, a header comment)
    }
  }
  if (header && !touched.size) return new Set();   // imports or comments only: no function changed
  // an internal helper that changed counts for each declaration that calls it, until nothing new is added
  for (let grew = true; grew;) {
    grew = false;
    for (const d of decls) if (!touched.has(d.name) && [...touched].some((n) => new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`).test(lines.slice(d.from - 1, d.to).join('\n')))) { touched.add(d.name); grew = true; }
  }
  return touched;
}

/** Whether code calls or imports any of `names`: `name(` or `{ name }`, never the word in prose. */
export const usesAny = (code, names) => [...names].some((n) => new RegExp(`\\b${esc(n)}\\s*\\(|[{,]\\s*${esc(n)}\\s*(?:,|}|as\\b)`).test(code));
