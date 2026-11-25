// rack-join (instrument-shell's tool): a fake rack repository whose generator is a small synths.py, and a project beside it.
// The tool runs from an install. Each fault is planted: no row, a row that opens another app.
import { assert, existsSync, fresh, join, mkdirSync, run as kit, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

// the tool runs from an install, as a project runs it (route-table.test.mts does the same)
const dir = fixture('synth-creator');
kit(dir, 'add', 'instrument-shell');
const TOOL = join(dir, '.claude/tools/rack-join.mjs');

/** A rack whose UNITS lists `listed` (a project folder) opening `app`, and a project folder named `name` with a built app. */
function setup(name: string, listed: string, opens: 'own' | 'other') {
  const base = fresh('rack-join-');
  const project = join(base, name);
  const app = join(project, 'build', 'Unit_artefacts', 'Release', 'Standalone', 'Unit.app');
  const other = join(base, 'old', 'Unit.app');
  for (const p of [app, other, join(base, 'rack', 'tools')]) mkdirSync(p, { recursive: true });
  writeFileSync(join(base, 'rack', 'tools', 'synths.py'), [
    'import sys, pathlib',
    'ROOT = pathlib.Path(__file__).resolve().parents[1]',
    `UNITS = [("unit", "Unit", "Maker", 2000, "${listed}", "blurb", "Maker", "Unit")]`,
    `def app_path(project, uid=None):\n    return pathlib.Path(r"${opens === 'own' ? app : other}")`,
    'if __name__ == "__main__" and "--write" in sys.argv:\n    (ROOT / "synths.html").write_text("rack")\n    print("wrote")',
  ].join('\n'));
  return { project, app, rack: join(base, 'rack') };
}
const run = (project: string, ...args: string[]) =>
  spawnSync(process.execPath, [TOOL, ...args], { cwd: project, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: project } });

test('check passes when the project has a row and the rack opens the launched app', () => {
  const s = setup('myunit', 'myunit', 'own');
  const r = run(s.project, 'check', s.app, '--rack', s.rack);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /on the rack, and it opens/);
});

test('check fails, naming the fix, when the project has no row (planted)', () => {
  const s = setup('myunit', 'someother', 'own');
  const r = run(s.project, 'check', s.app, '--rack', s.rack);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no row in UNITS for the project folder "myunit"/);
});

test('check fails when the row opens another app than the launched one (planted)', () => {
  const s = setup('myunit', 'myunit', 'other');
  const r = run(s.project, 'check', s.app, '--rack', s.rack);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /the rack opens another app/);
});

test('write runs the generator with --write, and --no-restart leaves any server alone', () => {
  const s = setup('myunit', 'myunit', 'own');
  const r = run(s.project, 'write', '--rack', s.rack, '--no-restart');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(s.rack, 'synths.html')), true);
  assert.match(r.stdout, /server left running/);
});

test('a rack with no generator, or no mode, is used wrongly (exit 2)', () => {
  const s = setup('myunit', 'myunit', 'own');
  assert.equal(run(s.project, 'check', s.app, '--rack', join(s.rack, 'nowhere')).status, 2);
  assert.equal(run(s.project).status, 2);
});
