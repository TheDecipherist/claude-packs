// 0.10.0 (STEP 3 item 5): every configuration installs into a fresh repo and `doctor --strict` passes there; the
// planner-skills generator emits one project-layout skill body per configuration, from its layout template (KWB-35).
import { CLI, KIT, assert, cli, execFileSync, existsSync, fresh, join, readdirSync, readFileSync, test } from './kit-cli.mjs';

const CONFIGS = readdirSync(join(KIT, 'configurations')).sort();
const config = (name) => JSON.parse(readFileSync(join(KIT, 'configurations', name, 'config.json'), 'utf8'));

test('the kit ships its configurations', () => {
  assert.deepEqual(CONFIGS, ['base', 'cpp', 'full-stack', 'node', 'python', 'synth-creator']);   // node: 0.11.0, the v7 additions' packs and presets
});

for (const name of CONFIGS) {
  test(`${name}: installs into a fresh repo and doctor --strict passes`, () => {
    const dir = fresh(`cfgs-${name}-`);
    execFileSync('git', ['init', '-q'], { cwd: dir });
    const init = cli(dir, 'init', '--config', name);
    assert.equal(init.status, 0, init.stdout + init.stderr);
    for (const f of Object.values(config(name).layout.folders)) assert.ok(existsSync(join(dir, f.path)), `${name}: ${f.path}/`);
    const strict = cli(dir, 'doctor', '--strict');
    assert.equal(strict.status, 0, strict.stdout);
    assert.match(strict.stdout, new RegExp(`configuration: ${name}\\b`));
  });
}

test('planner-skills: one project-layout body per configuration, from its layout template', () => {
  const out = fresh('planner-');
  execFileSync('node', [CLI, 'planner-skills', '--out', out], { encoding: 'utf8' });
  assert.deepEqual(readdirSync(out).sort(), CONFIGS);
  for (const name of CONFIGS) {
    const body = readFileSync(join(out, name, 'project-layout', 'SKILL.md'), 'utf8');
    assert.match(body, /^---\nname: project-layout\ndescription: Use when /);
    assert.ok(body.length < 8000, `${name}: ${body.length} characters`);
    assert.match(body, new RegExp(`# Project layout: ${name}`));
    for (const f of Object.values(config(name).layout.folders)) assert.ok(body.includes(`\`${f.path}/\``), `${name}: ${f.path}`);
    for (const line of config(name).preamble.never) assert.ok(body.includes(line), `${name}: preamble`);
  }
  const printed = execFileSync('node', [CLI, 'planner-skills'], { encoding: 'utf8' });
  assert.equal(printed.match(/^==> .*\/project-layout\/SKILL\.md$/gm).length, CONFIGS.length);
});
