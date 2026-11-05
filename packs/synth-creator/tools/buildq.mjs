#!/usr/bin/env node
// buildq: the machine-wide build queue that build-guard sends every heavy job to (KF-1: the hook named a tool no pack shipped). Two jobs at a time, across every
// project on the machine; a job waits for a slot by itself. A slot is a folder made atomically, holding its owner's pid; a dead owner's slot is taken back.
// The exit status is the command's own, so `node .claude/tools/buildq.mjs ninja && next` means what it says. A status read after a pipe or an echo is theirs, not the build's (KF-37).
//   node .claude/tools/buildq.mjs <command> [args...]    run it in the next free slot
//   node .claude/tools/buildq.mjs --status               how many slots are taken
// BUILDQ_DIR: where the slots live (default: the machine's temp folder). BUILDQ_SLOTS: how many (default 2).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = process.env.BUILDQ_DIR ?? join(tmpdir(), 'claude-packs-buildq');
const SLOTS = Number(process.env.BUILDQ_SLOTS ?? 2);
const WAIT_MS = 500;
const slotAt = (n) => join(DIR, `slot-${n}`);
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function ownerOf(slot) {
  try { return Number(readFileSync(join(slot, 'pid'), 'utf8')); } catch { return null; }
}

function isLive(slot) {
  const pid = ownerOf(slot);
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // another user's job holds it
  }
}

function claim() {
  mkdirSync(DIR, { recursive: true });
  for (let n = 0; n < SLOTS; n += 1) {
    const slot = slotAt(n);
    try {
      mkdirSync(slot);
      writeFileSync(join(slot, 'pid'), `${process.pid}\n`);
      return slot;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (ownerOf(slot) !== null && !isLive(slot)) rmSync(slot, { recursive: true, force: true });
    }
  }
  return null;
}

function status() {
  const taken = Array.from({ length: SLOTS }, (_, n) => slotAt(n)).filter(isLive).length;
  console.log(`${taken} of ${SLOTS} slots taken`);
  return 0;
}

function run(command) {
  let slot = claim();
  for (; slot === null; slot = claim()) nap(WAIT_MS);
  try {
    const r = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
    if (r.error) console.error(`buildq: ${command[0]}: ${r.error.message}`);
    return r.status ?? 1;
  } finally {
    rmSync(slot, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (args[0] === '--status') process.exit(status());
if (!args.length) {
  console.error('usage: node .claude/tools/buildq.mjs <command> [args...] | --status');
  process.exit(2);
}
process.exit(run(args));
