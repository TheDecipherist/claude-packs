#!/usr/bin/env node
// Run the test command and hand back only the verdict, so a 5,000-line CTest log never enters
// the conversation. The full output goes to a log file whose path is in the JSON.
//   node .claude/tools/test-verdict.mjs [-R <regex>]                    project test command (layout.commands.test)
//   node .claude/tools/test-verdict.mjs --red <name,name> [-R <regex>]  Red Gate: these tests MUST fail
//   node .claude/tools/test-verdict.mjs -- <any command>                your own command
// Exit 0: verdict as required (green, or the --red tests all failing). Exit 1: real failures
// (or a --red test passing). Exit 2: the runner itself broke (no tests ran, command missing):
// never a verdict about the code; fix the runner first.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

export function parseCtest(out) {
  const total = out.match(/(\d+)% tests passed, (\d+) tests? failed out of (\d+)/);
  const failed = [];
  const block = out.split(/The following tests FAILED:/)[1] ?? '';
  for (const m of block.matchAll(/^\s*\d+\s+-\s+(\S+)\s+\(([^)]+)\)/gm)) failed.push({ name: m[1], why: m[2] });
  if (!total) return null;
  return { total: Number(total[3]), failed };
}

function detail(out, name) {
  const at = out.indexOf(`Test: ${name}`) >= 0 ? out.indexOf(`Test: ${name}`) : out.indexOf(name);
  return at < 0 ? '' : out.slice(at, at + 1200).split('\n').slice(0, 15).join('\n');
}

function command(args) {
  const dash = args.indexOf('--');
  if (dash >= 0) return args.slice(dash + 1).join(' ');
  let base;
  try {
    base = JSON.parse(readFileSync(join(ROOT, '.claude', 'layout.json'), 'utf8')).commands?.test;
  } catch { /* no layout */ }
  base ??= 'ctest --test-dir build --output-on-failure';
  const r = args.indexOf('-R');
  return r >= 0 ? `${base} -R '${args[r + 1]}'` : base;
}

function main(args) {
  const red = args.includes('--red') ? args[args.indexOf('--red') + 1].split(',').filter(Boolean) : null;
  const cmd = command(args);
  const run = spawnSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  mkdirSync(join(ROOT, '.claude', 'state'), { recursive: true });
  const log = join('.claude', 'state', 'last-test.log');
  writeFileSync(join(ROOT, log), out);
  const parsed = parseCtest(out);
  if (!parsed || parsed.total === 0) {
    console.log(JSON.stringify({ verdict: 'RUNNER_BROKEN', command: cmd, exit: run.status, log, tail: out.split('\n').slice(-15).join('\n') }, null, 1));
    return 2;
  }
  const failures = parsed.failed.map((f) => ({ ...f, detail: detail(out, f.name) }));
  if (red) {
    const failedNames = new Set(parsed.failed.map((f) => f.name));
    const passing = red.filter((n) => !failedNames.has(n));
    const verdict = passing.length ? 'RED_GATE_FAILED' : 'RED_CONFIRMED';
    console.log(JSON.stringify({ verdict, mustFail: red, passingUnexpectedly: passing, total: parsed.total, log }, null, 1));
    return passing.length ? 1 : 0;
  }
  const verdict = failures.length ? 'FAILED' : 'GREEN';
  console.log(JSON.stringify({ verdict, total: parsed.total, failed: failures, log }, null, 1));
  return failures.length ? 1 : 0;
}

if (process.argv.includes('--selftest')) {
  const sample = '50% tests passed, 1 tests failed out of 2\n\nThe following tests FAILED:\n\t  2 - svf_stable_under_fm (Failed)\nErrors while running CTest\n';
  const p = parseCtest(sample);
  const ok = p?.total === 2 && p.failed[0]?.name === 'svf_stable_under_fm' && parseCtest('100% tests passed, 0 tests failed out of 9')?.failed.length === 0 && parseCtest('No tests were found!!!') === null;
  console.log(ok ? 'test-verdict selftest: OK (3 cases)' : 'test-verdict selftest FAILED');
  process.exit(ok ? 0 : 1);
}
process.exit(main(process.argv.slice(2)));
