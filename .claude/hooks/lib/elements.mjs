// Elements built by hand (0.23.0; Tim: anything "component" used more than once is a template, in html, c++ and apps). once-only compares
// code as written, so two controls that differ in their names and text look different to it. Here names and text are stripped, and what is
// left is the element's shape: copies of one element have one shape.
//   markup   an element and its children: tags, attribute names, nesting (HTML, JSX, Vue, Svelte, template strings)
//   setup    one object configured line by line: the members called on it, in order (a C++ control, a widget, a DOM node)
// Using a template is never a shape: a capitalised tag (<Knob ... />) is a component, and a list from .map() appears once.
//   shapesOf(text, ext) -> [{ id, kind, line, what }]     codeFiles(root, skipGlobs) -> [rel]
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { blankCode } from './cpp-scan.mjs';
import { matchesAny } from './glob.mjs';

export const CODE = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.mm', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
export const MARKUP = new Set(['.html', '.htm', '.vue', '.svelte', '.tsx', '.jsx', '.ts', '.js', '.mjs']);
export const SKIP = /(^|\/)(\.git|node_modules|build|Builds|dist|out|_deps|JUCE|JuceLibraryCode|cmake-build[^/]*|\.claude)(\/|$)/;
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

// Runs of statements on one receiver: `cutoff.setRange (...); cutoff.setValue (...); addAndMakeVisible (cutoff);`
function setupShapes(text) {
  const out = [];
  let run = null;
  const flush = () => {
    if (run && new Set(run.members).size >= 2 && run.members.length >= 2) out.push({ id: `o:${run.members.join(',')}`, kind: 'setup', line: run.line, what: run.name, nodes: run.members.length });
    run = null;
  };
  blankCode(text).split('\n').forEach((raw, i) => {
    const on = raw.match(/^\s*([A-Za-z_]\w*)\s*(?:\.|->)\s*([A-Za-z_]\w*)/);
    const passed = run && raw.match(new RegExp(`^\\s*([A-Za-z_]\\w*)\\s*\\(\\s*&?\\s*${run.name}\\s*\\)`));
    if (on && run?.name === on[1]) run.members.push(on[2]);
    else if (passed) run.members.push(`${passed[1]}()`);
    else {
      flush();
      if (on) run = { name: on[1], members: [on[2]], line: i + 1 };
    }
  });
  flush();
  return out;
}

export function shapesOf(text, ext) {
  return [...(MARKUP.has(ext) ? markupShapes(text) : []), ...(CODE.has(ext) ? setupShapes(text) : [])];
}

// A setup of two members needs a third copy to be a pattern; everything larger is a copy at two.
export const copiesNeeded = (shape) => (shape.kind === 'setup' && shape.nodes < 3 ? 3 : 2);

export function codeFiles(root, skipGlobs = [], exts = CODE) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (SKIP.test(rel) || matchesAny(rel, skipGlobs)) continue;
      if (e.isDirectory()) walk(abs);
      else if (exts.has(extname(e.name)) && statSync(abs).size < 400_000) out.push(rel);
    }
  };
  walk(root);
  return out;
}
