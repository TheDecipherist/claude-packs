#!/usr/bin/env node
// PreToolUse (Bash): what lands in git stays in its history for ever. `git add` of a file over the size limit, a working screenshot in the repo root or a debug
// dump is refused. One real repo carried 991 MB, with 22 screenshots in its root and 64 MB files. Limits are in layout.json "guards": { "repoLitter": { "maxFileMb": 10,
// "allow": ["<glob>"] } }. `--selftest` proves it.
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gitAdds } from './lib/git-adds.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { bashOf, git, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';
import { fileURLToPath } from 'node:url';


export const BIG_MB = 10;
const MB = 1024 * 1024;
const KEPT_IMAGE = /^(favicon|apple-touch-icon|logo|icon|og-image|social|android-chrome|mstile|safari-pinned)/i;
const DUMP = /\.(har|heapsnapshot|dmp|core|log)$/i;

export const isRootImage = (rel, allow) => /^[^/]+\.(png|jpe?g|gif|webp|bmp|mov|mp4)$/i.test(rel) && !KEPT_IMAGE.test(rel) && !matchesAny(rel, allow);

function faultOf(rel, abs, cfg) {
  if (matchesAny(rel, cfg.allow ?? [])) return null;
  if (isRootImage(rel, [])) return `${rel} looks like a working screenshot in the repo root. Keep it out of git, or put an asset in its folder.`;
  if (/:Zone\.Identifier$/.test(rel)) return `${rel} is a browser download marker. It is an invalid path on Windows and breaks checkout. Add *:Zone.Identifier to .gitignore.`;
  if (DUMP.test(rel)) return `${rel} is a log or a debug dump. Add it to .gitignore.`;
  let mb = 0;
  try { mb = statSync(abs).size / MB; } catch { return null; }
  const limit = cfg.maxFileMb ?? BIG_MB;
  return mb > limit ? `${rel} is ${Math.round(mb)} MB (limit ${limit}). Git keeps it for ever: use object storage or a release.` : null;
}

// A named file, or what a folder would stage.
function staged(dir, arg) {
  const r = spawnSync('git', ['ls-files', '--others', '--modified', '--exclude-standard', '--', arg], { cwd: dir, encoding: 'utf8' });
  return (r.stdout ?? '').split('\n').filter(Boolean).map((f) => resolve(dir, f));
}

function judgeAdd(command, cwd) {
  for (const { dir, args } of gitAdds(command, cwd)) {
    const root = checkoutRoot(projectRoot(), join(dir, 'x'), process.cwd());
    const cfg = readLayout(claudeRoot(projectRoot(), join(dir, 'x'), process.cwd())).guards?.repoLitter ?? {};
    for (const abs of args.filter((a) => !a.startsWith('-')).flatMap((a) => staged(dir, a))) {
      const fault = faultOf(relative(root, abs).replace(/\\/g, '/'), abs, cfg);
      if (fault) return `${fault}\nA real asset can be named in guards.repoLitter.allow.\n`;
    }
  }
  return null;
}

const main = (text) => judgeEvent(text, { name: 'repo-litter', command: judgeAdd });

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/a.pdf:Zone.Identifier': 'x', 'shot.png': 'x', 'favicon.png': 'x', 'src/a.ts': 'x', 'src/hero.png': 'x', 'trace.har': 'x', 'kept.png': 'x', '.claude/layout.json': JSON.stringify({ guards: { repoLitter: { maxFileMb: 1, allow: ['kept.png'] } } }) });
  git(dir, 'init', '-q');
  put(join(dir, 'media/big.bin'), 'x'.repeat(2 * MB));
  const add = (paths) => runHook(hook, dir, bashOf(`git add ${paths}`, dir)).status;
  return verdicts('repo-litter', [
    ['a screenshot in the root', add('shot.png'), 2],
    ['a big file', add('media/big.bin'), 2],
    ['a folder holding a big file', add('media'), 2],
    ['a debug dump', add('trace.har'), 2],
    ['a download marker', add('src/a.pdf:Zone.Identifier'), 2],
    ['source', add('src/a.ts'), 0],
    ['an image in its folder', add('src/hero.png'), 0],
    ['a favicon in the root', add('favicon.png'), 0],
    ['a file the layout allows', add('kept.png'), 0],
    ['something else entirely', runHook(hook, dir, bashOf('git status', dir)).status, 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('repo-litter', main));
