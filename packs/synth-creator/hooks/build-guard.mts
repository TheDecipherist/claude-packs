// build-guard (PreToolUse, Bash): no heavy job takes the whole machine.
//
// "nothing should be able to take the entire system". Five agents each compiling with -j18 at once put
// ~90 jobs on 18 cores and every build took hours. Every compile and test run goes through the machine-wide queue
// .claude/tools/buildq.mjs (two at a time; the kit ships it, KF-1). This refuses (exit 2) a heavy command started any other way, an
// agent's build or test run of everything (a polling loop is base's no-polling hook, KWB-204), and any build from an agent started as `KIND: light`
// (~/.claude/agent-cap-state.json keeps the kinds).
//
// Allowed: a command run as `node .claude/tools/buildq.mjs <cmd>` (or a `buildq` on the path), or through a project's own wrapper that
// calls buildq (for example `bash tools/build.sh ...`, the `build` and `test` commands in .claude/layout.json).
// Configuring (`cmake -B build`) is light and allowed. Text that only MENTIONS a command (inside a heredoc, a quoted
// string, a commit message) is never read as running it. A project with its own PreToolUse dispatcher
// (.claude/hooks/pre.js) is left to it.
//
//   node build-guard.mjs --selftest   (lib/build-guard-selftest.mts)
// On the hook contract (typescript order W4): a judge; the project, the home and the folder come from the event's context.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuildLaws } from './lib/build-guard-selftest.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { readJson } from './lib/json.mts';
import { blankQuotes, dropHeredocs } from './lib/shell-lex.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Env, Hook, HookEvent } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const WRAPPERS: readonly string[] = ['buildq', 'buildq.mjs', 'build.sh'];
const base = (p: string): string => p.split('/').pop() ?? '';

export function heavy(w: readonly string[]): boolean {
  const first = w[0] ?? '';
  const exe = base(first);
  const args = w.slice(1);
  // A PROGRAM RUN STRAIGHT FROM A BUILD FOLDER (a probe, a prototype, a test binary): one bank render took ~8 cores
  if (/(^|\/)(build[^/]*|[^/]*_artefacts)\//.test(first) || /^[A-Z]\w*(Probe|Proto|Tests?)$/.test(exe)) return true;
  if (exe === 'cmake') return w.includes('--build');
  if (exe === 'ninja' && args.some((x) => ['-t', '--version', '-n'].includes(x) || x.startsWith('-t'))) return false; // a question to the build graph
  if (exe === 'ctest' && args.some((x) => ['--version', '-N', '--show-only'].includes(x) || x.startsWith('--show-only'))) return false; // listing tests
  if (['ctest', 'ninja', 'xcodebuild', 'msbuild', 'gradle', 'gradlew', 'mvn', 'make', 'gmake'].includes(exe)) return true;
  if (['cargo', 'swift', 'go', 'bazel', 'bazelisk'].includes(exe)) return w.length > 1 && ['build', 'test', 'bench', 'run', 'install'].includes(w[1] ?? '');
  return false;
}

// Heredoc bodies are text written to a file or fed to a program, never commands of this shell; quoted words are no command
// either (shell-lex owns both: W2.5, the other-packs survey's eight and four copies).
// Quoted text (a commit note, a bug title) keeps its length but loses its words, so a note naming the test runner is not a test run
const maskQuotes = (s: string): string => s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (q) => `${q.slice(0, 1)}${' '.repeat(q.length - 2)}${q.slice(-1)}`);
const words = (part: string): string[] => part.replace(/(^|\s)#.*$/, '').trim().split(/\s+/).filter(Boolean);

// The shell's own words before a command: `do make` runs make (KWB-89)
const KEYWORDS: readonly string[] = ['do', 'then', 'else', 'elif', 'if', 'while', 'until', '!', '{', '}'];

export function offending(cmd: string): string | null {
  const pieces = blankQuotes(dropHeredocs(cmd)).split(/(&&|\|\||;|\||\n|\(|\)|\x60|\$\()/);
  for (let i = 0; i < pieces.length; i += 2) {
    if (pieces[i - 1] === ')') continue; // the words after a `$(...)` or `(...)` are its command's arguments, never a new command (KWB-89)
    let w = words(pieces[i] ?? '');
    while (w.length && KEYWORDS.includes(w[0] ?? '')) w = w.slice(1);
    const [head = '', second = ''] = w;
    if ((w.length >= 2 && ['command', 'type', 'which', 'whence', 'hash'].includes(head) && ['-v', '-V', '-p', '-a'].includes(second)) || ['which', 'type', 'whence'].includes(head)) continue;
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0] ?? '') || ['env', 'time', 'nice', 'caffeinate', 'exec', 'nohup', 'command', 'sudo'].includes(w[0] ?? ''))) {
      w = w.slice(1);
      while (w.length && (w[0] ?? '').startsWith('-')) w = w.slice(1);
    }
    const [exe = '', next = ''] = w;
    if (!w.length) continue;
    if (WRAPPERS.includes(base(exe)) || (['bash', 'sh', 'zsh', 'node'].includes(exe) && w.length > 1 && WRAPPERS.includes(base(next)))) continue;
    if (heavy(w)) return w.slice(0, 3).join(' ');
  }
  return null;
}

// Opening an .app or running the binary inside one (kept for the agent-jobs rule; the refusal itself is off: The user,
// 2026-10-11, agents may open the app; the fault was one agent doing it on repeat).
export function launchesApp(cmd: string): boolean {
  return /(^|[;&|(\s])open\s+(-[a-zA-Z]+\s+)*[^\s;&|]*\.app\b|(^|[;&|(\s])open\s+-a\s|\.app\/Contents\/MacOS\//.test(blankQuotes(dropHeredocs(cmd)));
}

const isFolder = (word: string, from: string): boolean => {
  const p = word.replace(/^~(?=\/|$)/, homedir());
  try { return word.includes('/') || statSync(isAbsolute(p) ? p : join(from, p)).isDirectory(); } catch { return false; }
};

/** How many tests `ctest -N -R <pat>` lists in a build folder (0 when ctest cannot say). */
function ctestCount(dir: string, pat: string, env: Env): number {
  try {
    const out = execFileSync('ctest', ['--test-dir', dir, '-N', '-R', pat], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...env } });
    return Number(out.match(/Total Tests:\s*(\d+)/)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

// A build of everything, or a test run with no -R or one matching more than 30 tests. null when the scope is named.
export function tooWide(cmd: string, cwd: string, countTests: (dir: string, pat: string) => number): string | null {
  const body = dropHeredocs(cmd);
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
    const end = (m.index ?? 0) + m[0].length;
    const args = body.slice(end - (m[1] ?? '').length, end);
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

/** Whether the cap hook's state file names this agent a `light` one (never when it cannot be read). */
function lightAgent(event: HookEvent, home: string): boolean {
  const state = readJson<Record<string, { kinds?: Record<string, string> } | undefined>>(join(home, '.claude/agent-cap-state.json'));
  return state?.[event.session_id ?? 'default']?.kinds?.[event.agent_id ?? ''] === 'light';
}

export const hook: Hook = (event, ctx) => {
  if (existsSync(join(ctx.projectDir, '.claude', 'hooks', 'pre.js'))) return pass; // a project's own dispatcher wins
  if (event.tool_name !== 'Bash') return pass;
  const cmd = String(event.tool_input?.command ?? '');
  const aid = event.agent_id;
  // AN AGENT BUILDS AND TESTS ONLY WHAT ITS CHANGE NEEDS (one agent ran all 425 tests on 1 core)
  if (aid) {
    const scope = tooWide(cmd, event.cwd ?? ctx.cwd, (dir, pat) => ctestCount(dir, pat, ctx.env));
    if (scope) {
      return refuse(`build-guard: ${scope} Build only the targets your change needs (\`--target X --target Y\`), and run only its tests (\`-R 'pattern'\`, at most 30). ` +
        'The whole suite runs only when the user asks for a full run; the gate before landing is the tests the branch reaches.');
    }
  }
  // A light agent may RUN an already-built program through the queue (a render), never compile or run a test suite
  if (aid && /(cmake\s+--build|\bctest\b|\bmake\b|\bninja\b|xcodebuild|tools\/build\.sh\s+(build|test))/.test(maskQuotes(dropHeredocs(cmd))) && lightAgent(event, ctx.env.HOME ?? homedir())) {
    return refuse('build-guard: this agent was started as KIND: light, and light agents do not build or run tests (at most 3 build agents run at once, ' +
      '). Do the light part, and say in your report what needs building.');
  }
  const what = offending(cmd);
  if (!what) return pass;
  return refuse(`build-guard: \`${what}\` straight from the shell is refused. Nothing may take the whole machine. Run it through the ` +
    `machine-wide build queue, which runs two at a time and waits for a free slot by itself:\n    node .claude/tools/buildq.mjs ${what} ...        ` +
    '(--status shows the slots)\nor the project\'s own wrapper if it has one (the build and test commands in ' +
    '.claude/layout.json). Do not wrap it in a loop.');
};

/** A build outside the queue is refused from a worktree; the same through buildq is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a build outside the queue', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && cmake --build build -j8' } }, want: 2 },
    { label: 'the same through buildq', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && buildq cmake --build build -j8' } }, want: 0 },
  ],
};

export async function selftest(): Promise<number> {
  const laws: BuildLaws = { offending, launchesApp, tooWide };
  return (await import('./lib/build-guard-selftest.mts')).selftest(fileURLToPath(import.meta.url), laws);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'build-guard', hook, selftest);
