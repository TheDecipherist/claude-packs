#!/usr/bin/env node
// PreToolUse (Bash): stage files by name, never everything at once, and never secrets.
// `git add -A`, `git add .`, `git add --all` and `git commit -a` sweep build output, renders,
// scratch files and keys into history. Exit 2 refuses the command. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { verdicts } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const SECRET = /(^|[\s/])(\.env(\.[\w.-]+)?|[\w.-]+\.(pem|key|p12|pfx)|id_(rsa|ed25519)|credentials\.json)(\s|$)/;
const SAFE_ENV = /\.env\.(example|sample|template)(\s|$)/;

export function problem(command) {
  for (const raw of command.split(/&&|\|\||;|\n/)) {
    const seg = raw.trim();
    const add = seg.match(/^git\s+(?:-C\s+\S+\s+)?add\s+(.*)$/);
    if (add) {
      const args = add[1];
      if (/(^|\s)(-A|--all|-u|--update)(\s|$)/.test(args) || /(^|\s)(\.|\*|:\/)(\s|$)/.test(args)) {
        return 'stage the files you changed by name (git add path/one path/two), never everything at once';
      }
      if (SECRET.test(` ${args} `) && !SAFE_ENV.test(` ${args} `)) return 'that looks like a secret or key file; it must never be committed';
    }
    if (/^git\s+(?:-C\s+\S+\s+)?commit\b/.test(seg) && /(^|\s)(-a|--all|-am|-a\w*m)(\s|$)/.test(seg)) {
      return 'commit -a stages every tracked change; stage by name first, then commit';
    }
  }
  return null;
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  const why = problem(payload.tool_input?.command ?? '');
  if (!why) return 0;
  process.stderr.write(`BLOCKED by stage-guard: ${why}.\nRun \`git status --short\` and add each intended file explicitly.\n`);
  return 2;
}

function selftest() {
  const cases = [
    ['git add -A', true], ['git add .', true], ['cd x && git add --all', true], ['git commit -am "wip"', true],
    ['git add .env', true], ['git add certs/server.key', true],
    ['git add src/dsp/Svf.cpp tests/svf_test.cpp', false], ['git add .env.example', false],
    ['git commit -m "fix: svf"', false], ['git status', false],
  ];
  return verdicts('stage-guard', cases.map(([cmd, block]) => [cmd, problem(cmd) !== null, block]));
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('stage-guard', main));
