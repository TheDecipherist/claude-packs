// governor-route's selftest, loaded only under --selftest (the resident runner never carries it): the rewrite through `governed`
// planted and read back, and an agent start past a planted budget refused until a slot is freed. It plants its own governor folder,
// cores and load, so a selftest run by doctor in a real install never touches the machine's governor.
import { fileURLToPath } from 'node:url';
import { scratchDir } from './files.mts';
import { asRecord, parseJson } from './json.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writtenSince } from './selftest.mts';

const HOOK = fileURLToPath(new URL('../governor-route.mjs', import.meta.url));
/** The planted machine: 2 cores give a budget of 1 slot, so a second agent has none. */
const PLANT: Readonly<Record<string, string>> = { CLAUDE_PACKS_GOVERNOR_CORES: '2', CLAUDE_PACKS_GOVERNOR_LOAD: '0', CLAUDE_PACKS_AGENT_WAIT_MS: '300' };

/** The command the hook rewrote the call to, or '' when it said nothing. */
function rewritten(stdout: string): string {
  const spec = asRecord(asRecord(parseJson(stdout))?.['hookSpecificOutput']);
  const input = asRecord(spec?.['updatedInput']);
  return typeof input?.['command'] === 'string' ? input['command'] : '';
}

export function selftest(): number {
  const dir = scratchProject({ '.claude/tools/governed.mjs': '// planted\n' });
  const bare = scratchProject({ 'a.txt': 'x\n' });
  const before = snapshot(dir);
  const saved = { ...process.env };
  Object.assign(process.env, PLANT, { CLAUDE_PACKS_GOVERNOR_DIR: scratchDir('cp-governor-') });
  try {
    const sh = (cmd: string, where = dir): string => rewritten(runHook(HOOK, where, bashOf(cmd, where)).stdout);
    const agent = (id: string): number | null => runHook(HOOK, dir, { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: id, tool_input: { prompt: 'x' } }).status;
    const stop = (): number | null => runHook(HOOK, dir, { hook_event_name: 'SubagentStop', agent_id: 'a1' }).status;
    const routed = sh('npm test 2>&1 | tail -3');
    return verdicts('governor-route', [
      ['npm test is rewritten through governed', /governed\.mjs' --for test --want 3 -- npm test 2>&1 \| tail -3$/.test(routed), true],
      ['the rewrite keeps the call\'s other fields', asRecord(asRecord(asRecord(parseJson(runHook(HOOK, dir, { tool_name: 'Bash',
        tool_input: { command: 'npm test', timeout: 9000 } }).stdout))?.['hookSpecificOutput'])?.['updatedInput'])?.['timeout'] === 9000, true],
      ['cmake --build is a build', sh('cmake --build build').includes('--for build'), true],
      ['go test -fuzz is a fuzzer', sh('go test -fuzz=FuzzX ./proxy/').includes('--for fuzz'), true],
      ['ls is left alone', sh('ls -la'), ''],
      ['a command already governed is left alone', sh(`node ${dir}/.claude/tools/governed.mjs --for test -- npm test`), ''],
      ['a pipe whose heavy part is not first is left alone', sh('cat list | npm test'), ''],
      ['a heredoc is left alone', sh("cat <<'EOF' > f\nnpm test\nEOF"), ''],
      ['no governed installed: left alone', sh('npm test', bare), ''],
      ['the first agent takes the one slot', agent('t1'), 0],
      ['a second agent past the budget waits, then is refused', agent('t2'), 2],
      ['a stopped agent frees its slot', stop(), 0],
      ['the next agent then starts', agent('t3'), 0],
      ['a judge writes no file in the project', writtenSince(dir, before).join(','), ''],
    ]);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}
