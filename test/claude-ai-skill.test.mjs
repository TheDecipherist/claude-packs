// 1.5.11: the work order walkthrough, a skill for claude.ai. No pack holds it and no project installs it: `claude-ai-skill` writes one
// zip of one skill folder, which claude.ai takes as an upload. Python's zipfile reads it back, so the zip is judged by another reader,
// not by the code that wrote it.
import { KIT, assert, cli, existsSync, fresh, join, readFileSync, readdirSync, spawnSync, test, writeFileSync } from './kit-cli.mjs';

const unzip = (zip, script) => spawnSync('python3', ['-I', '-c', `import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1])\n${script}`, zip], { encoding: 'utf8' });

test('claude-ai-skill writes one skill folder as a zip claude.ai can take, with both templates', () => {
  const dir = fresh('cai-');
  const r = cli(dir, 'claude-ai-skill');
  assert.equal(r.status, 0, r.stderr);
  const zip = join(dir, 'workorder-writer.zip');
  const read = unzip(zip, 'print(json.dumps({"bad": z.testzip(), "names": z.namelist(), "skill": z.read("workorder-writer/SKILL.md").decode(), "general": z.read("workorder-writer/templates/workorder.md").decode()}))');
  assert.equal(read.status, 0, read.stderr);
  const { bad, names, skill, general } = JSON.parse(read.stdout);
  assert.equal(bad, null, 'every entry reads back with its checksum');
  assert.deepEqual(names.sort(), ['workorder-writer/SKILL.md', 'workorder-writer/templates/workorder-rebuild.md', 'workorder-writer/templates/workorder.md']);
  // claude.ai's limits: a name of lowercase letters, digits and hyphens up to 64, a description up to 1024
  const name = skill.match(/^name: (.+)$/m)?.[1];
  const description = skill.match(/^description: (.+)$/m)?.[1] ?? '';
  assert.match(name, /^[a-z0-9-]{1,64}$/);
  assert.ok(description.startsWith('Use ') && description.length <= 1024, description);
  assert.match(description, /work order/, 'it starts when someone asks for a work order');
  assert.match(description, /how do I/i, 'and when someone asks how to begin making a synth, a plugin or an app');
  assert.doesNotMatch(general, /\{\{(name|date)\}\}/, 'the fill-ins read as placeholders for the walkthrough');
  // a planted fault: one changed byte in the stored data is seen by the other reader
  const bytes = readFileSync(zip);
  bytes[bytes.indexOf('# The work order walkthrough')] ^= 1;
  writeFileSync(join(dir, 'planted.zip'), bytes);
  assert.notEqual(JSON.parse(unzip(join(dir, 'planted.zip'), 'print(json.dumps(z.testzip()))').stdout), null, 'the planted change is caught');
});

test('the walkthrough holds the mock-up laws and names every pack-free piece it relies on', () => {
  const skill = readFileSync(join(KIT, 'prompts/workorder/claude-ai-skill.md'), 'utf8');
  assert.match(skill, /Nano Banana Pro/);
  assert.match(skill, /\*\*Every mock-up is 16:9\*\*/);
  assert.match(skill, /openart_generate_image/, 'it looks for the OpenArt connector before offering to make the mock-ups');
  assert.match(skill, /--template rebuild/);
  assert.match(skill, /start-from-a-workorder/);
  assert.ok(existsSync(join(KIT, 'packs/base/skills/start-from-a-workorder/SKILL.md')), 'the Claude Code skill it hands over to exists');
  assert.doesNotMatch(skill, /[^\x00-\x7F]/, 'ASCII only');
  // it is no pack's: nothing installs it into a project
  for (const pack of readdirSync(join(KIT, 'packs'))) assert.ok(!existsSync(join(KIT, 'packs', pack, 'skills/workorder-writer')), pack);
});
