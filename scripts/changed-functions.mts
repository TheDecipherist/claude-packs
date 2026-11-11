// Which top-level functions a diff touched in a JS module, and whether a test uses one (KWB-166): test-changed picks the tests
// that use a changed function, never every test that imports its module.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';

const esc = (n: string): string => n.replace(/\$/g, '\\$');

interface Declaration { name: string; from: number; to: number }

// The top-level functions a diff touched in a JS module (KWB-166, the user: "only if a type changes in a core function ... or a
// function in a core is rewritten completely should that trigger a full test suite"): each changed line belongs to the top-level
// declaration it falls in; an internal helper that changed counts for every declaration in the file that calls it. null when the
// file is new, gone or not a module: then the whole file counts, as before.
const DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*([\w$]+)|(?:const|let|var|class|interface|type)\s+([\w$]+))/;

/** The declarations of a module's lines, each running until the next top-level line that is code (a declaration, or a statement
 *  such as the `if (isMain(...))` at a hook's end, which belongs to no function). */
function declarationsOf(lines: readonly string[]): Declaration[] {
  const starts: { i: number; name: string | undefined }[] = [];
  lines.forEach((l, i) => { if (/^[^\s/}*)\]]/.test(l)) { const m = DECL.exec(l); starts.push({ i: i + 1, name: m ? (m[1] ?? m[2]) : undefined }); } });
  return starts.flatMap((st, k) => (st.name === undefined ? [] : [{ name: st.name, from: st.i, to: (starts[k + 1]?.i ?? lines.length + 1) - 1 }]));
}

export function changedNames(root: string, base: string, file: string, env: Env): Set<string> | null {
  if (!/\.(mjs|js|mts|cts|ts)$/.test(file) || !existsSync(join(root, file))) return null;   // TypeScript too (W2.6)
  const diff = gitRun(['diff', '-U0', base, '--', file], { cwd: root, env });
  if (!diff.ok || !diff.stdout) return null;
  const lines = (readText(join(root, file)) ?? '').split('\n');
  const decls = declarationsOf(lines);
  if (!decls.length) return null;
  const touched = new Set<string>();
  let header = false;
  for (const h of diff.stdout.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const from = Number(h[1]);
    const n = h[2] === undefined ? 1 : Number(h[2]);
    for (let l = Math.max(1, from); l < from + Math.max(1, n); l += 1) {
      const d = decls.find((x) => l >= x.from && l <= x.to);
      if (d) touched.add(d.name); else header = true;   // a change before the first declaration (imports, a header comment)
    }
  }
  if (header && !touched.size) return new Set();   // imports or comments only: no function changed
  // an internal helper that changed counts for each declaration that calls it, until nothing new is added
  for (let grew = true; grew;) {
    grew = false;
    for (const d of decls) if (!touched.has(d.name) && [...touched].some((n) => new RegExp(`\\b${esc(n)}\\b`).test(lines.slice(d.from - 1, d.to).join('\n')))) { touched.add(d.name); grew = true; }
  }
  return touched;
}

/** Whether code calls or imports any of `names`: `name(` or `{ name }`, never the word in prose. */
export const usesAny = (code: string, names: ReadonlySet<string>): boolean => [...names].some((n) => new RegExp(`\\b${esc(n)}\\s*\\(|[{,]\\s*${esc(n)}\\s*(?:,|}|as\\b)`).test(code));
