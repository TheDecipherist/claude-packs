// 1.6.1: `npm run release` makes the npm package, the tag and the GitHub release from one version and its CHANGELOG section, and
// refuses a repo that is not ready. Its parts are judged here without touching npm or GitHub.
import { assert, test } from './kit-cli.mts';
import { gitWithToken, githubRemote, notesFor, plan, refusals } from '../scripts/release.mjs';

const CHANGELOG = '# Changelog\n\n## Unreleased\n\n- next\n\n## 1.6.1 (2026-11-10)\n\n- the release script\n- the disclaimer\n\n## 1.6.0 (2026-11-09)\n\n- the planner\n';

test('the release notes are the version\'s own CHANGELOG section, and a missing or empty one is refused', () => {
  assert.equal(notesFor(CHANGELOG, '1.6.1'), '- the release script\n- the disclaimer');
  assert.equal(notesFor(CHANGELOG, '1.6.0'), '- the planner', 'the last section runs to the end');
  assert.throws(() => notesFor(CHANGELOG, '1.7.0'), /no "## 1\.7\.0" section/);
  assert.throws(() => notesFor('## 1.6.2\n\n## 1.6.1\n- x\n', '1.6.2'), /is empty/);
  assert.throws(() => notesFor(CHANGELOG, '1.6'), /no "## 1\.6" section/, 'a version is matched whole, never as a prefix');
});

test('GitHub is reached over HTTPS with the token from the environment, never through an SSH origin (KWB-143)', () => {
  // the main checkout's origin was the SSH URL, and port 22 timed out while the token sat in the environment unused
  assert.equal(githubRemote('git@github.com:TheDecipherist/claude-packs.git'), 'https://github.com/TheDecipherist/claude-packs.git');
  assert.equal(githubRemote('https://github.com/TheDecipherist/claude-packs'), 'https://github.com/TheDecipherist/claude-packs.git');
  assert.throws(() => githubRemote('git@gitlab.com:a/b.git'), /not a GitHub remote/);
  const args = gitWithToken('push', 'https://github.com/a/b.git', 'v1.0.0').join(' ');
  assert.match(args, /credential\.helper=!f\(\) \{ echo username=x-access-token; echo "password=\$GH_TOKEN"; \}; f/);
  assert.doesNotMatch(args, /ssh|git@/, 'no SSH');
  assert.match(refusals({ branch: 'main', dirty: false, local: 'a', remote: 'a', token: false }).join(), /GH_TOKEN is not set/);
});

test('a release is refused off main, on a dirty tree, and when main is not GitHub\'s main', () => {
  const ready = { branch: 'main', dirty: false, local: 'abc1234def', remote: 'abc1234def', token: true };
  assert.deepEqual(refusals(ready), []);
  assert.match(refusals({ ...ready, branch: 'work/1.6.1-release' }).join(), /a release is made from main/);
  assert.match(refusals({ ...ready, dirty: true }).join(), /uncommitted/);
  assert.match(refusals({ ...ready, remote: 'fff0000aaa' }).join(), /is not GitHub's main/);
  assert.match(refusals({ ...ready, remote: '' }).join(), /none/, 'a remote with no main says so');
});

test('the steps run in order, and a step already done is skipped, so a stopped release is finished by running it again', () => {
  const steps = (done) => plan({ name: '@x/kit', version: '1.6.1', ...done }).map((s) => `${s.act}:${s.done}`);
  assert.deepEqual(steps({ published: false, tagged: false, released: false }), ['publish:false', 'tag:false', 'release:false']);
  assert.deepEqual(steps({ published: true, tagged: false, released: false }), ['publish:true', 'tag:false', 'release:false']);
  assert.deepEqual(steps({ published: true, tagged: true, released: true }), ['publish:true', 'tag:true', 'release:true']);
  assert.match(plan({ name: '@x/kit', version: '1.6.1', published: false }).map((s) => s.step).join(' | '), /npm publish @x\/kit@1\.6\.1 \| tag v1\.6\.1 on GitHub \| GitHub release v1\.6\.1/);
});
