// 0.14.0 (Tim, 2026-11-04): a UI renders what comes from a database through one renderer: \r correct, code highlighted, markdown parsed,
// and sanitized, because turning stored text into HTML is how a stored script reaches a page.
import { assert, cli, fresh, hookRun, join, readFileSync, run, test } from './kit-cli.mjs';

const write = (dir, rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
const refused = (dir, rel, content, id) => {
  const r = write(dir, rel, content);
  assert.equal(r.status, 2, `${rel}: ${content}`);
  assert.match(r.stderr, new RegExp(id));
};
const installed = (...packs) => { const dir = fresh('stext-'); run(dir, 'init', ...packs); return dir; };

test('the UI presets and the full-stack configuration bring the pack; the rule reaches markup', () => {
  for (const preset of ['node-ui', 'next-app']) {
    assert.ok(JSON.parse(readFileSync(join(installed(preset), '.claude/claude-packs.lock.json'), 'utf8')).packs.includes('stored-text'), preset);
  }
  const dir = fresh('stext-fs-');
  assert.equal(cli(dir, 'init', '--config', 'full-stack').status, 0);
  assert.match(readFileSync(join(dir, '.claude/rules/stored-text-renders-once.md'), 'utf8'), /\*\*\/\*\.tsx/);
});

test('stored text in markup is refused in JSX and in server templates; the renderer, labels and marked plain fields pass', () => {
  const dir = installed('js-ts', 'stored-text');
  const id = 'stored-text-through-renderer';
  refused(dir, 'src/ui/Row.tsx', '<p>{row.body}</p>\n', id);
  refused(dir, 'src/ui/Log.tsx', '<pre>{msg?.content}</pre>\n', id);
  refused(dir, 'src/ui/page.ts', 'const h = `<li>${esc(row.transcript)}</li>`;\n', id);
  assert.equal(write(dir, 'src/ui/Ok.tsx', '<StoredText source={row.body} />\n<td>{row.title}</td>\n').status, 0);
  assert.equal(write(dir, 'src/ui/Label.tsx', '<td>{row.content}</td> {/* plain text: an enum label */}\n').status, 0);
  assert.equal(write(dir, 'src/ui/Req.ts', 'const u = `${req.body}`;\n').status, 0);
  assert.equal(write(dir, 'src/server/handler.ts', 'const u = `${row.body}`;\n').status, 0);
});

test('raw HTML and a second markdown path are refused; the one renderer must do all four jobs', () => {
  const dir = installed('js-ts', 'stored-text');
  refused(dir, 'src/ui/A.tsx', '<div dangerouslySetInnerHTML={{ __html: row.html }} />\n', 'no-raw-html-from-data');
  refused(dir, 'src/client.ts', 'el.innerHTML = row.html;\n', 'no-raw-html-from-data');
  assert.equal(write(dir, 'src/client2.ts', "el.innerHTML = '';\n").status, 0);
  refused(dir, 'src/ui/B.tsx', "import ReactMarkdown from 'react-markdown';\n", 'stored-text-libs-only-in-renderer');
  refused(dir, 'src/page.ts', "import hljs from 'highlight.js/lib/core';\n", 'stored-text-libs-only-in-renderer');
  const partial = "import { marked } from 'marked';\nexport const renderStored = (t: string) => marked.parse(t.replace(/\\r\\n?/g, '\\n'));\n";
  const r = write(dir, 'src/lib/stored-text.ts', partial);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /stored-text-renderer-complete/);
  assert.match(r.stderr, /sanitize/);
  assert.match(r.stderr, /shiki/);
  const whole = "import { marked } from 'marked';\nimport { codeToHtml } from 'shiki';\nimport sanitizeHtml from 'sanitize-html';\nexport const renderStored = (t: string) => sanitizeHtml(marked.parse(t.replace(/\\r\\n?/g, '\\n')));\n";
  assert.equal(write(dir, 'src/lib/stored-text.ts', whole).status, 0);
});
