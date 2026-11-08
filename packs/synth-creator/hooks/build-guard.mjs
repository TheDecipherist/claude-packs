#!/usr/bin/env node
// build-guard (PreToolUse, Bash): no heavy job takes the whole machine.
//
// "nothing should be able to take the entire system". Five agents each compiling with -j18 at once put
// ~90 jobs on 18 cores and every build took hours. Every compile and test run goes through the machine-wide queue
// .claude/tools/buildq.mjs (two at a time; the kit ships it, KF-1). This refuses (exit 2) a heavy command started any other way, a polling loop, an
// agent's build or test run of everything, and any build from an agent started as `KIND: light`
// (~/.claude/agent-cap-state.json keeps the kinds).
//
// Allowed: a command run as `node .claude/tools/buildq.mjs <cmd>` (or a `buildq` on the path), or through a project's own wrapper that
// calls buildq (for example `bash tools/build.sh ...`, the `build` and `test` commands in .claude/layout.json).
// Configuring (`cmake -B build`) is light and allowed. Text that only MENTIONS a command (inside a heredoc, a quoted
// string, a commit message) is never read as running it. A project with its own PreToolUse dispatcher
// (.claude/hooks/pre.js) is left to it.
//
//   node build-guard.mjs --selftest
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { asHook, isMain } from './lib/hook-log.mjs';

const WRAPPERS = ['buildq', 'buildq.mjs', 'build.sh'];
const base = (p) => p.split('/').pop();

export function heavy(w) {
  const exe = base(w[0]);
  // A PROGRAM RUN STRAIGHT FROM A BUILD FOLDER (a probe, a prototype, a test binary): one bank render took ~8 cores
  if (/(^|\/)(build[^/]*|[^/]*_artefacts)\//.test(w[0]) || /^[A-Z]\w*(Probe|Proto|Tests?)$/.test(exe)) return true;
  if (exe === 'cmake') return w.includes('--build');
  if (exe === 'ninja' && w.slice(1).some((x) => ['-t', '--version', '-n'].includes(x) || x.startsWith('-t'))) return false; // a question to the build graph
  if (exe === 'ctest' && w.slice(1).some((x) => ['--version', '-N', '--show-only'].includes(x) || x.startsWith('--show-only'))) return false; // listing tests
  if (['ctest', 'ninja', 'xcodebuild', 'msbuild', 'gradle', 'gradlew', 'mvn', 'make', 'gmake'].includes(exe)) return true;
  if (['cargo', 'swift', 'go', 'bazel', 'bazelisk'].includes(exe)) return w.length > 1 && ['build', 'test', 'bench', 'run', 'install'].includes(w[1]);
  return false;
}

// Heredoc bodies are text written to a file or fed to a program, never commands of this shell.
export function stripHeredocs(cmd) {
  const out = [];
  const lines = cmd.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
    if (m) { i += 1; while (i < lines.length && lines[i].trim() !== m[1]) i += 1; }
  }
  return out.join('\n');
}

const blankQuotes = (s) => s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
// Quoted text (a commit note, a bug title) keeps its length but loses its words, so a note naming the test runner is not a test run
const maskQuotes = (s) => s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (q) => q[0] + ' '.repeat(q.length - 2) + q[q.length - 1]);
const words = (part) => part.replace(/(^|\s)#.*$/, '').trim().split(/\s+/).filter(Boolean);

// The shell's own words before a command: `do make` runs make (KWB-89)
const KEYWORDS = ['do', 'then', 'else', 'elif', 'if', 'while', 'until', '!', '{', '}'];

export function offending(cmd) {
  const pieces = blankQuotes(stripHeredocs(cmd)).split(/(&&|\|\||;|\||\n|\(|\)|`|\$\()/);
  for (let i = 0; i < pieces.length; i += 2) {
    if (pieces[i - 1] === ')') continue; // the words after a `$(...)` or `(...)` are its command's arguments, never a new command (KWB-89)
    let w = words(pieces[i]);
    while (w.length && KEYWORDS.includes(w[0])) w = w.slice(1);
    if ((w.length >= 2 && ['command', 'type', 'which', 'whence', 'hash'].includes(w[0]) && ['-v', '-V', '-p', '-a'].includes(w[1])) || ['which', 'type', 'whence'].includes(w[0])) continue;
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['env', 'time', 'nice', 'caffeinate', 'exec', 'nohup', 'command', 'sudo'].includes(w[0]))) {
      w = w.slice(1);
      while (w.length && w[0].startsWith('-')) w = w.slice(1);
    }
    if (!w.length) continue;
    if (WRAPPERS.includes(base(w[0])) || (['bash', 'sh', 'zsh', 'node'].includes(w[0]) && w.length > 1 && WRAPPERS.includes(base(w[1])))) continue;
    if (heavy(w)) return w.slice(0, 3).join(' ');
  }
  return null;
}

// A sleep loop or a long sleep, in the commands this shell runs.
export function polling(cmd) {
  const body = blankQuotes(stripHeredocs(cmd));
  if (/\b(until|while)\b[^\n]*\bdo\b[\s\S]*\bsleep\b/.test(body) || /\b(until|while)\b[\s\S]*;\s*do\b[\s\S]*\bsleep\b/.test(body)) return 'a loop that sleeps';
  for (const m of body.matchAll(/(?:^|[;&|(\n]|\bdo\b|\bthen\b)\s*sleep\s+([0-9.]+)/g)) if (Number(m[1]) > 5) return `sleep ${m[1]}`;
  if (/for\s+\w+\s+in\s+\$\(seq[^)]*\)[\s\S]*\bsleep\b/.test(body)) return 'a loop that sleeps';
  if (/\btail\s+(-\S*\s+)*-[a-zA-Z]*[fF]\b/.test(body)) return 'tail -f on a log (watching, not working)';
  return null;
}

// Opening an .app or running the binary inside one (kept for the agent-jobs rule; the refusal itself is off: The user,
// 2026-10-11, agents may open the app; the fault was one agent doing it on repeat).
export function launchesApp(cmd) {
  return /(^|[;&|(\s])open\s+(-[a-zA-Z]+\s+)*[^\s;&|]*\.app\b|(^|[;&|(\s])open\s+-a\s|\.app\/Contents\/MacOS\//.test(blankQuotes(stripHeredocs(cmd)));
}

// A build of everything, or a test run with no -R or one matching more than 30 tests. null when the scope is named.
export function tooWide(cmd, cwd = process.cwd(), countTests = ctestCount) {
  const body = stripHeredocs(cmd);
  const bare = maskQuotes(body);
  const cd = body.match(/cd\s+(\S+)\s*&&/)?.[1];
  const from = cd ? cd.replace(/^~(?=\/|$)/, homedir()) : cwd;
  if (/(cmake\s+--build|tools\/build\.sh\s+build)\b/.test(bare)) {
    // `build.sh build <one word>`: a build folder (`build.sh build <dir> [target ...]`) builds everything; a target name
    // (`build.sh build [target ...]`) builds one (KWB-14: one target was read as a folder)
    const one = body.match(/tools\/build\.sh\s+build\s+(\S+)\s*($|[;&|])/)?.[1];
    if (/--target\s+all\b/.test(body) || (/cmake\s+--build/.test(body) && !body.includes('--target')) || (one && isFolder(one, from))) {
      return 'a build of every target is refused.';
    }
  }
  const m = bare.match(/(?:\bctest\b|tools\/build\.sh\s+test)([^;&|\n]*)/);
  if (m) {
    const end = m.index + m[0].length;
    const args = body.slice(end - m[1].length, end);
    if (args.includes('--full-gate') || args.includes('--changed')) return null;
    const r = args.match(/-R\s+('([^']*)'|"([^"]*)"|(\S+))/);
    if (!r) return 'a test run with no -R pattern runs the whole suite.';
    const pat = r[2] ?? r[3] ?? r[4] ?? '';
    const tdir = args.match(/--test-dir\s+(\S+)/)?.[1] ?? 'build';
    const n = countTests(isAbsolute(tdir) ? tdir : join(from, tdir), pat);
    if (n > 30) return `the -R pattern '${pat}' matches ${n} tests.`;
  }
  return null;
}

function isFolder(word, from) {
  const p = word.replace(/^~(?=\/|$)/, homedir());
  try { return word.includes('/') || statSync(isAbsolute(p) ? p : join(from, p)).isDirectory(); } catch { return false; }
}

function ctestCount(dir, pat) {
  try {
    const out = execFileSync('ctest', ['--test-dir', dir, '-N', '-R', pat], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] });
    return Number(out.match(/Total Tests:\s*(\d+)/)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

function lightAgent(ev) {
  try {
    const st = JSON.parse(readFileSync(join(homedir(), '.claude/agent-cap-state.json'), 'utf8'));
    return st[ev.session_id ?? 'default']?.kinds?.[ev.agent_id] === 'light';
  } catch {
    return false;
  }
}

function refuse(msg) {
  process.stderr.write(`build-guard: ${msg}\n`);
  return 2;
}

function main(text) {
  let ev;
  try { ev = JSON.parse(text); } catch { return 0; }
  const project = process.env.CLAUDE_PROJECT_DIR ?? ev.cwd ?? '';
  if (project && existsSync(join(project, '.claude', 'hooks', 'pre.js'))) return 0; // a project's own dispatcher wins
  if (ev.tool_name !== 'Bash') return 0;
  const cmd = String(ev.tool_input?.command ?? '');
  const aid = ev.agent_id;
  // AN AGENT BUILDS AND TESTS ONLY WHAT ITS CHANGE NEEDS (one agent ran all 425 tests on 1 core)
  if (aid) {
    const scope = tooWide(cmd, ev.cwd ?? process.cwd());
    if (scope) {
      return refuse(`${scope} Build only the targets your change needs (\`--target X --target Y\`), and run only its tests (\`-R 'pattern'\`, at most 30). ` +
        'The whole suite runs only when the user asks for a full run; the gate before landing is the tests the branch reaches.');
    }
  }
  // NO POLLING (agents ran `until grep -q done log; do sleep 10` for minutes on end)
  const poll = polling(cmd);
  if (poll) {
    return refuse(`polling refused (${poll}). Waiting in a sleep loop hides what you are doing and burns turns. Run the job in the FOREGROUND ` +
      'through the queue (.claude/tools/buildq.mjs and tools/build.sh wait for a slot themselves; the Bash tool allows up to 10 minutes), or start it with ' +
      'run_in_background and you are notified when it ends.');
  }
  // A light agent may RUN an already-built program through the queue (a render), never compile or run a test suite
  if (aid && /(cmake\s+--build|\bctest\b|\bmake\b|\bninja\b|xcodebuild|tools\/build\.sh\s+(build|test))/.test(maskQuotes(stripHeredocs(cmd))) && lightAgent(ev)) {
    return refuse('this agent was started as KIND: light, and light agents do not build or run tests (at most 3 build agents run at once, ' +
      '). Do the light part, and say in your report what needs building.');
  }
  const what = offending(cmd);
  if (!what) return 0;
  return refuse(`\`${what}\` straight from the shell is refused. Nothing may take the whole machine. Run it through the ` +
    `machine-wide build queue, which runs two at a time and waits for a free slot by itself:\n    node .claude/tools/buildq.mjs ${what} ...        ` +
    '(--status shows the slots)\nor the project\'s own wrapper if it has one (the build and test commands in ' +
    '.claude/layout.json). Do not wrap it in a loop.');
}

function selftest() {
  const bad = [];
  const check = (name, fn, cases) => { for (const [cmd, want] of cases) if ((fn(cmd) !== null && fn(cmd) !== false) !== want) bad.push(`${name}: ${cmd.replace(/\n/g, ' / ')}`); };
  check('offending', offending, [
    ['cmake --build build --target X -j18', true], ['cd x && cmake --build build', true], ['ctest --test-dir build', true],
    ['make -j8', true], ['ninja -C out', true], ['cargo build --release', true], ['xcodebuild -scheme A', true],
    ['(cd w && ctest -j6)', true], ['FOO=1 time make', true],
    ['buildq cmake --build build -j18', false], ['~/.claude/bin/buildq ctest --test-dir b', false],
    ['bash tools/build.sh build build Synth_Standalone', false], ['cmake -B build -DX=1', false],
    ['./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter', true],
    ['cd w && build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --pad', true],
    ['buildq ./build/SynthBankProbe_artefacts/RelWithDebInfo/SynthBankProbe --starter', false],
    ['ls build/', false], ['command -v ninja', false], ['ninja -C build -t inputs X', false], ['/opt/homebrew/bin/ninja --version', false],
    ['ninja -C build X', true], ['ctest --test-dir build -N', false], ['ctest --test-dir build --show-only=json-v1', false], ['ctest --version', false],
    ['which ninja', false], ['cargo fmt', false], ['go vet ./...', false], ["grep -n 'cmake --build' f.md", false], ["git commit -m 'make it'", false],
    ["cat > f.py <<'EOF'\ncases = [(\"cmake --build b\", True)]\nmake -j8\nEOF\npython3 f.py", false],
    ['python3 - <<EOF\nctest --test-dir b\nEOF', false], ['echo "run ctest later"', false],
    ['for f in $(git diff --name-only a b) build/evidence/M17/differences.txt; do [ -f "$f" ] && grep -l x "$f"; done', false], // KWB-89: a list's word
    ['ls $(pwd)/x build/notes.txt', false], ['for i in 1 2; do ./build/A_artefacts/Release/AProbe --x; done', true], // a command after do
    ['if true; then make -j8; fi', true], ['while read x; do ninja -C out; done < l', true], ['true || { ctest --test-dir b; }', true],
  ]);
  check('polling', polling, [
    ["until grep -qE 'done' log; do sleep 10; done", true], ['for i in $(seq 1 55); do grep -q x f && break; sleep 20; done', true],
    ['while true; do\n  sleep 15\ndone', true], ['sleep 180', true], ['sleep 2 && ls', false], ['echo sleep 60', false],
    ["cat > f.sh <<'EOF'\nwhile true; do sleep 9; done\nEOF", false], ["grep -n 'sleep 30' x.sh", false],
    ['timeout 585 tail -f /tmp/x.log', true], ['tail -F build.log', true], ['tail -20 build.log', false], ['tail -n 5 f', false],
  ]);
  check('launchesApp', launchesApp, [
    ['open build/Synth_artefacts/RelWithDebInfo/Standalone/Synth.app', true], ['open -a Synth', true],
    ['python3 tools/record_app_probe.py build/x/Synth.app/Contents/MacOS/Synth', true],
    ['cd w && build/T.app/Contents/MacOS/Synth --record /tmp/x.mov &', true],
    ['ls build/Synth_artefacts', false], ['open docs/report.md', false], ["echo 'open X.app'", false],
  ]);
  const dir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'build-guard-'));
  mkdirSync(join(dir, 'build'));
  const wide = (cmd) => tooWide(cmd, dir, (_, pat) => (pat === 'record' ? 4 : 99));
  check('tooWide', wide, [
    ['cmake --build build --target all -j6', true], ['cd w && cmake --build build -j6', true], ['bash tools/build.sh build build', true],
    // one word after build: a folder that exists (or a path) builds everything; a target name builds one (WB-90/95)
    ['bash tools/build.sh build synth_block_probe', false], ['bash tools/build.sh build out/', true],
    ['bash tools/build.sh build synth_slots_probe && echo ok', false],
    ['bash tools/build.sh build build SynthFaceProbe Synth_Standalone', false], ['cmake --build build --target SynthBankProbe -j5', false],
    ['bash tools/build.sh test build --output-on-failure', true], ['ctest --test-dir build -j3', true],
    ["bash tools/build.sh test build -R 'record' --output-on-failure", false], ["ctest --test-dir build -R 'gate'", true],
    // a note or title that names the test runner is not a test run; a real bare run after a quoted note still is
    ['python3 tools/step.py save "the look gate hung inside ctest"', false], ["python3 tools/next_number.py wb --take 'ctest holds the turn'", false],
    ['git commit -m "ctest: fix"', false], ['python3 tools/step.py save "note" && bash tools/build.sh test build', true],
    ['bash tools/build.sh test build --full-gate', false], ['bash tools/build.sh test build --changed', false],
  ]);
  rmSync(dir, { recursive: true, force: true });
  for (const b of bad) console.error(`build-guard selftest FAILED: ${b}`);
  if (!bad.length) console.log('build-guard selftest: OK');
  return bad.length ? 1 : 0;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('build-guard', main));
