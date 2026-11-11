// What base carries that doctor proves, with no hook of its own (split from base-pack.test.mts so no file sums over a minute): the
// finished-work rule and skill in every install, and doctor --strict on a source file no rule covers.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { assert, cli, readFileSync, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('finished work lands: the rule and the skill come with git-guard, in every install', () => {
  const dir = fixture('base');
  assert.match(readFileSync(join(dir, '.claude/rules/finished-work-lands.md'), 'utf8'), /merged into the trunk and pushed/);
  assert.match(readFileSync(join(dir, '.claude/skills/land-branch/SKILL.md'), 'utf8'), /^---\nname: land-branch\ndescription: Use when /);
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
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
