// brief-guard-count (PreToolUse, Agent|Task and Write|Edit|MultiEdit|NotebookEdit|Bash, beside brief-guard): counts what brief-guard
// refuses, one line per refused concept in .claude/usage.log (time, hook "brief-guard", concept), which `claude-packs shape` reads.
// brief-guard used to write that line as it refused; a judge writes nothing, so the count is this recorder's (W4). It reads the
// event as brief-guard does (lib/brief-findings.mts) and refuses nothing.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_SHAPE, briefCase, briefFindings } from './lib/brief-findings.mts';
import { readText } from './lib/files.mts';
import { isMain, logRefusal, runAsHook } from './lib/hook-log.mts';
import { runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';

export const hook: Hook = (event, ctx) => {
  const found = briefFindings(event, ctx);
  if (found) logRefusal(ctx.projectDir, 'brief-guard', found.findings.map((f) => f.concept));
  return pass;
};

/** A recorder refuses nothing, in a worktree as in the main checkout: the brief judge's case, with every step wanting 0. */
export const worktreeCase: WorktreeCase = briefCase(0);

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(SAMPLE_SHAPE), 'docs/recipes.md': '# Recipes\nPLACE\n' });
  const counted = (): number => (readText(join(dir, '.claude/usage.log')) ?? '').split('\n').filter((l) => /\tbrief-guard\tslot$/.test(l)).length;
  const agent = (prompt: string): number | null => runHook(hookFile, dir, { tool_name: 'Agent', tool_input: { description: 'build', prompt } }).status;
  const doc = (rel: string, text: string): number | null => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
  const none = counted();
  const refused = [agent('Build the delay. Drive slot 2 and check it works.'), doc('docs/recipes.md', '# Recipes\n## Slot 1, the lead\n'), doc('inbox/brief-7.md', 'Drive slot 2 until it works.\n')];
  const counts = counted();
  const passed = [agent('Fix the missing delay.\nseen in: slot 2, build for all slots'), doc('docs/recipes.md', '# Recipes\n## Layer lead\n'), doc('src/world/x.md', 'slot 2\n')];
  return verdicts('brief-guard-count', [
    ['nothing is counted before anything is refused', none, 0],
    ['a recorder refuses nothing, even for what brief-guard refuses', refused.join(), '0,0,0'],
    ['each refused event is one line for its concept', counts, 3],
    ['an event brief-guard lets through is counted no more', counted() - counts, 0],
    ['and the recorder lets it through', passed.join(), '0,0,0'],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'brief-guard-count', hook, selftest);
