#!/usr/bin/env node
// PreToolUse (Bash): firmware stays out of git. ROM images, DSP blobs, disassemblies and vendor banks are other people's bytes, and git keeps them for ever, so `git add`
// of one is refused. A small test fixture is named in layout.json "guards": { "firmware": { "fixtures": ["<glob>"] } }. This is a house policy, not legal advice.
// `--selftest` proves it.
import { spawnSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { gitAdds } from './lib/git-adds.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { bashOf, git, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const FIRMWARE = /\.(bin|rom|eprom|epr|hex|srec|s19|mot|ic\d+|lod|syx|mid|dis|disasm|asm\.txt)$/i;
const OWN_BUILD = /(^|\/)(build|out|dist|target)\//;

const staged = (dir, arg) => (spawnSync('git', ['ls-files', '--others', '--modified', '--exclude-standard', '--', arg], { cwd: dir, encoding: 'utf8' }).stdout ?? '').split('\n').filter(Boolean).map((f) => resolve(dir, f));

function judgeAdd(command, cwd) {
  for (const { dir, args } of gitAdds(command, cwd)) {
    const root = checkoutRoot(join(dir, 'x'));
    const fixtures = readLayout(claudeRoot(join(dir, 'x'))).guards?.firmware?.fixtures ?? [];
    for (const abs of args.filter((a) => !a.startsWith('-')).flatMap((a) => staged(dir, a))) {
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (FIRMWARE.test(rel) && !OWN_BUILD.test(rel) && !matchesAny(rel, fixtures)) return `${rel} looks like firmware, a disassembly or a sound bank, which stays out of git. Keep it local, and ship derived facts. A small test fixture is named in guards.firmware.fixtures.\n`;
    }
  }
  return null;
}

const main = (text) => judgeEvent(text, { name: 'firmware-out-of-git', command: judgeAdd });

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'roms/os.bin': 'x', 'banks/factory.syx': 'x', 'test/fixtures/one.syx': 'x', 'src/a.cpp': 'x', '.claude/layout.json': JSON.stringify({ guards: { firmware: { fixtures: ['test/fixtures/**'] } } }) });
  git(dir, 'init', '-q');
  const add = (p) => runHook(hook, dir, bashOf(`git add ${p}`, dir));
  return verdicts('firmware-out-of-git', [
    ['a ROM image', add('roms/os.bin'), 2],
    ['a folder holding one', add('roms'), 2],
    ['a sound bank', add('banks/factory.syx'), 2],
    ['a named fixture', add('test/fixtures/one.syx'), 0],
    ['source', add('src/a.cpp'), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('firmware-out-of-git', main));
