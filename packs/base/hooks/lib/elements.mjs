// Elements built by hand (0.23.0: anything "component" used more than once is a template, in html, c++ and apps). once-only compares
// code as written, so two controls that differ in their names and text look different to it. Here names and text are stripped, and what is
// left is the element's shape: copies of one element have one shape.
//   markup   an element and its children: tags, attribute names, nesting (HTML, JSX, Vue, Svelte, template strings)
//   code     setups, runs of statements and tables written as code (lib/code-shapes.mjs)
// Using a template is never a shape: a capitalised tag (<Knob ... />) is a component, and a list from .map() appears once.
//   shapesOf(text, ext) -> [{ id, kind, line, what }]     codeFiles(root, skipGlobs) -> [rel]
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { codeShapes } from './code-shapes.mjs';
import { matchesAny } from './glob.mjs';
import { emittedFrom, extsOf } from './source-exts.mjs';

export const CODE = extsOf('c', 'cpp', 'objc', 'js', 'ts');
export const MARKUP = extsOf('markup', 'js', 'ts');
export const SKIP = /(^|\/)(\.git|node_modules|build|Builds|dist|out|target|_deps|JUCE|JuceLibraryCode|third_party|vendor|Pods|venv|\.venv|site-packages|__pycache__|\.tox|\.next|coverage|cmake-build[^/]*|\.claude)(\/|$)/;
export const TESTS = ['tests/**', 'test/**', '**/tests/**', '**/test/**', '**/*.test.*', '**/*.spec.*', '**/*_test.*'];

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<(\/?)([A-Za-z][\w.:-]*)((?:[^<>{}"'`]|"[^"]*"|'[^']*'|`[^`]*`|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>/g;
const ATTR = /([A-Za-z_:@][\w:.-]*)(?==|\s|$)/g;
const MIN_NODES = 4; // the element, and at least three more tags or attributes: a bare <li> is not a component

const attrsOf = (raw) => [...raw.replace(/"[^"]*"|'[^']*'|`[^`]*`|\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ').matchAll(ATTR)].map((m) => m[1]).sort();
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Every plain element with its children, as one string. An unclosed or unbalanced tag ends the walk for that branch, never the file.
function markupShapes(text) {
  const out = [];
  const stack = [];
  for (const m of text.matchAll(TAG)) {
    const [, close, tag, attrs, self] = m;
    if (close) {
      const at = stack.map((e) => e.tag).lastIndexOf(tag);
      if (at === -1) continue;
      stack.length = at + 1;
      const el = stack.pop();
      const shape = `${el.tag}[${el.attrs.join(',')}](${el.kids.join('')})`;
      stack.at(-1)?.kids.push(shape);
      if (stack.at(-1)) stack.at(-1).nodes += el.nodes;
      if (/^[a-z]/.test(el.tag) && el.nodes >= MIN_NODES && el.kids.length >= 1) out.push({ id: `m:${shape}`, kind: 'markup', line: lineOf(text, el.index), what: `<${el.tag}>`, nodes: el.nodes });
      continue;
    }
    const names = attrsOf(attrs);
    if (self || VOID.has(tag.toLowerCase())) {
      const top = stack.at(-1);
      if (top) { top.kids.push(`${tag}[${names.join(',')}]`); top.nodes += 1 + names.length; }
      continue;
    }
    stack.push({ tag, attrs: names, kids: [], nodes: 1 + names.length, index: m.index });
  }
  // Keep the largest: the parts of a repeated element repeat too.
  return out.filter((s) => !out.some((o) => o !== s && o.id.length > s.id.length && o.id.includes(s.id.slice(2))));
}

export function shapesOf(text, ext) {
  return [...(MARKUP.has(ext) ? markupShapes(text) : []), ...codeShapes(text, ext)];
}

// A short setup needs a third copy to be a pattern (two members; three on one name, the same habit in two files). Rows are a fault on their own.
export const copiesNeeded = (shape, oneName = false) => (shape.kind === 'rows' ? 1 : shape.kind === 'setup' && (shape.nodes < 3 || (shape.nodes === 3 && oneName)) ? 3 : 2);

// What the law leaves alone: `protected` globs, folders of kind copy (a tree kept the same as its source on purpose) and `guards.templates.exclude`.
export const skippedBy = (layout) => [...(layout.protected ?? []), ...(layout.guards?.templates?.exclude ?? []),
  ...Object.values(layout.folders ?? {}).filter((f) => f.kind === 'copy').map((f) => `${f.path}/**`)];

// What each kind of repeat becomes: the refusal and the scan say it, so a repeat is never only named.
export const TEMPLATE = {
  markup: 'one component, with the differences passed in',
  setup: 'one factory function: it builds the object from its arguments',
  run: 'one function, with the differences as parameters',
  rows: 'one table of the arguments, and one loop',
};

export function codeFiles(root, skipGlobs = [], exts = CODE) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (SKIP.test(rel) || matchesAny(rel, skipGlobs)) continue;
      if (e.isDirectory()) walk(abs);
      else if (exts.has(extname(e.name)) && !emittedFrom(abs) && statSync(abs).size < 400_000) out.push(rel);   // an emitted twin is the build's (KWB-170)
    }
  };
  walk(root);
  return out;
}
