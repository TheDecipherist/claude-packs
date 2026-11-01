#!/usr/bin/env node
// gnu-shell (SessionStart; global by design): the Bash tool runs bash 5 with the GNU tools, not zsh with the BSD ones.
//
// Tim, 2026-10-11: "can you do a proper skill/hook for zsh because this seems to happen alot?". Claude Code's Bash tool runs
// the login shell, zsh on this Mac: `$VAR` holding several words is not split, an unmatched glob is an error, and
// `sed -i`, `date -d`, `stat -c` are the BSD tools'. The fix has two halves:
//   1. THE SHELL: settings.json `env` sets CLAUDE_CODE_SHELL and SHELL to /opt/homebrew/bin/bash (Homebrew's bash 5).
//   2. THE TOOLS: this hook writes one `export PATH=...` to the file CLAUDE_ENV_FILE names, which Claude Code sources
//      before every Bash call: ~/.claude/bin first (buildq, the machine-wide build queue), then the `libexec/gnubin`
//      folder of every GNU formula installed, so sed, date, stat, awk, tar, find, xargs, which are the GNU builds; and a
//      line that warns on EVERY command while the session runs zsh (WB-41). Tim's own terminal is not touched.
// It says so at the session's start when it cannot deliver: no Homebrew, a formula missing, the shell not bash 5.
//   node gnu-shell.mjs --selftest
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export const FORMULAS = ['coreutils', 'findutils', 'gawk', 'gnu-sed', 'gnu-tar', 'gnu-which', 'grep'];
const BASH = '/opt/homebrew/bin/bash';
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const gnubin = (pre, f) => join(pre, 'opt', f, 'libexec', 'gnubin');

// Homebrew's prefix, found on the disk, not by asking brew (a hook started by an app may not have brew on PATH).
export function prefix() {
  return ['/opt/homebrew', '/usr/local'].find((p) => isDir(join(p, 'opt')) && FORMULAS.some((f) => isDir(gnubin(p, f)))) ?? null;
}

function bashMajor(path) {
  try { return Number(execFileSync(path, ['--version'], { encoding: 'utf8', timeout: 5000 }).match(/version (\d+)\./)?.[1] ?? 0); } catch { return 0; }
}

// Writes the PATH line; returns what must be said (empty when all is as it should be).
export function run(envFile, shell, pre = prefix()) {
  const said = [];
  if (!pre) {
    return ["gnu-shell: no Homebrew found (/opt/homebrew or /usr/local): this session's sed, date, stat and awk are the macOS (BSD) builds, " +
      "not GNU. Write BSD-safe commands (sed -i '' ..., no date -d)."];
  }
  const have = FORMULAS.filter((f) => isDir(gnubin(pre, f))).map((f) => gnubin(pre, f));
  const missing = FORMULAS.filter((f) => !isDir(gnubin(pre, f)));
  if (envFile && have.length) {
    appendFileSync(envFile, `export PATH="$HOME/.claude/bin:${have.join(':')}:\${PATH}"\n`);
    appendFileSync(envFile, '[ -n "$ZSH_VERSION" ] && echo "gnu-shell: THIS SESSION RUNS ZSH, not bash 5 (variables are not split into words, an unmatched glob is an error). Restart Claude Code to get bash 5." >&2\n');
  }
  if (missing.length) {
    said.push(`gnu-shell: GNU formula(s) not installed: ${missing.join(', ')}; those tools are the macOS (BSD) builds this session. ` +
      `Tim installs them with: brew install ${missing.join(' ')}`);
  }
  if (!envFile) said.push('gnu-shell: CLAUDE_ENV_FILE is not set, so the GNU tools could not be put first on the Bash tool\'s PATH.');
  const sh = shell ?? '';
  if (basename(sh) !== 'bash' || bashMajor(sh) < 5) {
    said.push(`gnu-shell: the Bash tool's shell is ${sh || 'unknown'}, not Homebrew's bash 5 (${BASH}): \`$VAR\` lists do not split ` +
      '(use ${=VAR} or an array) and an unmatched glob is an error. The env block in .claude/settings.json takes effect from the next session.');
  }
  return said;
}

function selftest() {
  const bad = [];
  const expect = (name, ok) => { if (!ok) bad.push(name); };
  const d = mkdtempSync(join(tmpdir(), 'gnu-shell-'));
  const pre = join(d, 'brew');
  for (const f of FORMULAS) mkdirSync(gnubin(pre, f), { recursive: true });
  const envf = join(d, 'env.sh');
  const said = run(envf, existsSync(BASH) ? BASH : '/bin/bash', pre);
  const text = readFileSync(envf, 'utf8');
  const line = text.split('\n')[0];
  expect("every formula's gnubin written first on PATH", FORMULAS.every((f) => line.includes(`/opt/${f}/libexec/gnubin`)) && line.endsWith(':${PATH}"'));
  expect('~/.claude/bin first', line.startsWith('export PATH="$HOME/.claude/bin:'));
  expect('a zsh session is warned on every command (WB-41)', text.includes('[ -n "$ZSH_VERSION" ]') && text.toUpperCase().includes('RESTART'));
  if (existsSync(BASH)) expect('bash 5 and every formula: nothing said', said.length === 0);
  rmSync(gnubin(pre, 'gnu-sed'), { recursive: true });
  expect('a missing formula is said, by name', run(join(d, 'e2.sh'), BASH, pre).some((s) => s.includes('gnu-sed')));
  expect('zsh as the shell is said', run(join(d, 'e3.sh'), '/bin/zsh', pre).some((s) => s.includes("not Homebrew's bash 5")));
  expect("Apple's bash 3.2 is said", run(join(d, 'e4.sh'), '/bin/bash', pre).some((s) => s.includes("not Homebrew's bash 5")));
  rmSync(d, { recursive: true, force: true });
  for (const b of bad) console.error(`FAIL  ${b}`);
  console.log(`gnu-shell selftest: ${bad.length ? `${bad.length} wrong` : 'OK'}`);
  return bad.length ? 1 : 0;
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  try { readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  const said = run(process.env.CLAUDE_ENV_FILE, process.env.CLAUDE_CODE_SHELL || process.env.SHELL);
  if (said.length) console.log(said.join('\n')); // SessionStart: what is printed reaches the session's context
  return 0;
}

process.exit(main());
