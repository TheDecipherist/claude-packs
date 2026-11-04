// 0.15.0: text that goes public reads like a person wrote it. humanize split into small pieces: rules on public text,
// one-job skills, and a lesson check for each tell a regex can see. "prose": true leaves code and URLs out.
import { KIT, assert, cli, fresh, hookRun, join, readFileSync, readdirSync, run, test } from './kit-cli.mjs';

const write = (dir, rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
const skills = readdirSync(join(KIT, 'packs/writing/skills'));

test('every configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes', () => {
  for (const config of readdirSync(join(KIT, 'configurations'))) {
    const dir = fresh('wr-');
    assert.equal(cli(dir, 'init', '--config', config).status, 0, config);
    assert.ok(readFileSync(join(dir, '.claude/rules/cut-the-padding.md'), 'utf8').includes('README*'), config);
    assert.equal(cli(dir, 'doctor', '--strict').status, 0, config);
  }
});

test('each skill has one job and fits: Use when, under 8,000 characters', () => {
  assert.ok(skills.length >= 10);
  for (const s of skills) {
    const text = readFileSync(join(KIT, 'packs/writing/skills', s, 'SKILL.md'), 'utf8');
    assert.match(text, /^---\nname: [\w-]+\ndescription: Use when /, s);
    assert.ok(text.length < 8000, `${s}: ${text.length}`);
  }
});

test('the measured data came across: the sub table, the templates and the registers', () => {
  const read = (s) => readFileSync(join(KIT, 'packs/writing/skills', s, 'SKILL.md'), 'utf8');
  assert.match(read('pick-subreddit'), /\| ExperiencedDevs \| watercooler \| 71 \| 69 \| 2 \|/);
  assert.match(read('reddit-post'), /\*\*E\. Argument post/);
  assert.match(read('post-voice'), /Narrates in the order it happened/);
  assert.match(read('reply-moves'), /Hooks are the only thing that can cover you/);
});

test('the tells are refused in public text, by id; code, URLs and other files are left alone', () => {
  const dir = fresh('wr-tells-');
  run(dir, 'init', '--config', 'base');
  for (const [text, id] of [
    ['It works — mostly.\n', 'ascii-no-em-dash'], ['It works -- mostly.\n', 'ascii-no-em-dash'], ['A “quoted” word.\n', 'ascii-no-em-dash'],
    ["Here's the thing: it broke.\n", 'no-stock-connectors'], ['A robust tool.\n', 'no-slop-words'], ['The reality: nobody reads it.\n', 'no-dramatic-colon'],
    ['It serves as the entry.\n', 'no-copula-dodging'], ['It is fast, ensuring a smooth run.\n', 'no-trailing-ing'], ['Leveraging the cache, it flies.\n', 'no-participial-opener'],
    ['Experts say it is fine.\n', 'no-vague-attribution'], ['There is no one-size-fits-all answer.\n', 'no-pseudo-wisdom'],
    ["It's not a bug. It's a feature.\n", 'no-not-x-but-y'], ['I built this last year.\n', 'no-time-or-date'],
  ]) {
    const r = write(dir, 'README.md', text);
    assert.equal(r.status, 2, text);
    assert.match(r.stderr, new RegExp(id));
  }
  assert.equal(write(dir, 'README.md', 'Run `npm test -- a` first.\n\n```sh\nnpm test -- a — b\n```\n\nSee [the docs](https://x.dev/a--b-robust).\n').status, 0);
  assert.equal(write(dir, 'bugs.md', 'A robust fix — last year.\n').status, 0, 'an internal file is not public text');
  assert.equal(write(dir, 'docs/manual/start.md', 'I wrote this page after the third time someone asked.\n').status, 0);
  assert.equal(write(dir, 'docs/manual/bad.md', 'A seamless start.\n').status, 2);
});
