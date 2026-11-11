// What base and the kit's reading of a project hold, with no hook of their own: what `suggest` and `scan` find in a project (0.25.0,
// 0.32.0: six real repos read wrongly), the packs `init --auto` then installs, and the rules and skills every install carries.
// The hooks' own refusals are in the file of each hook.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildFolders } from '../../../lib/repo-weight.mts';
import { lockOf } from '../../fixtures/installs.mts';
import { KIT, cli, fresh, git, projectWith, rmSync, run, selftest, spawnSync, writeFileSync } from '../../kit-cli.mts';
import { FILES } from '../../../lib/global.mts';
import { isContent } from '../../../packs/base/hooks/lib/content.mts';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { shellWrites } from '../../../packs/base/hooks/lib/shell-writes.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

const project = (files: Readonly<Record<string, string>>): string => projectWith(files);
const suggested = (dir: string): string => cli(dir, 'suggest').stdout;
const packLine = (pack: string): RegExp => new RegExp(`^ +${pack} `, 'm');
const SYNTH = { 'src/PluginProcessor.cpp': 'void P::processBlock () {}\n', 'src/PluginEditor.cpp': '// x\n' };

test('suggest reads the project and init --auto installs exactly that', () => {
  const dir = projectWith({ 'src/a.py': 'print(1)\n', 'src/b.py': 'print(2)\n', 'src/run.sh': '#!/usr/bin/env bash\nset -euo pipefail\n', 'Dockerfile': 'FROM x\n' }, 'auto-');
  const said = cli(dir, 'suggest');
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /configuration: python/);
  assert.match(said.stdout, /python +Python source: src\/a\.py/);
  assert.match(said.stdout, /shell +shell script: src\/run\.sh/);
  assert.match(said.stdout, /docker +file: Dockerfile/);
  assert.ok(!existsSync(join(dir, '.claude')), 'suggest writes nothing');
  const r = cli(dir, 'init', '--auto');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const packs = lockOf(dir).packs ?? [];
  for (const p of ['python', 'shell', 'docker']) assert.ok(packs.includes(p), p);
  assert.ok(!packs.includes('mongo'));
});

test('the kit\'s own files in a project are no evidence about it', () => {
  const said = suggested(project({ ...SYNTH, '.claude/rules/audio-thread-realtime-safe.md': '# x\n', '.claude/hooks/x.py': '# x\n' }));
  assert.doesNotMatch(said, packLine('reverse-engineering'));
  assert.doesNotMatch(said, packLine('python'));
});

const RE_EVIDENCE: ReadonlyArray<readonly [why: string, files: Readonly<Record<string, string>>]> = [
  ['firmware findings in its research', { 'docs/research.md': '# Research\n\nThe table is at 0x6A3B4 [FW].\n' }],
  ['a disassembler in its tools', { 'tools/re/x86dis.py': '# x\n' }],
  ['notes named for a machine', { 'docs/lexicon-pcm81-re.md': '# x\n' }],
];
for (const [why, files] of RE_EVIDENCE) {
  test(`a reverse-engineering project is known by ${why}`, () => {
    assert.match(suggested(project({ ...SYNTH, ...files })), packLine('reverse-engineering'));
  });
}

test('MIDI is known by what the code does, not only by a file name', () => {
  const dir = project({ ...SYNTH, 'src/Engine.cpp': 'if (m.isNoteOn()) start (m);\n' });
  assert.match(suggested(dir), packLine('midi'));
  assert.doesNotMatch(suggested(project(SYNTH)), packLine('midi'));
});

test('a project that names its configuration is read as that', () => {
  const dir = project({ 'lib/app.cpp': '// x\n', '.claude/layout.json': JSON.stringify({ configuration: 'synth-creator' }) });
  assert.match(suggested(dir), /configuration: synth-creator \(named in its layout\.json\)/);
});

test('a build folder is known by what the build leaves, and scan neither reads it nor hides it', () => {
  const files = ['src/a.cpp', 'build-reso/CMakeCache.txt', 'build-reso/CMakeFiles/x.make', 'build-reso/sub/CMakeFiles/y.make', 'build-reso/juce/BinaryData1.cpp', 'tools/CMakeLists.txt'];
  assert.deepEqual(buildFolders(files), ['build-reso/']);
  const table = `const int t[] = {${Array.from({ length: 40 }, (_, i) => i).join(', ')}};\n`;
  const dir = project({ 'src/a.cpp': 'int a;\n', 'build-reso/CMakeCache.txt': 'x\n', 'build-reso/gen/data.cpp': table, 'tools/re/x.py': '# x\n' });
  git(dir, 'init', '-q');
  git(dir, 'add', '-f', '.');
  const said = cli(dir, 'scan');
  assert.equal(said.status, 0, said.stderr);
  const report = /Report: (\S+)/.exec(said.stdout)?.[1];
  assert.ok(report, said.stdout);
  const text = readFileSync(report, 'utf8');
  assert.match(text, /build output held in git: build-reso\/ \(2 of 4 files\)/);
  assert.doesNotMatch(text, /no-rom-table-literal/);
});

test('a new reverse-engineering project with no code yet gets the pack, from its notes alone', () => {
  const dir = project({ 'docs/research.md': '# Research\n\nThe reset vector is at 0x0000 [FW].\n' });
  assert.match(suggested(dir), packLine('reverse-engineering'));
  assert.equal(cli(dir, 'init', '--auto').status, 0);
  assert.ok(existsSync(join(dir, '.claude/skills/names-first/SKILL.md')));
  assert.ok(existsSync(join(dir, '.claude/tools/names-sweep.mjs')));
});

test('installed dependencies are no evidence about a project, even before it has a .gitignore', () => {
  const dir = project({ 'docs/research.md': '# Research\n\nThe reset vector is at 0x0000 [FW].\n', 'node_modules/kit/bin/x.mjs': '// x\n', 'node_modules/kit/hooks/h.mjs': '// x\n', 'node_modules/kit/a.py': '# x\n' });
  git(dir, 'init', '-q');
  const said = suggested(dir);
  assert.doesNotMatch(said, /node_modules/);
  assert.doesNotMatch(said, /configuration: node/);
  assert.match(said, packLine('reverse-engineering'));
});

test('full-stack is a composition: the stack choice is its own pack, and the rest is packs any project can take', () => {
  const dir = extraFixture('http-api-zod-node', ['http-api', 'zod', '--config', 'node']);
  for (const f of ['rules/routes-are-thin.md', 'rules/one-error-contract.md', 'rules/apis-are-versioned.md', 'rules/zod-4-schemas.md', 'hooks/schemas-only.mjs']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  assert.ok(!existsSync(join(dir, '.claude/hooks/stack-guard.mjs')), 'the stack choice stays with full-stack');
  const stack = fixture('full-stack');
  for (const f of ['hooks/stack-guard.mjs', 'hooks/schemas-only.mjs', 'rules/tests-use-inject.md', 'rules/dockerfile-multistage.md', 'rules/pointer-feedback.md', 'rules/three-layers.md']) assert.ok(existsSync(join(stack, '.claude', f)), f);
});

test('finished work lands: the rule and the skill come with git-guard, in every install', () => {
  const dir = fixture('base');
  assert.match(readFileSync(join(dir, '.claude/rules/finished-work-lands.md'), 'utf8'), /merged into the trunk and pushed/);
  assert.match(readFileSync(join(dir, '.claude/skills/land-branch/SKILL.md'), 'utf8'), /^---\nname: land-branch\ndescription: Use when /);
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
});

test('a PDF is read with its pictures: figures exported, every page rendered, never a placeholder', () => {
  const skill = readFileSync(join(KIT, 'packs/base/skills/pdf-to-md/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  for (const law of [/--image-export-mode referenced/, /Render every page to an image/, /Never do:[\s\S]*--image-export-mode placeholder/, /Count `<!-- image -->`/]) assert.match(skill, law);
});

// The firm structure: CLAUDE.md says where each kind of thing goes, placement-law enforces it (test/hooks/base/placement-law.test.mts),
// and doctor --strict proves every rule fires on something and every file is under a rule.
test('doctor --strict fails while a source file sits outside every rule, passes once it moves', () => {
  const dir = fixture('audio-core');
  put(join(dir, 'lib/Stray.cpp'), 'int x;\n');
  put(join(dir, 'src/dsp/Svf.cpp'), 'int y;\n');
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 1);
  assert.match(strict.stdout, /source file\(s\) no rule covers.*lib\/Stray\.cpp/);
  assert.match(cli(dir, 'doctor').stdout, /note: .*no rule covers/);
});

// The Stellix-build lessons (0.4.0) land in every install: the CLAUDE.md block, the three rules with live paths, and the two skills.
// Each assertion names the clause it protects.
test('the block, control, look and anchor laws and their skills install', () => {
  const dir = fixture('audio-core');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /A blocking hook is a red check: fix the hook first/);
  assert.match(md, /stop and report its exact message/);
  assert.match(md, /When a command is refused or fails, the step fails/);
  assert.match(md, /Route around a block/);
  assert.match(md, /Point at a document by line number\. Cite a fixed anchor/);

  const rule = (name: string): string => readFileSync(join(dir, '.claude/rules', `${name}.md`), 'utf8');
  const house = rule('house-control-behaviours');
  assert.match(house, /"src\/app\/\*\*"/, 'loads on the UI folders');
  for (const clause of [/Double click returns it to its parameter's default/, /Fine drag/, /mouse wheel/, /value is readable while it is moved/, /never takes keyboard focus/, /One gesture is one undo step/, /built once in the shared control piece/]) assert.match(house, clause);
  const look = rule('ui-matches-reference-look');
  assert.match(look, /"src\/app\/\*\*"/);
  for (const clause of [/glow/, /surfaces/, /every control's parts/, /gaps between elements/, /contrast/, /Gate the look/, /picture stop/]) assert.match(look, clause);
  const anchors = rule('references-use-anchors');
  assert.match(anchors, /"docs\/\*\*"/);
  assert.match(anchors, /never by line number/);

  for (const skill of ['new-panel-control', 'analyse-reference-look']) {
    assert.match(readFileSync(join(dir, '.claude/skills', skill, 'SKILL.md'), 'utf8'), /^description: Use when|^description: Use before/m);
  }
});

test('an install that copied the old paint pattern gets the new one; a project pattern is kept', () => {
  const dir = fixture('audio-core');
  const file = join(dir, '.claude/layout.json');
  type Editor = { content: string; contentWas?: string };
  const layoutOf = (): { kinds: { editor: Editor } } => JSON.parse(readFileSync(file, 'utf8')) as { kinds: { editor: Editor } };
  const set = (content: string): void => { const l = layoutOf(); l.kinds.editor.content = content; writeFileSync(file, JSON.stringify(l)); };
  const now = (): string => layoutOf().kinds.editor.content;
  set('\\bvoid\\s+paint\\s*\\(\\s*(juce::)?Graphics\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+(?:\\w+::)*paint\\s*\\(\\s*(?:juce::)?Graphics\\b');
  assert.ok(!('contentWas' in layoutOf().kinds.editor));
  set('\\bvoid\\s+draw\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+draw\\b');
});

// Identical containers by index, different things by ID (0.5.1): what the install carries about it, beside shape-law's refusals.
test('a brief never names a fixed instance: the subagent rule says so', () => {
  const rule = readFileSync(join(fixture('audio-core'), '.claude/rules/subagent-dispatch.md'), 'utf8');
  assert.match(rule, /never name a fixed instance/i);
});

test('CLAUDE.md names claude-packs as the source of truth: a fix goes into the kit, and comes back with update', () => {
  const md = readFileSync(join(fixture('audio-core'), 'CLAUDE.md'), 'utf8');
  assert.match(md, /claude-packs .*is the source of truth for every rule, check, hook and skill/);
  assert.match(md, /is made in the kit, with its test, and comes here with `npx --no-install @thedecipherist\/claude-packs update`/);
});

// WB-69: the shell route reader every write guard judges through.
test('the shell route reader is one file: global add installs base\'s, and the kit holds no copy', () => {
  for (const f of ['shell-writes.mjs', 'program-writes.mjs', 'program-read.mjs']) {
    assert.ok(FILES.some(([from, to]) => from === `../packs/base/hooks/lib/${f}` && to === `hooks/claude-packs/lib/${f}`), f);
  }
  const shim = readFileSync(join(KIT, 'global/hooks/lib/shell-writes.mts'), 'utf8');
  assert.equal(shim.split('\n').filter((l) => l && !l.startsWith('//')).length, 1, 'one line that points at base');
});

test('the shell route reader proves each route and program form (KWB-8)', () => {
  const r = spawnSync('node', [join(KIT, 'packs/base/hooks/lib/shell-writes.mjs'), '--selftest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /shell-writes selftest: OK/);
});

// KWB-44: a path that starts with a variable is where the variable points.
test('a shell write to a path in a variable is judged where the variable points', () => {
  process.env['KIT_TEST_OUT'] = '/somewhere/else';
  const paths = (command: string): (string | undefined)[] => shellWrites(command, '/project', process.env).map((w) => w.path);
  assert.deepEqual(paths('echo hi > $KIT_TEST_OUT/a.txt'), ['/somewhere/else/a.txt']);
  assert.deepEqual(paths('echo hi > ${KIT_TEST_OUT}/b.txt'), ['/somewhere/else/b.txt']);
  delete process.env['KIT_TEST_OUT'];
  assert.ok(!paths('echo hi > $KIT_TEST_OUT/a.txt')[0]?.startsWith('/project'));
});

// 0.10.0 (STEP 3 item 2): base gains secrets-guard (KWB-33) and the SHA-256 boundary law, untrusted-boundary (KWB-34), each with a
// rule that states it. A new project gets both; a project that had base before gets neither until it names them in "enable" (a new
// law never switches on by itself), and a rule that states a hook's law ("# hook:" in its frontmatter) is held back with its hook.
const NEW_LAWS = [['hooks/secrets-guard.mjs', 'rules/secrets-never-committed.md'], ['hooks/untrusted-boundary.mjs', 'rules/untrusted-content-boundary.md']] as const;

test('a new project of every configuration gets both laws, and both selftests pass', () => {
  for (const config of ['base', 'synth-creator'] as const) {
    const dir = fixture(config);
    const settings = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
    for (const [hook, rule] of NEW_LAWS) {
      assert.ok(existsSync(join(dir, '.claude', rule)), `${config}: ${rule}`);
      assert.match(settings, new RegExp(hook.replace('hooks/', '').replace('.', '\\.')), `${config}: ${hook} wired`);
      const r = selftest(dir, hook.replace('hooks/', ''));
      assert.equal(r.status, 0, r.stdout + r.stderr);
    }
  }
});

test('a project that had base before 0.10.0 gets neither law until it enables it; the rule waits with its hook', () => {
  const dir = fixture('audio-core');
  // what a 0.9.15 install looks like: neither hook, rule, lock entry nor settings entry
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { files: Record<string, string> };
  for (const [hook, rule] of NEW_LAWS) for (const rel of [hook, rule]) { rmSync(join(dir, '.claude', rel)); delete lock.files[`.claude/${rel}`]; }
  writeFileSync(lockFile, JSON.stringify(lock, null, 2));
  const sf = join(dir, '.claude/settings.json');
  writeFileSync(sf, readFileSync(sf, 'utf8').replace(/ \.claude\/hooks\/(secrets-guard|untrusted-boundary)\.mjs/g, ''));
  const out = run(dir, 'update');
  assert.match(out, /held back, not switched on .*hooks\/secrets-guard\.mjs, hooks\/untrusted-boundary\.mjs/);
  for (const [hook, rule] of NEW_LAWS) {
    assert.ok(!existsSync(join(dir, '.claude', hook)), hook);
    assert.ok(!existsSync(join(dir, '.claude', rule)), `${rule} waits with its hook`);
  }
  const lf = join(dir, '.claude/layout.json');
  writeFileSync(lf, JSON.stringify({ ...(JSON.parse(readFileSync(lf, 'utf8')) as Record<string, unknown>), enable: ['hooks/secrets-guard.mjs'] }, null, 2));
  run(dir, 'update');
  assert.ok(existsSync(join(dir, '.claude/hooks/secrets-guard.mjs')));
  assert.ok(existsSync(join(dir, '.claude/rules/secrets-never-committed.md')), 'the rule comes with its hook');
  assert.ok(!existsSync(join(dir, '.claude/rules/untrusted-content-boundary.md')));
});

// 0.27.0: the first content-heavy repo scanned showed the kit judging published text as code. Published text is read by the writing
// laws, and left alone by the code laws, at the write and in a scan.
test('a content folder is content; the same word under a code root is code; a project can add its own', () => {
  for (const f of ['articles/a/deploy.sh', 'blog/post.md', 'website/posts/x.md', 'content/page.mdx', 'examples/app.ts']) assert.ok(isContent(f), f);
  for (const f of ['src/app/blog/page.tsx', 'app/posts/route.ts', 'src/components/content/Card.tsx', 'server/routes/articles/list.js', 'packages/web/content/a.ts', 'lib/a.ts']) assert.ok(!isContent(f), f);
  assert.ok(isContent('handbook/a.ts', { guards: { content: ['handbook/**'] } }));
});

test('scan and suggest: samples are left out, public text comes last, and the weight of the repo is reported', () => {
  const dir = fresh('cs-scan-');
  put(join(dir, 'server.js'), "const app = require('express')();\n");
  put(join(dir, 'package.json'), JSON.stringify({ dependencies: { express: '5.0.0' } }));
  put(join(dir, 'index.html'), '<html lang="en"><head><title>Home</title></head><body></body></html>\n');
  put(join(dir, 'articles/guide/index.md'), 'It is fast — really.\n');
  put(join(dir, 'articles/guide/Dockerfile'), 'FROM node:latest\n');
  put(join(dir, 'articles/guide/compose.yml'), `url: mongodb://root:${['Tr0ub', 'adour9'].join('')}@db\n`);
  put(join(dir, 'shot.png'), 'x');
  const said = cli(dir, 'suggest').stdout;
  assert.doesNotMatch(said, /docker +file/, 'a sample is no evidence');
  assert.match(said, /web +web UI: index\.html/);
  assert.match(said, /content-site +published page/);
  const r = cli(dir, 'scan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 possible secret\(s\)/);
  const text = readFileSync(r.stdout.match(/Report: (\S+)/)?.[1] ?? '', 'utf8');
  assert.match(text, /in public text, listed last/);
  assert.match(text, /In test files and content folders \(1\)/);
  assert.match(text, /### public text/);
  assert.match(text, /1 image\(s\) in the repo root/);
  assert.match(text, /MB tracked/);
});
