// stay-inside: a write outside the project stops the session (`continue: false`); a write into another project passes. On by
// default in base (the user, 2026-11-14: "hard-stop is not an opt in").
import { join } from 'node:path';
import { assert, fresh, hookRun, readFileSync, test, writeFileSync } from '../../kit-cli.mts';
import { git } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const dir = (): string => fixture('base');
const write = (file_path: string): Record<string, unknown> => ({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path, content: 'x\n' } });
const stopped = (r: { status: number | null; stdout: string }): boolean => r.status === 0 && r.stdout.includes('"continue":false');

holdsTheContract({ hook: 'stay-inside.mjs', dir, same: () => ({ payload: write('/tmp/stay-inside-contract.py'), status: 0 }) });

test('stay-inside: a write or a shell redirect to /tmp stops the session; one inside the project does not', () => {
  const project = dir();
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', write('/tmp/scan.py'))), true);
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: "cat > /tmp/scan.py <<'E'\nprint(1)\nE" } })), true);
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', write(join(project, 'tools/scan.py')))), false);
});

test('stay-inside: a write into another git repository is updating that project, and passes', () => {
  const other = fresh('stay-inside-other-');
  git(other, 'init', '-q');
  writeFileSync(join(other, 'README.md'), '# other\n');
  assert.equal(stopped(hookRun(dir(), 'stay-inside.mjs', write(join(other, 'notes.md')))), false);
});

test('stay-inside is on in a base install with nothing enabled', () => {
  assert.equal(stopped(hookRun(dir(), 'stay-inside.mjs', write('/tmp/x.py'))), true);
});

test('stay-inside: the build\'s own plugin copy for a host gate passes only with the owner\'s yes, and only that bundle (KWB-next, WB-10)', () => {
  const project = dir();
  const home = fresh('stay-inside-home-');
  const env = { HOME: home };
  const copy = write(join(home, 'Library/Audio/Plug-Ins/Components/Unit.component/Contents/Info.plist'));
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', copy, env)), true, 'no yes in the layout: the copy stops');
  const layoutFile = join(project, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(layoutFile, 'utf8')) as Record<string, unknown>;
  writeFileSync(layoutFile, JSON.stringify({ ...layout, guards: { stayInside: { pluginCopies: ['Unit.component'] } } }));
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', copy, env)), false, 'the named bundle passes');
  const other = write(join(home, 'Library/Audio/Plug-Ins/Components/Other.component/x'));
  assert.equal(stopped(hookRun(project, 'stay-inside.mjs', other, env)), true, 'a bundle not named stops');
});
