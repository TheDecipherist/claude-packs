// W4 item 3: skill-first and look-gate on a scratch full-stack install, each event sent the way Claude Code sends it (through
// the project's run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR the project). Prints the transcript of what each said.
//   node drive.mjs <kit> <scratch dir>
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [kit, dir] = process.argv.slice(2);
const sh = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=w4@local', '-c', 'user.name=w4', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const put = (rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };
const transcript = join(dir, '..', 'w4-transcript.jsonl');
writeFileSync(transcript, '');
const fire = (hook, event) => {
  const r = spawnSync(process.execPath, [join(dir, '.claude/hooks/run-hooks.mjs'), `.claude/hooks/${hook}`], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    input: JSON.stringify({ session_id: `w4-${process.pid}`, transcript_path: transcript, cwd: dir, ...event }),
  });
  const said = (r.stderr || r.stdout || '').trim().replace(/\n+/g, ' | ');
  console.log(`${hook} ${event.hook_event_name} ${event.tool_name} ${JSON.stringify(event.tool_input)}\n  -> exit ${r.status}${said ? `: ${said.slice(0, 400)}` : ''}`);
  return r;
};

sh(dir, 'init', '-q', '-b', 'main');
execFileSync('node', [join(kit, 'bin/claude-packs.mjs'), 'init', '--config', 'full-stack', '--dir', dir], { stdio: 'ignore' });
put('design/reference/x.webp', 'RIFF....WEBPVP8 a stand-in picture\n');
const packs = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8')).packs.join(', ');
console.log(`installed: ${packs}; the skill at .claude/skills/analyse-reference-look/SKILL.md\n`);

console.log('== skill-first: a reference picture is read only through its skill');
const read = { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: join(dir, 'design/reference/x.webp') } };
const r1 = fire('skill-first.mjs', read);
const skillCall = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'analyse-reference-look' } }] } };
appendFileSync(transcript, `${JSON.stringify(skillCall)}\n`);
console.log('  (the transcript now holds the Skill call for analyse-reference-look)');
const r2 = fire('skill-first.mjs', read);

console.log('\n== look-gate: a look declared, its code changed on a branch, the report missing then passing');
const layoutFile = join(dir, '.claude/layout.json');
const layout = JSON.parse(readFileSync(layoutFile, 'utf8'));
layout.looks = [{ name: 'dashboard', reference: 'design/reference/x.webp', code: ['packages/web/app/dashboard/**'] }];
writeFileSync(layoutFile, JSON.stringify(layout, null, 2));
put('.gitignore', '.claude/hooks.log\n.claude/logs/\n');
sh(dir, 'add', '-A');
sh(dir, 'commit', '-qm', 'the install and the look');
const hub = join(dir, '..', 'w4-hub.git');
sh(join(dir, '..'), 'init', '-q', '--bare', hub);
sh(dir, 'remote', 'add', 'origin', hub);
sh(dir, 'push', '-q', 'origin', 'main');
sh(dir, 'fetch', '-q', 'origin');
sh(dir, 'switch', '-q', '-c', 'work/dashboard');
put('packages/web/app/dashboard/page.tsx', 'export default function Page() {\n  return <main className="card">Dashboard</main>;\n}\n');
sh(dir, 'add', 'packages/web/app/dashboard/page.tsx');
sh(dir, 'commit', '-qm', 'the dashboard page');
const r3 = fire('look-gate.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm run build' } });
sh(dir, 'switch', '-q', 'main');
const merge = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git merge --ff-only work/dashboard' } };
const r4 = fire('look-gate.mjs', merge);
sh(dir, 'switch', '-q', 'work/dashboard');
const code = sh(dir, 'rev-parse', 'HEAD').trim();
const report = { reference: 'design/reference/x.webp', commit: code, verdict: 'pass', measures: { 'shadow.darkness': { reference: 44.1, render: 40.1, pass: true } } };
put('build/evidence/looks/dashboard.json', `${JSON.stringify(report, null, 2)}\n`);
sh(dir, 'add', 'build/evidence/looks/dashboard.json');
sh(dir, 'commit', '-qm', 'the passing look report');
sh(dir, 'switch', '-q', 'main');
console.log('  (the branch now holds a passing report for the page\'s last change)');
const r5 = fire('look-gate.mjs', merge);

const results = [
  ['skill-first refused the read', r1.status === 2],
  ['skill-first allowed it after the Skill call', r2.status === 0],
  ['look-gate named the look as due after a build', /dashboard/.test(r3.stdout)],
  ['look-gate refused the landing without a report', r4.status === 2],
  ['look-gate allowed the landing with a passing report', r5.status === 0],
];
console.log('');
for (const [what, ok] of results) console.log(`${ok ? 'yes' : 'NO '} ${what}`);
const proved = results.every(([, ok]) => ok);
console.log(proved ? 'PROVED' : 'NOT PROVED');
process.exit(proved ? 0 : 1);
