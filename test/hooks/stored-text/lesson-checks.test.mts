// The stored-text pack's checks, fired through the base lesson-checks hook (0.14.0): a UI renders what comes from a database through
// one renderer: \r correct, code highlighted, markdown parsed, and sanitized, because turning stored text into HTML is how a stored
// script reaches a page. The pack's presets and rule: stored-text-pack.test.mts.
import assert from 'node:assert/strict';
import test from 'node:test';
import { extraFixture } from '../hook-rig.mts';
import { assertRefused, assertTaken, lintWrite } from '../lesson-cases.mts';

const installed = (): string => extraFixture('js-ts-stored-text', ['js-ts', 'stored-text']);

test('stored text in markup is refused in JSX and in server templates; the renderer, labels and marked plain fields pass', () => {
  const dir = installed();
  const id = 'stored-text-through-renderer';
  assertRefused(dir, 'src/ui/Row.tsx', '<p>{row.body}</p>\n', id);
  assertRefused(dir, 'src/ui/Log.tsx', '<pre>{msg?.content}</pre>\n', id);
  assertRefused(dir, 'src/ui/page.ts', 'const h = `<li>${esc(row.transcript)}</li>`;\n', id);
  assertTaken(dir, 'src/ui/Ok.tsx', '<StoredText source={row.body} />\n<td>{row.title}</td>\n');
  assertTaken(dir, 'src/ui/Label.tsx', '<td>{row.content}</td> {/* plain text: an enum label */}\n');
  assertTaken(dir, 'src/ui/Req.ts', 'const u = `${req.body}`;\n');
  assertTaken(dir, 'src/server/handler.ts', 'const u = `${row.body}`;\n');
});

test('raw HTML and a second markdown path are refused; the one renderer must do all four jobs', () => {
  const dir = installed();
  assertRefused(dir, 'src/ui/A.tsx', '<div dangerouslySetInnerHTML={{ __html: row.html }} />\n', 'no-raw-html-from-data');
  assertRefused(dir, 'src/client.ts', 'el.innerHTML = row.html;\n', 'no-raw-html-from-data');
  assertTaken(dir, 'src/client2.ts', "el.innerHTML = '';\n");
  assertRefused(dir, 'src/ui/B.tsx', "import ReactMarkdown from 'react-markdown';\n", 'stored-text-libs-only-in-renderer');
  assertRefused(dir, 'src/page.ts', "import hljs from 'highlight.js/lib/core';\n", 'stored-text-libs-only-in-renderer');
  const partial = "import { marked } from 'marked';\nexport const renderStored = (t: string) => marked.parse(t.replace(/\\r\\n?/g, '\\n'));\n";
  const r = assertRefused(dir, 'src/lib/stored-text.ts', partial, 'stored-text-renderer-complete');
  assert.match(r.stderr, /sanitize/);
  assert.match(r.stderr, /shiki/);
  const whole = "import { marked } from 'marked';\nimport { codeToHtml } from 'shiki';\nimport sanitizeHtml from 'sanitize-html';\nexport const renderStored = (t: string) => sanitizeHtml(marked.parse(t.replace(/\\r\\n?/g, '\\n')));\n";
  assert.equal(lintWrite(dir, 'src/lib/stored-text.ts', whole).status, 0);
});
