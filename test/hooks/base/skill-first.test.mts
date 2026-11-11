// skill-first: a file the project reads only through a skill is not read before the skill is loaded. The hook's contract (it exports
// no worktreeCase: the case is the function test/worktree-cases-commands.mts holds), then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { commandCase } from '../command-case.mts';
import { extraFixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'skill-first.mjs',
  // the project installs read-a-circuit-diagram (reverse-engineering), so the circuit row applies
  dir: () => extraFixture('audio-core-reverse-engineering', ['audio-core', 'reverse-engineering']),
  same: (project) => {
    put(join(project, 'sheets/board.png'), 'x');
    withLayout(project, { guards: { circuitSkill: { sources: ['sheets/**'] } } });
    put(join(project, 'unloaded.jsonl'), '{"type":"user"}\n');
    return {
      payload: { tool_name: 'Read', tool_input: { file_path: join(project, 'sheets/board.png') }, cwd: project, transcript_path: join(project, 'unloaded.jsonl') },
      status: 2,
    };
  },
  worktree: commandCase('skill-first.mjs'),
});
