// brief-findings.mts: the instance of a "many" concept a brief or a docs write names outside a "seen in:" line, and the refusal's words.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { SAMPLE_SHAPE, briefCase, briefFindings, briefMessage } from '../../../packs/base/hooks/lib/brief-findings.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

function project(): string {
  const dir = scratchDir('brief-findings-');
  put(join(dir, 'design/shape.json'), JSON.stringify(SAMPLE_SHAPE));
  return dir;
}
const ctx = (dir: string) => ({ projectDir: dir, cwd: dir, env: {} });
const write = (dir: string, rel: string, content: string) => ({ tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });

test('a docs brief naming slot 3 is found, with its line, the concept and where it was', () => {
  const dir = project();
  const got = briefFindings(write(dir, 'docs/brief.md', 'Fine.\nDrive slot 3.\n'), ctx(dir));
  assert.ok(got);
  assert.equal(got.where, 'docs/brief.md');
  assert.equal(got.findings[0]?.concept, 'slot');
  assert.equal(got.findings[0]?.line, 2);
});

test('an agent brief is read from its description and prompt', () => {
  const dir = project();
  const got = briefFindings({ tool_name: 'Agent', tool_input: { description: 'x', prompt: 'Tune slot 2 only.' } }, ctx(dir));
  assert.equal(got?.where, 'the agent brief');
  assert.equal(briefFindings({ tool_name: 'Agent', tool_input: { description: 'x', prompt: 'Tune every slot.' } }, ctx(dir)), null);
});

test('an example line, an outside-audience page, code, and a file outside docs and inbox are not judged', () => {
  const dir = project();
  assert.equal(briefFindings(write(dir, 'docs/brief.md', 'seen in: slot 3; build for every slot\n'), ctx(dir)), null);
  assert.equal(briefFindings(write(dir, 'docs/rec.md', '<!-- audience: outside -->\nSet slot 3\n'), ctx(dir)), null);
  assert.equal(briefFindings(write(dir, 'src/a.ts', 'Drive slot 3.\n'), ctx(dir)), null);
});

test('with no manifest, or one that does not parse, nothing is judged: planted wrong input', () => {
  const bare = scratchDir('brief-findings-');
  assert.equal(briefFindings(write(bare, 'docs/brief.md', 'Drive slot 3.\n'), ctx(bare)), null);
  put(join(bare, 'design/shape.json'), '{ not json');
  assert.equal(briefFindings(write(bare, 'docs/brief.md', 'Drive slot 3.\n'), ctx(bare)), null);
});

test('only what a write adds is judged: an instance already in the file is not found again', () => {
  const dir = project();
  put(join(dir, 'docs/brief.md'), 'Drive slot 3.\n');
  assert.equal(briefFindings(write(dir, 'docs/brief.md', 'Drive slot 3.\nMore words.\n'), ctx(dir)), null);
});

test('the message names the file, line, concept and the fix, and the worktree case has both steps', () => {
  const dir = project();
  const got = briefFindings(write(dir, 'docs/brief.md', 'Drive slot 3.\n'), ctx(dir));
  assert.ok(got);
  const message = briefMessage(got);
  assert.match(message, /BLOCKED by brief-guard: docs\/brief\.md/);
  assert.match(message, /docs\/brief\.md:1:.*names slot instance 3/);
  assert.match(message, /every slot: many\(4\), made by slotId/);
  assert.equal(briefCase(2).steps[0]?.want, 2);
  assert.equal(briefCase(0).steps[0]?.want, 0);
  assert.equal(briefCase(2).steps[1]?.want, 0);
});
