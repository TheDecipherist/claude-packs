#!/usr/bin/env node
// Spec lock: while a build runs, the spec it builds from cannot change under it.
// State: .claude/spec-lock.json  { "locked": true, "globs": [...], "reason": "...", "since": "..." }
//   node spec-lock.mjs lock "<reason>" [glob ...]   lock (Claude may do this when a build starts)
//   node spec-lock.mjs unlock                       unlock (the USER runs this, e.g. `! node ...`)
//   node spec-lock.mjs status
//   node spec-lock.mjs --selftest                 proves the hook
// As a PreToolUse hook (Write|Edit|MultiEdit|Bash) it blocks edits to locked files, edits to the
// lock file itself, and Claude running "unlock".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { commandLeavesProject, insideProject, checkoutRoot, relInCheckout } from './lib/project.mjs';
import { fileURLToPath } from 'node:url';
import { bashOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE = join(ROOT, '.claude', 'spec-lock.json');
const DEFAULT_GLOBS = ['spec/**', 'specs/**', 'docs/stellix-*.md', '**/*-spec.md', '**/*.mmd', '**/panel.json', '**/build.md', '**/decisions*.md'];
const WRITE_CMD = /(>|>>|\btee\b|\bsed\s+-i|\bperl\s+-i|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bgit\s+(checkout|restore)\b)/;

const read = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { locked: false });
const write = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n');

function cli(args) {
  const [cmd, reason, ...globs] = args;
  if (cmd === 'lock') {
    write({ locked: true, globs: globs.length ? globs : DEFAULT_GLOBS, reason: reason ?? 'build in progress', since: new Date().toISOString() });
    console.log('Spec locked.');
  } else if (cmd === 'unlock') {
    write({ ...read(), locked: false });
    console.log('Spec unlocked.');
  } else console.log(JSON.stringify(read(), null, 2));
  return 0;
}

function block(msg) {
  process.stderr.write(`BLOCKED by spec-lock: ${msg}\n`);
  return 2;
}

function hook() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const state = read();
  const input = payload.tool_input ?? {};
  const howTo = 'To change the spec, stop and ask the user. Only the user unlocks: `! node .claude/hooks/spec-lock.mjs unlock`.';

  if (payload.tool_name === 'Bash') {
    const cmd = input.command ?? '';
    if (/spec-lock/.test(cmd) && /\bunlock\b/.test(cmd)) return block(`Claude may not unlock the spec. ${howTo}`);
    if (/spec-lock\.json/.test(cmd) && WRITE_CMD.test(cmd)) return block(`the lock file can't be edited. ${howTo}`);
    if (!state.locked || commandLeavesProject(cmd)) return 0;
    // Each word as a path in its own checkout, so a worktree's spec/ is the spec too.
    const base = payload.cwd ?? ROOT;
    const toRel = (t) => {
      const abs = resolve(base, t.replace(/^['"]|['"]$/g, ''));
      return insideProject(abs) ? relInCheckout(abs) : null;
    };
    const touched = cmd.split(/\s+/).filter((t) => {
      const rel = t && toRel(t);
      return rel && matchesAny(rel, state.globs);
    });
    if (touched.length && WRITE_CMD.test(cmd)) return block(`${touched.join(', ')} locked (${state.reason}). ${howTo}`);
    return 0;
  }

  if (!insideProject(input.file_path)) return 0;
  const rel = relative(checkoutRoot(input.file_path), input.file_path ?? '');
  if (rel === join('.claude', 'spec-lock.json')) return block(`the lock file can't be edited. ${howTo}`);
  if (state.locked && matchesAny(rel, state.globs)) return block(`${rel} is locked since ${state.since} (${state.reason}). ${howTo}`);
  return 0;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const state = (locked) => JSON.stringify({ locked, globs: DEFAULT_GLOBS, reason: 'build running', since: 'now' });
  const dir = scratchProject({ '.claude/spec-lock.json': state(true), 'spec/plan.md': 'x\n' });
  const open = scratchProject({ '.claude/spec-lock.json': state(false) });
  const w = (root, file) => runHook(hook, root, writeOf(join(root, file)));
  const sh = (root, cmd) => runHook(hook, root, bashOf(cmd, root));
  return verdicts('spec-lock', [
    ['a locked spec file', w(dir, 'spec/plan.md'), 2],
    ['a panel.json anywhere', w(dir, 'panel/panel.json'), 2],
    ['code while the spec is locked', w(dir, 'src/dsp/Svf.cpp'), 0],
    ['the lock file', w(dir, '.claude/spec-lock.json'), 2],
    ['Claude running unlock', sh(dir, 'node .claude/hooks/spec-lock.mjs unlock'), 2],
    ['a shell edit of the spec', sh(dir, 'sed -i s/a/b/ spec/plan.md'), 2],
    ['reading the spec', sh(dir, 'cat spec/plan.md'), 0],
    ['an unlocked spec', w(open, 'spec/plan.md'), 0],
  ]);
}

const args = process.argv.slice(2);
process.exit(args.includes('--selftest') ? selftest() : args.length ? cli(args) : hook());
