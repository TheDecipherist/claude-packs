#!/usr/bin/env node
// version-pin-guard: refuses a new or changed version pin unless docs/versions.md has a row
// for that dependency checked within MAX_AGE days. Pairs with the latest-versions skill.
// PreToolUse on Write|Edit|MultiEdit|Bash. Exit 2 blocks; stderr goes back to Claude. Every route that writes a
// dependency file is judged (WB-69): the Write tool, an Edit or MultiEdit (its new_string taken literally), an install
// command, and the shell writing the file (>, >>, tee, sed -i, cp, mv, a heredoc; lib/shell-writes.mjs).
// The dependency files are read in lib/manifest-pins.mts, the install commands in lib/command-pins.mts.
// `node version-pin-guard.mjs --selftest` proves every extractor and the age check.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { changedPins, extractorFor, fromCargo, fromCmake, fromDockerfile, fromGoMod, fromPackageJson, fromPyproject, fromRequirements, fromWorkflow } from './lib/manifest-pins.mts';
import type { Pin } from './lib/manifest-pins.mts';
import { installDir, pinsFromCommand } from './lib/command-pins.mts';
import { eventOf, isMain, stdinText } from './lib/global-hook.mts';
import { afterText, shellWrites } from './lib/shell-writes.mts';
import type { Env, HookEvent, ToolInput } from '../../packs/base/hooks/lib/types.d.mts';

const DAY = 86_400_000;
const DEFAULT_MAX_AGE = 14;

export { changedPins, extractorFor, installDir, pinsFromCommand };

// ---------- docs/versions.md ----------
export function checkedDates(versionsText: string): Map<string, number> {
  const dates = new Map<string, number>();
  for (const line of versionsText.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim().replace(/`/g, '')).filter(Boolean);
    const date = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const first = cells[0];
    if (first === undefined || !date) continue;
    const key = first.toLowerCase();
    const t = Date.parse(date[1] ?? '');
    if ((dates.get(key) ?? -Infinity) < t) dates.set(key, t);
  }
  return dates;
}

function lookup(dates: ReadonlyMap<string, number>, name: string): number | undefined {
  const n = name.toLowerCase();
  for (const k of [n, n.split('/').pop() ?? n, n.replace(/^@[^/]+\//, '')]) { const t = dates.get(k); if (t !== undefined) return t; }
  return undefined;
}

/** What is wrong with the pins: one line each for a pin with no row, or whose row is older than `maxAge` days at `now`. */
export function verdict(pins: readonly Pin[], dates: ReadonlyMap<string, number>, now: number, maxAge: number = DEFAULT_MAX_AGE): string[] {
  const problems: string[] = [];
  for (const p of pins) {
    const t = lookup(dates, p.name);
    if (t === undefined) problems.push(`${p.name} ${p.version}: no row in docs/versions.md`);
    else if (now - t > maxAge * DAY) problems.push(`${p.name} ${p.version}: last checked ${new Date(t).toISOString().slice(0, 10)}, over ${maxAge} days ago`);
  }
  return problems;
}

// The project the pin is written in: the nearest folder above it with docs/versions.md or .git
// (a file in a git worktree), so an agent worktree and a sibling project read their own table.
// CLAUDE_PROJECT_DIR is only the fallback, and for a worktree that carries no versions.md.
export function projectRoot(start: string, env: string | undefined): string {
  let d = resolve(start);
  let found: string | null = null;
  for (;;) {
    if (existsSync(join(d, '.git')) || existsSync(join(d, 'docs', 'versions.md'))) { found = d; break; }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  if (!found) return env ?? resolve(start);
  const has = (root: string): boolean => existsSync(join(root, 'docs', 'versions.md'));
  if (!has(found) && env && has(env) && !relative(resolve(env), found).startsWith('..')) return env;
  return found;
}

// ---------- hook ----------
function newText(input: ToolInput, current: string): string {
  if (typeof input.content === 'string') return input.content;
  const edits = input.edits ?? (input.old_string !== undefined ? [{ old_string: input.old_string, new_string: input.new_string ?? '', ...(input.replace_all ? { replace_all: true } : {}) }] : []);
  let text = current;
  // literally: a new_string holding `$&` or `$1` was read as a replacement pattern (the Edit gap, WB-69)
  for (const e of edits) text = e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, () => e.new_string);
  return text;
}

/** The pins a call adds and the folder they are judged from; none when it touches no dependency file and runs no install. */
function pinsOf(event: HookEvent, cwd: string, env: Env): { pins: Pin[]; where: string } {
  const input = event.tool_input ?? {};
  let pins: Pin[] = [];
  let where = cwd;
  if (event.tool_name === 'Bash') {
    const command = input.command ?? '';
    pins = pinsFromCommand(command);
    where = installDir(command, event.cwd ?? cwd, env.HOME);
    for (const w of shellWrites(command, where, env)) {
      const extract = extractorFor(w.path);
      if (!extract) continue;
      const { before, after } = afterText(w);
      if (after !== null) pins.push(...changedPins(extract, before, after));
      where = dirname(w.path);
    }
    return { pins, where };
  }
  const file = input.file_path;
  const extract = file ? extractorFor(file) : null;
  if (!file || !extract) return { pins, where };
  const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
  return { pins: changedPins(extract, before, newText(input, before)), where: dirname(file) };
}

/** The hook: the refusal text for an event (exit 2), or null to let it through. `env` is the process's own, read by the caller. */
export function hook(event: HookEvent, cwd: string, env: Env, now: number): string | null {
  const { pins, where } = pinsOf(event, cwd, env);
  if (pins.length === 0) return null;
  const vfile = join(projectRoot(where, env.CLAUDE_PROJECT_DIR), 'docs', 'versions.md');
  const dates = existsSync(vfile) ? checkedDates(readFileSync(vfile, 'utf8')) : new Map<string, number>();
  const problems = verdict(pins, dates, now, Number(env.VERSION_GUARD_DAYS ?? DEFAULT_MAX_AGE));
  if (problems.length === 0) return null;
  return `version-pin-guard: look up the newest release first (latest-versions skill).\n${problems.map((p) => `- ${p}`).join('\n')}\nAdd or refresh each row in ${vfile} (name | latest stable | YYYY-MM-DD | source URL | used | decision), then pin.\n`;
}

export function selftest(): number {
  let cases = 0;
  const eq = (a: unknown, b: unknown, what: string): void => { cases += 1; if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}`); };
  const names = (pins: readonly Pin[]): string[] => pins.map((p) => p.name);
  eq(names(changedPins(fromPackageJson, '{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1","fastify":"^5.6.0"}}')), ['fastify'], 'package.json add');
  eq(names(changedPins(fromPackageJson, '{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1"},"x":2}')), [], 'package.json unchanged');
  eq([...fromCmake('FetchContent_Declare(JUCE\n  GIT_REPOSITORY https://github.com/juce-framework/JUCE\n  GIT_TAG 9.0.4)')], [['JUCE', '9.0.4']], 'cmake GIT_TAG');
  eq([...fromCmake('CPMAddPackage("gh:fmtlib/fmt@11.2.0")')], [['fmt', '11.2.0']], 'cmake CPM');
  eq([...fromRequirements('numpy==2.3.1  # x\n-r base.txt\n')], [['numpy', '==2.3.1']], 'requirements');
  eq([...fromPyproject('dependencies = ["httpx>=0.28", "rich"]')], [['httpx', '>=0.28']], 'pyproject');
  eq([...fromCargo('[package]\nversion = "0.1.0"\n[dependencies]\nserde = { version = "1.0.219", features = ["derive"] }\n')], [['serde', '1.0.219']], 'cargo');
  eq([...fromGoMod('module x\nrequire (\n  github.com/spf13/cobra v1.9.1\n)\n')], [['github.com/spf13/cobra', 'v1.9.1']], 'go.mod');
  eq([...fromDockerfile('FROM --platform=linux/amd64 node:24-slim AS build\n')], [['node', '24-slim']], 'dockerfile');
  eq([...fromWorkflow('- uses: actions/checkout@v5\n- uses: github/codeql-action/init@v3')], [['actions/checkout', 'v5'], ['github/codeql-action', 'v3']], 'workflow');
  eq(names(pinsFromCommand('cd x && npm install -D typescript@5.9.3 zod')), ['typescript', 'zod'], 'npm install');
  eq(names(pinsFromCommand('pip install --break-system-packages requests==2.32.5')), ['requests'], 'pip install');
  eq(pinsFromCommand('npm install'), [], 'bare npm install');
  eq(names(pinsFromCommand('npm install fastify 2>&1 | tail -5')), ['fastify'], 'install with 2>&1');
  eq(names(pinsFromCommand('npm i zod > /tmp/npm.log 2>&1')), ['zod'], 'install with > log 2>&1');
  eq(names(pinsFromCommand('pip install requests==2.32.5 &>/dev/null &')), ['requests'], 'install with &>/dev/null &');
  eq(pinsFromCommand('npm install 2>&1'), [], 'bare install with 2>&1');
  eq(pinsFromCommand("python3 - <<'EOF'\n# then npm install zod and pip install rich\nEOF"), [], 'a heredoc body is text');
  eq(pinsFromCommand('echo run npm install zod first'), [], 'an echo that names an install');
  eq(names(pinsFromCommand('sudo npm install -g zod@4')), ['zod'], 'install after a prefix');
  eq(pinsFromCommand('npm install $T/x.tgz ${DIR}/y.tgz ~/z.tgz'), [], 'a path through a shell variable or ~ is no package (KWB-171)');
  eq(names(pinsFromCommand('npm install $T/x.tgz zod@4')), ['zod'], 'a package beside a variable path is still read (KWB-171)');
  eq(installDir('cd /p/other && npm install zod@4', '/p/here', '/home/u'), '/p/other', 'an install after cd runs there');
  eq(installDir('npm install zod@4 && cd /p/other', '/p/here', '/home/u'), '/p/here', 'a cd after the install does not move it');
  eq(installDir('cd ~/proj && npm install zod@4', '/p/here', '/home/u'), '/home/u/proj', 'a cd to ~ goes to the caller\'s home');
  const now = Date.parse('2026-10-26');
  const dates = checkedDates('| name | latest |\n|---|---|\n| fastify | 5.6.1 | 2026-10-20 | https://github.com/fastify/fastify/releases | 5.6.1 | use |\n| `JUCE` | 9.0.4 | 2026-09-01 | url | 8.0.4 | F4 |\n');
  eq(verdict([{ name: 'fastify', version: '5.6.1' }], dates, now), [], 'fresh row passes');
  eq(verdict([{ name: 'JUCE', version: '9.0.4' }], dates, now).length, 1, 'stale row blocks');
  eq(verdict([{ name: 'JUCE', version: '9.0.4' }], dates, now, 90), [], 'a longer age passes the same row');
  eq(verdict([{ name: 'zod', version: '4' }], dates, now).length, 1, 'missing row blocks');
  eq(verdict([{ name: 'github.com/fastify', version: 'v1' }], dates, now), [], 'last path segment matches');
  console.log(`version-pin-guard selftest: OK (${cases} cases)`);
  return 0;
}

if (isMain(import.meta.url, process.argv[1])) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  const event = eventOf(stdinText());
  const said = event ? hook(event, process.cwd(), process.env, Date.now()) : null;
  if (said) process.stderr.write(said);
  process.exit(said ? 2 : 0);
}
