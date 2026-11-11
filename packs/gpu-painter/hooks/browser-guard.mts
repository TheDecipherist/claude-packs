// browser-guard: a natively drawn app never starts a browser. Its picture checks come from the app itself, drawn off-screen
// by the same code as the window, never through a browser (the house law for every GPU-painted synth).
//
// From Tabula 1's browser-guard.py (main 8d5e8b30), made stricter: Tabula allowed one launch script for a batch; this allows
// none. A PreToolUse hook on Bash, Write, Edit, MultiEdit and NotebookEdit. It refuses (exit 2) when the call starts Chrome or
// Chromium (the binary, `open -a`, puppeteer or playwright launching or connecting to one), or writes code that would. Looking
// at processes (ps, pgrep, grep) and words about a browser in .md, .txt, .json pass.
//
// The refusal names the project's own picture command: .claude/layout.json "guards": { "browser": { "pictureCommand" } }.
// Ported from Python (typescript order W4): on the hook contract, judging a command and every file the call writes by any route
// (writesOf) through judgeVerdict, so the runner runs it like every other hook and no installed settings.json names python3.
// `--selftest` shows every rule fire on a planted call and every allowed call pass.
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { refuse } from './lib/verdict.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writeOf, editOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const DEFAULT_PICTURE = "the app's own off-screen render (the project's shot or picture program)";

const way = (pictureCommand: string): string => 'This app is drawn natively and never starts a browser. A picture comes from the app\'s own off-screen render, ' +
  `drawn by the same painter code as the window: ${pictureCommand}.`;

const CHROME = 'Google Chrome(?: for Testing)?(?:\\.app/Contents/MacOS/Google Chrome(?: for Testing)?)?|google-chrome(?:-stable)?|chromium(?:-browser)?|chrome-headless-shell|headless_shell';
const BIN = `(?:["']?[^\\s"';|&]*(?:${CHROME})["']?)`;
const PREFIX = String.raw`^(?:\s*\w+=\S*\s+)*(?:exec\s+|nohup\s+|time\s+|timeout\s+\S+\s+|/usr/bin/time\s+(?:-p\s+)?)*`;
const LAUNCH_BASH: readonly RegExp[] = [
  new RegExp(`${PREFIX}${BIN}(?:\\s|$)`, 'i'),   // the binary as the command of a segment (after env assignments, exec, nohup, timeout N, time)
  /\bopen\b[^|;&]*-a\s+["']?(?:Google Chrome|Chromium)/i,
  /\.launch(?:PersistentContext|Server)?\s*\(|\bchrome-launcher\b/,
  /\bnpx\s+(?:puppeteer|playwright)\b/,
];
const LOOKING = /^\s*(?:ps|pgrep|pkill|kill|killall|grep|egrep|rg|ag|xargs\s+kill|which|ls|stat|file|mdls|defaults\s+read|echo|printf|cat|head|tail|wc|sed|awk)\b/;
const STARTS = String.raw`\s*\([^)]{0,300}(?:chrome|chromium|--headless)`;
// code that starts Chrome: a process call or launcher near a Chrome name or a headless flag
const CODE: readonly RegExp[] = [
  new RegExp(String.raw`(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)${STARTS}`, 'i'),
  new RegExp(String.raw`subprocess\.(?:run|Popen|call|check_call|check_output)${STARTS}`, 'i'),
  new RegExp(String.raw`os\.(?:system|popen)${STARTS}`, 'i'),
  // a driver launching or connecting to a browser
  /\b(?:chromium|firefox|webkit|puppeteer|browserType)\s*\.\s*launch(?:PersistentContext|Server)?\s*\(/,
  /\bchrome-launcher\b/,
  /\bconnectOverCDP\b|\bpuppeteer\s*\.\s*connect\s*\(/,
  /['"]--headless(?:=new)?['"]/,
  /['"]--screenshot(?:=|['"])/,
];

function segments(command: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of command) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (';|&\n'.includes(ch)) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** A heredoc's body is text handed to a program, not a command: blanked before the command scan (WB-20: C++ source
 *  with w.launch(...) in it, written to a file by cat, was read as a browser launch). A script given to an interpreter
 *  (node, python with a heredoc) is still read whole, below. */
function blankHeredocs(command: string): string {
  const out: string[] = [];
  const lines = command.split('\n');
  for (let i = 0; i < lines.length;) {
    const line = lines[i] ?? '';
    out.push(line);
    i += 1;
    const tag = /<<-?\s*['"]?(\w+)['"]?/.exec(line)?.[1];
    if (tag === undefined) continue;
    while (i < lines.length && (lines[i] ?? '').trim() !== tag) i += 1;
    if (i < lines.length) { out.push(lines[i] ?? ''); i += 1; }
  }
  return out.join('\n');
}

export function checkBash(command: string, picture: string): string | null {
  for (const seg of segments(blankHeredocs(command))) {
    if (LOOKING.test(seg)) continue;
    if (LAUNCH_BASH.some((rx) => rx.test(seg))) return `this starts Chrome directly (\`${seg.slice(0, 90)}\`). ${way(picture)}`;
  }
  // a script handed to an interpreter inline (node -e, python -c, a heredoc)
  if (/\b(?:node|python3?|deno|bun)\b/.test(command) && CODE.some((rx) => rx.test(command))) return `this script starts Chrome itself. ${way(picture)}`;
  return null;
}

export function checkCode(path: string, text: string, picture: string): string | null {
  if (!text) return null;
  if (/browser-guard\.(?:mts|mjs|py)$/.test(path)) return null;   // this file names what it catches
  if (/\.(md|txt|json|csv)$/.test(path)) return null;             // words about Chrome, not code that starts it
  const found = CODE.map((rx) => rx.exec(text)).find((m) => m !== null);
  return found ? `${path} would start Chrome itself (\`${found[0].slice(0, 80)}\`). ${way(picture)}` : null;
}

/** The lines a write adds (all of them for a new file), so code that was already there is not judged again. */
export function addedText(before: string | null, after: string | null): string {
  const old = new Set((before ?? '').split('\n'));
  return (after ?? '').split('\n').filter((l) => !old.has(l)).join('\n');
}

function pictureOf(guards: Record<string, unknown> | undefined): string {
  const browser = guards?.['browser'];
  const picked = typeof browser === 'object' && browser !== null ? (browser as Record<string, unknown>)['pictureCommand'] : undefined;
  return typeof picked === 'string' ? picked : DEFAULT_PICTURE;
}

// The command is judged here, not by the frame: a browser started after `cd /tmp` is still a browser started (the python hook
// judged every command), and the frame skips a command that leaves the project. The files a call writes go through the frame.
export const hook: Hook = (event, ctx) => {
  const picture = pictureOf(ctx.layout.guards);
  const started = event.tool_name === 'Bash' ? checkBash(event.tool_input?.command ?? '', picture) : null;
  if (started !== null) return refuse(`BLOCKED by browser-guard: ${started}\n`);
  return judgeVerdict(event, {
    name: 'browser-guard',
    write: (w) => { const r = w.after === null ? null : checkCode(w.path, addedText(w.before, w.after), picture); return r && `BLOCKED by browser-guard: ${r}\n`; },
  }, ctx);
};

/** A worktree is the project: a launch written there is refused, and ordinary painter code is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a launch written in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/tools/shot.mjs', content: "import puppeteer from 'puppeteer';\nconst b = await puppeteer.launch();\n" } }, want: 2 },
    { label: 'painter code in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/painter/Draw.cpp', content: 'void draw() {}\n' } }, want: 0 },
  ],
};

const CHROME_APP = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LAUNCH_JS = "const { chromium } = require('playwright'); await chromium.launch();";

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'kit/synthpanel-creator/src/raster.js': 'a', 'lib/painter/src/draw.cpp': 'a' });
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const at = (rel: string): string => `${dir}/${rel}`;
  const sh = (command: string): unknown => bashOf(command, dir);
  const blocked: [string, unknown][] = [
    ['the Chrome binary, headless, screenshot', sh(`"${CHROME_APP}" --headless=new --screenshot=/tmp/a.png file:///tmp/a.html`)],
    ['the binary after a cd, single-quoted', sh(`cd /tmp && '${CHROME_APP}' --headless --dump-dom file:///x.html > x`)],
    ['google-chrome after an env assignment', sh('CHROME=1 google-chrome --headless --screenshot x')],
    ['chromium behind timeout', sh('timeout 30 chromium --headless --print-to-pdf a.html')],
    ['open -a "Google Chrome"', sh('open -a "Google Chrome" screenshots/a.png')],
    ['node -e puppeteer launch', sh("node -e \"const p = require('puppeteer'); p.launch()\"")],
    ['node -e playwright chromium.launch', sh("node -e \"import('playwright').then(({chromium}) => chromium.launch())\"")],
    ['python heredoc running Chrome', sh(`python3 - <<'EOF'\nimport subprocess\nsubprocess.run(['${CHROME_APP}','--headless'])\nEOF`)],
    ['Write: execFile with --headless', writeOf(at('tools/shot.mjs'), "import { execFile } from 'node:child_process';\nexecFile(chrome, ['--headless=new', '--screenshot=a.png'])")],
    ['Edit: execFileSync with --headless', editOf(at('kit/synthpanel-creator/src/raster.js'), 'a', "execFileSync(chrome, ['--headless=new'])")],
    ['Write: python subprocess with --headless', writeOf(at('tools/a.py'), "import subprocess\nsubprocess.run([CHROME, '--headless', url])")],
    ['Write: puppeteer.launch', writeOf(at('tools/b.js'), "import puppeteer from 'puppeteer';\nconst br = await puppeteer.launch();")],
    ['Write: spawn with --headless', writeOf(at('onechrome.js'), "spawn(chrome, ['--headless=new'])")],
    ['Write: connectOverCDP', writeOf(at('tools/d.mjs'), 'const browser = await chromium.connectOverCDP(endpoint);')],
    ['Write: playwright chromium.launch', writeOf(at('tools/c.mjs'), "import { chromium } from 'playwright';\nconst browser = await chromium.launch();")],
    ['a node heredoc still counts (WB-20)', sh(`node - <<'EOF'\n${LAUNCH_JS}\nEOF`)],
    ['a worktree is the project', writeOf(at('.claude/worktrees/agent-a/tools/e.mjs'), 'await puppeteer.launch();')],
    ['a heredoc into a file (WB-69)', sh(`cat > ${at('tools/s.mjs')} <<'EOF'\nconst b = await puppeteer.launch();\nEOF`)],
    ['NotebookEdit', { tool_name: 'NotebookEdit', tool_input: { notebook_path: at('tools/n.ipynb'), new_source: 'await chromium.launch()' } }],
  ];
  const allowed: [string, unknown][] = [
    ['looking at processes, then killing them', sh("ps -axo pid,command | grep -E 'Google Chrome.*--headless' | grep -v grep | awk '{print $1}' | xargs kill -KILL")],
    ['the app\'s own picture program', sh('out/synth_shot --render build/pictures/s3/a.png --size 3584x2016')],
    ['grep for the flag', sh("grep -rn -- '--headless' kit/ | head")],
    ['a commit message naming it', sh("git commit -m 'B-382: one Chrome (no more google-chrome --headless per sprite)' -- bugs.md")],
    ['words in a .md', writeOf(at('bugs.md'), "one headless Chrome per sprite, execFile(chrome, ['--headless'])")],
    ['painter code', editOf(at('lib/painter/src/draw.cpp'), 'a', 'panel.setLit ("expand", open);')],
    ['C++ with w.launch written by cat (WB-20)', sh(`cat > probes/reach/r.cpp <<'EOF'\n    w.launch(0, sim::Kind::head, kKey, 1, foot, vel, age);\nEOF\nbash tools/build.sh build r`)],
    ['another project\'s file', writeOf('/elsewhere/scratch/patch.py', "s = 'await puppeteer.launch();'")],
  ];
  const status = (event: unknown): number | null => runHook(hookFile, dir, event).status;
  return verdicts('browser-guard', [
    ...blocked.map(([label, event]): [string, number | null, number] => [`blocked: ${label}`, status(event), 2]),
    ...allowed.map(([label, event]): [string, number | null, number] => [`allowed: ${label}`, status(event), 0]),
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'browser-guard', hook, selftest);
