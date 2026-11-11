// content.mts: published text is content, a folder under a code root is code, and a layout can name more.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isContent } from '../../../packs/base/hooks/lib/content.mts';

test('articles, posts, tutorials and samples are content', () => {
  for (const rel of ['articles/a.md', 'blog/2026/x.md', 'docs/tutorials/compose.yml', 'examples/key.json', '_posts/a.md']) assert.equal(isContent(rel), true, rel);
});

test('a folder under a code root is code, not content: a planted wrong input', () => {
  for (const rel of ['src/app/blog/page.tsx', 'lib/content/a.ts', 'app/examples/x.ts', 'packages/web/posts/a.ts']) assert.equal(isContent(rel), false, rel);
  assert.equal(isContent('src/main.ts'), false);
});

test('the layout\'s own content globs add to the built-in ones, and a malformed list is ignored', () => {
  assert.equal(isContent('handouts/a.md', { guards: { content: ['handouts/**'] } }), true);
  assert.equal(isContent('handouts/a.md'), false);
  assert.equal(isContent('handouts/a.md', { guards: { content: 'handouts/**' } }), false);
  assert.equal(isContent('handouts/a.md', { guards: { content: [7] } }), false);
});
