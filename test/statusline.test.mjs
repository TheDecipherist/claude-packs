// 1.8.0: the kit's status line (packs/base/tools/statusline.mjs). The user: "the statusline should be part of claude-packs
// because thats how users going forward will see everything thats working and where it is", "the very first field on the top
// line should be the claude-packs version number". Every feed is a scratch file here: no test reads the user's own settings,
// transcript or cache.
import { utimesSync } from 'node:fs';
import { assert, existsSync, fresh, join, mkdirSync, test, writeFileSync } from './kit-cli.mjs';
import { readJson, toJson } from '../packs/base/hooks/lib/json.mjs';
import { statusBar } from '../packs/base/tools/statusline.mjs';
import { refreshRuns } from '../packs/base/tools/statusline-runs.mjs';
import { syncSettings } from '../lib/settings.mjs';

const NOW = Date.parse('2026-11-10T22:00:00Z');
const RUN = { project: '/p/bandwarp', order: 'bandwarp', items: 10, done: 4, percent: 40, finished: false,
  steps: [{ id: 'W3', title: 'The cluster', items: 6, done: 2 }, { id: 'W8', title: 'The panel', items: 4, done: 2 }],
  agents: [{ name: 'dsp', step: 'W3', title: 'The cluster', percent: 50, now: 'COMB width', updated: '2026-11-10T21:55:00Z' },
    { name: 'panel', step: 'W8', title: 'The panel', percent: 25, now: '', updated: '2026-11-10T21:00:00Z' }] };

function scene({ runs = [RUN], cacheAge = 0, session = {}, transcript = [] } = {}) {
  const home = fresh('statusline-');
  const tools = join(home, 'project', '.claude', 'tools');
  mkdirSync(tools, { recursive: true });
  writeFileSync(join(home, 'project', '.claude', 'claude-packs.lock.json'), toJson({ kit: '9.8.7', files: {} }));
  const cache = join(home, 'cache', 'claude-packs', 'runs.json');
  mkdirSync(join(home, 'cache', 'claude-packs'), { recursive: true });
  if (runs) writeFileSync(cache, toJson({ runs }));
  if (runs) utimesSync(cache, (NOW - cacheAge) / 1000, (NOW - cacheAge) / 1000);   // on the test's clock, not the machine's
  const log = join(home, 'session.jsonl');
  writeFileSync(log, transcript.map((t) => toJson(t)).join('\n'));
  const env = { HOME: home, XDG_CACHE_HOME: join(home, 'cache'), CLAUDE_CONFIG_DIR: join(home, 'config'), NO_COLOR: '1' };
  const raw = toJson({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: 41 }, transcript_path: log, ...session });
  const lines = statusBar(raw, { env, nowMs: NOW, toolDir: tools, refresh: false, git: () => ({ branch: 'work/x', uncommitted: 2, ahead: 1, behind: 0 }) });
  return { lines, home, cache };
}

test('the top line starts with the kit version from the lock beside the tool, then the model and the context', () => {
  const { lines } = scene({ session: { rate_limits: { five_hour: { used_percentage: 38 } } } });
  assert.equal(lines[0], 'claude-packs 9.8.7 | opus | CTX 41% | 5h 38%');
});

test('the second line has the branch, then the last tool and its target and the last shell command, from the transcript', () => {
  const use = (name, input) => ({ message: { content: [{ type: 'tool_use', name, input }] } });
  const { lines } = scene({ transcript: [use('Bash', { command: 'npm   test' }), use('Read', { file_path: '/a/b.mjs' })] });
  assert.equal(lines[1], '⎇ work/x ✱2 ↑1↓0 | Read /a/b.mjs | $ npm test');
});

test('each run is its project\'s row and one row per agent, each with its bar; an agent quiet for 30 minutes says so', () => {
  const { lines } = scene();
  assert.match(lines[2], /^BANDWARP {14} █{8}░{12}  40%  6 of 10 items left, 2 agents$/);
  assert.match(lines[3], /^  > dsp {8}> W3 The cluster {14}█{5}░{5}  50%  COMB width$/);
  assert.match(lines[4], /^  > panel {6}> W8 The panel {16}█{3}░{7}  25%  quiet 60m$/);
});

test('a run with no agent shows the lead on its current step; a stale cache says how old it is', () => {
  const { lines } = scene({ runs: [{ ...RUN, agents: [] }], cacheAge: 10 * 60_000 });
  assert.match(lines[2], /0 agents  \(as of 10m ago\)$/);
  assert.match(lines[3], /^  > lead {7}> W3 The cluster .* 33%$/);
});

test('a broken session, transcript or cache draws what it can and never throws', () => {
  const { home, cache } = scene();
  writeFileSync(cache, '{ half');
  writeFileSync(join(home, 'session.jsonl'), '{"message": {"content": [');
  const env = { HOME: home, XDG_CACHE_HOME: join(home, 'cache'), CLAUDE_CONFIG_DIR: join(home, 'config'), NO_COLOR: '1' };
  const lines = statusBar('not json', { env, nowMs: NOW, toolDir: join(home, 'project', '.claude', 'tools'), refresh: false, git: () => ({}) });
  assert.deepEqual(lines, ['claude-packs 9.8.7']);
});

test('the runs refresh starts only when the cache is old and no refresh is under way', () => {
  const { cache } = scene();
  const started = [];
  assert.equal(refreshRuns(cache, NOW, (c) => started.push(c)), false);
  assert.equal(refreshRuns(cache, NOW + 60_000, (c) => started.push(c)), true);
  assert.equal(refreshRuns(cache, NOW + 61_000, (c) => started.push(c)), false);
  assert.deepEqual(started, [cache]);
  assert.ok(existsSync(`${cache}.lock`));
});

test('an install wires the kit\'s status line where the project has none, keeps the user\'s own, and takes it out when disabled', () => {
  const claudeDir = join(fresh('statusline-settings-'), '.claude');
  mkdirSync(claudeDir, { recursive: true });
  const line = () => readJson(join(claudeDir, 'settings.json'))?.statusLine;
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'set');
  assert.match(line().command, /\.claude\/tools\/statusline\.mjs/);
  assert.equal(line().refreshInterval, 1);
  assert.equal(syncSettings(claudeDir, ['base'], { disable: ['tools/statusline.mjs'] }).statusLine, 'removed');
  assert.equal(line(), undefined);
  writeFileSync(join(claudeDir, 'settings.json'), toJson({ statusLine: { type: 'command', command: 'my-own-bar' } }));
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'kept');
  assert.equal(line().command, 'my-own-bar');
});
