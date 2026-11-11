#!/usr/bin/env node
// gnu-shell (SessionStart; global by design): the Bash tool runs bash 5 with the GNU tools, not zsh with the BSD ones.
//
// "can you do a proper skill/hook for zsh because this seems to happen alot?". Claude Code's Bash tool runs
// the login shell, zsh on this Mac: `$VAR` holding several words is not split, an unmatched glob is an error, and
// `sed -i`, `date -d`, `stat -c` are the BSD tools'. The fix has two halves:
//   1. THE SHELL: settings.json `env` sets CLAUDE_CODE_SHELL and SHELL to /opt/homebrew/bin/bash (Homebrew's bash 5).
//   2. THE TOOLS: this hook writes one `export PATH=...` to the file CLAUDE_ENV_FILE names, which Claude Code sources
//      before every Bash call: ~/.claude/bin first (buildq, the machine-wide build queue), then the `libexec/gnubin`
//      folder of every GNU formula installed, so sed, date, stat, awk, tar, find, xargs, which are the GNU builds; and a
//      line that warns on EVERY command while the session runs zsh (WB-41). The user's own terminal is not touched.
// It says so at the session's start when it cannot deliver: no Homebrew, a formula missing, the shell not bash 5.
// On Linux (KWB-27) the system's sed, date, stat and awk are the GNU builds already: no Homebrew is looked for, the PATH line
// puts only ~/.claude/bin first, and the shell is still checked for bash 5 (any bash 5, not Homebrew's).
//   node gnu-shell.mjs --selftest
import { execFileSync } from 'node:child_process';
import { appendFileSync, chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { finish, isFolder, isMain, stdinText } from './lib/global-hook.mts';
import type { Env } from '../../packs/base/hooks/lib/types.d.mts';

export const FORMULAS: readonly string[] = ['coreutils', 'findutils', 'gawk', 'gnu-sed', 'gnu-tar', 'gnu-which', 'grep'];
const BASH = '/opt/homebrew/bin/bash';
const gnubin = (pre: string, f: string): string => join(pre, 'opt', f, 'libexec', 'gnubin');

/** Homebrew's prefix, found on the disk, not by asking brew (a hook started by an app may not have brew on PATH). */
export function prefix(): string | null {
  return ['/opt/homebrew', '/usr/local'].find((p) => isFolder(join(p, 'opt')) && FORMULAS.some((f) => isFolder(gnubin(p, f)))) ?? null;
}

function bashMajor(path: string): number {
  try { return Number(execFileSync(path, ['--version'], { encoding: 'utf8', timeout: 5000 }).match(/version (\d+)\./)?.[1] ?? 0); } catch { return 0; }
}

const shellSaid = (sh: string | undefined, mac: boolean): string => `gnu-shell: the Bash tool's shell is ${sh || 'unknown'}, not ${mac ? `Homebrew's bash 5 (${BASH})` : 'bash 5'}: ` +
  '`$VAR` lists do not split (use ${=VAR} or an array) and an unmatched glob is an error. The env block in .claude/settings.json takes effect from the next session.';
const shellOk = (sh: string | undefined): boolean => basename(sh ?? '') === 'bash' && bashMajor(sh ?? '') >= 5;
const ZSH_WARNING = '[ -n "$ZSH_VERSION" ] && echo "gnu-shell: THIS SESSION RUNS ZSH, not bash 5 (variables are not split into words, an unmatched glob is an error). Restart Claude Code to get bash 5." >&2\n';

// Linux: the tools are GNU already; ~/.claude/bin first, the zsh warning, and the shell checked.
function runLinux(envFile: string | undefined, shell: string | undefined): string[] {
  const said: string[] = [];
  if (envFile) {
    appendFileSync(envFile, 'export PATH="$HOME/.claude/bin:${PATH}"\n');
    appendFileSync(envFile, ZSH_WARNING);
  } else said.push('gnu-shell: CLAUDE_ENV_FILE is not set, so ~/.claude/bin could not be put first on the Bash tool\'s PATH.');
  if (!shellOk(shell)) said.push(shellSaid(shell, false));
  return said;
}

/** Where it runs: the platform, and (macOS) Homebrew's prefix, found on the disk when not given. */
export interface RunWhere { platform: string; pre?: string | null }

/** Writes the PATH line; returns what must be said (empty when all is as it should be). */
export function run(envFile: string | undefined, shell: string | undefined, { platform, pre }: RunWhere): string[] {
  if (platform !== 'darwin') return runLinux(envFile, shell);
  const found = pre === undefined ? prefix() : pre;
  const said: string[] = [];
  if (!found) {
    return ["gnu-shell: no Homebrew found (/opt/homebrew or /usr/local): this session's sed, date, stat and awk are the macOS (BSD) builds, " +
      "not GNU. Write BSD-safe commands (sed -i '' ..., no date -d)."];
  }
  const have = FORMULAS.filter((f) => isFolder(gnubin(found, f))).map((f) => gnubin(found, f));
  const missing = FORMULAS.filter((f) => !isFolder(gnubin(found, f)));
  if (envFile && have.length) {
    appendFileSync(envFile, `export PATH="$HOME/.claude/bin:${have.join(':')}:\${PATH}"\n`);
    appendFileSync(envFile, ZSH_WARNING);
  }
  if (missing.length) {
    said.push(`gnu-shell: GNU formula(s) not installed: ${missing.join(', ')}; those tools are the macOS (BSD) builds this session. ` +
      `Install them with: brew install ${missing.join(' ')}`);
  }
  if (!envFile) said.push('gnu-shell: CLAUDE_ENV_FILE is not set, so the GNU tools could not be put first on the Bash tool\'s PATH.');
  if (!shellOk(shell)) said.push(shellSaid(shell, true));
  return said;
}

/** The hook: what it must say at the session's start (printed, so it reaches the session's context). */
export function hook(env: Env, platform: string): string[] {
  return run(env.CLAUDE_ENV_FILE, env.CLAUDE_CODE_SHELL || env.SHELL, { platform });
}

// A fake bash that reports the given version: the selftest never depends on this machine's /bin/bash (KWB-27).
function fakeBash(dir: string, version: string): string {
  const file = join(dir, `bash-${version}`, 'bash');
  mkdirSync(join(dir, `bash-${version}`), { recursive: true });
  writeFileSync(file, `#!/bin/sh\necho 'GNU bash, version ${version}(1)-release'\n`);
  chmodSync(file, 0o755);
  return file;
}

export function selftest(): number {
  const bad: string[] = [];
  const expect = (name: string, ok: boolean): void => { if (!ok) bad.push(name); };
  const d = mkdtempSync(join(tmpdir(), 'gnu-shell-'));
  const bash5 = fakeBash(d, '5.2.37');
  const bash32 = fakeBash(d, '3.2.57');
  const notBash5 = (said: readonly string[]): boolean => said.some((s) => s.includes('not ') && s.includes('bash 5'));
  // macOS
  const pre = join(d, 'brew');
  for (const f of FORMULAS) mkdirSync(gnubin(pre, f), { recursive: true });
  const mac = (file: string, shell: string): string[] => run(join(d, file), shell, { platform: 'darwin', pre });
  const said = mac('env.sh', bash5);
  const text = readFileSync(join(d, 'env.sh'), 'utf8');
  const line = text.split('\n')[0] ?? '';
  expect("mac: every formula's gnubin written first on PATH", FORMULAS.every((f) => line.includes(`/opt/${f}/libexec/gnubin`)) && line.endsWith(':${PATH}"'));
  expect('mac: ~/.claude/bin first', line.startsWith('export PATH="$HOME/.claude/bin:'));
  expect('mac: a zsh session is warned on every command (WB-41)', text.includes('[ -n "$ZSH_VERSION" ]') && text.toUpperCase().includes('RESTART'));
  expect('mac: bash 5 and every formula: nothing said', said.length === 0);
  expect('mac: no Homebrew is said', run(join(d, 'e1.sh'), bash5, { platform: 'darwin', pre: null }).some((s) => s.includes('no Homebrew')));
  expect('mac: zsh as the shell is said', mac('e3.sh', '/bin/zsh').some((s) => s.includes("not Homebrew's bash 5")));
  expect("mac: Apple's bash 3.2 is said", mac('e4.sh', bash32).some((s) => s.includes("not Homebrew's bash 5")));
  rmSync(gnubin(pre, 'gnu-sed'), { recursive: true });
  expect('mac: a missing formula is said, by name', mac('e2.sh', bash5).some((s) => s.includes('gnu-sed')));
  // Linux (KWB-27): the system tools are GNU; no Homebrew is looked for, even when one is there
  const linux = (file: string, shell: string): string[] => run(join(d, file), shell, { platform: 'linux', pre });
  const lsaid = linux('l1.sh', bash5);
  const ltext = readFileSync(join(d, 'l1.sh'), 'utf8');
  expect('linux: bash 5: nothing said (no Homebrew, no BSD tools)', lsaid.length === 0);
  expect('linux: ~/.claude/bin first, no gnubin', ltext.split('\n')[0] === 'export PATH="$HOME/.claude/bin:${PATH}"');
  expect('linux: a zsh session is warned on every command', ltext.includes('[ -n "$ZSH_VERSION" ]'));
  expect('linux: zsh as the shell is said', notBash5(linux('l2.sh', '/usr/bin/zsh')));
  expect('linux: bash 3.2 is said', notBash5(linux('l3.sh', bash32)));
  expect('linux: no env file is said', run(undefined, bash5, { platform: 'linux' }).some((s) => s.includes('CLAUDE_ENV_FILE')));
  rmSync(d, { recursive: true, force: true });
  return finish('gnu-shell', bad, 'OK');
}

if (isMain(import.meta.url, process.argv[1])) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  stdinText();   // SessionStart sends its event; this hook reads none of it
  const said = hook(process.env, process.platform);
  if (said.length) console.log(said.join('\n')); // SessionStart: what is printed reaches the session's context
  process.exit(0);
}
