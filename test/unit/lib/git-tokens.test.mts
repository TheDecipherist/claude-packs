// lib/git-tokens.mts: doctor's sweep of .git/config files for a token, never printing it.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { findings, tokenProblems } from '../../../lib/git-tokens.mjs';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const TOKEN = `ghp_${'a'.repeat(24)}`;

test('findings masks a credential in a URL and names a bare token without showing it', () => {
  const out = findings([`\turl = https://user:${TOKEN}@github.com/o/r.git`, `\textra = ${TOKEN}`, '\turl = https://github.com/o/r.git'].join('\n'));
  assert.deepEqual(out, ['url = https://***@github.com/o/r.git', 'extra = (a GitHub token)']);
  assert.ok(!out.join('').includes(TOKEN));
});

test('a nested clone and a sibling repo with a token are reported once each; a clean one is not', () => {
  const dir = scratchDir('tokens-');
  put(join(dir, 'proj/.git/config'), '[remote "o"]\n\turl = https://github.com/o/r.git\n');
  put(join(dir, 'proj/build/_deps/dep/.git/config'), `[remote "o"]\n\turl = https://x-access-token:${TOKEN}@github.com/o/d.git\n`);
  put(join(dir, 'sibling/.git/config'), `[remote "o"]\n\turl = https://${TOKEN}@github.com/o/s.git\n`);
  const problems = tokenProblems(join(dir, 'proj'), ['../sibling', '../missing']);
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /^build\/_deps\/dep\/\.git\/config holds a token/);
  assert.match(problems[1] ?? '', /^\.\.\/sibling\/\.git\/config holds a token/);
  assert.ok(!problems.join('').includes(TOKEN));
});

test('a linked worktree reads the common config its .git file points to', () => {
  const dir = scratchDir('tokens-wt-');
  put(join(dir, 'main/.git/config'), `[remote "o"]\n\turl = https://u:${TOKEN}@h.com/r.git\n`);
  put(join(dir, 'main/.git/worktrees/w/commondir'), '../..');
  put(join(dir, 'main/wt/.git'), `gitdir: ${join(dir, 'main/.git/worktrees/w')}\n`);
  const problems = tokenProblems(join(dir, 'main/wt'));
  assert.equal(problems.length, 1);
});
