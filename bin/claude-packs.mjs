#!/usr/bin/env node
// claude-packs: per-project Claude Code rules, checks, hooks and skills for The Decipherist's synths.
// Everything installs into the project's own .claude/ (and nested skill folders).
// The one exception is `global`: latest-versions (skill and hook), gnu-shell and shell-traps.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor } from '../lib/doctor.mjs';
import { globalAdd, globalDoctor, globalRemove } from '../lib/global.mjs';
import { readLock } from '../lib/manifest.mjs';
import { newProject } from '../lib/new.mjs';
import { availablePacks, readPack } from '../lib/packs.mjs';
import { sync } from '../lib/sync.mjs';

const HELP = `usage: npx claude-packs <command> [options]

  new <name>         a new project in <dir>/<name>: the house files (CLAUDE.md, build.md, bugs.md,
                     workflow-bugs.md, docs/versions.md), a git repo on a work/ branch, the kit installed
                     --packs <a,b>     the packs (default audio-core); --profile <name> as for init
  init <pack...>     install packs into this project (base is always included)
                     and create the layout folders
                     --profile <name>  start from a tailored layout shipped in the package (e.g. stellix)
                     --layout <file>   start from your own layout.json
  add <pack...>      add packs to an existing install
  remove <pack...>   remove packs (files you edited are kept)
  update             re-sync installed packs from this package version
  update-all <dir...>  update every listed project that already has claude-packs
                     (e.g. update-all ~/projects/*); folders without it are skipped
  doctor [--strict]  verify the install (paths, folders, hooks, checks' own examples); --strict also fails
                     when a rule matches no file or a source file is covered by no rule
  survey             print the prompt that makes Claude write docs/project.md for tailoring
  list               show available packs
  symmetry gen --cmake <out.cmake> | --list   the generated gate shape_symmetry: one test per many concept in
                     design/shape.json (add_test lines a CMakeLists includes at configure time, or plain lines)
  symmetry run <concept>   that gate for one concept: every instance the same members, every pair swaps the same
  global add|remove|doctor
                     the global part, exactly three pieces: latest-versions (skill and
                     version-pin-guard), gnu-shell, shell-traps, in ~/.claude (never
                     overwrites; --home <dir> to target another home)

options: --dir <project> (default: current folder)   --force (replace files you edited)`;

function parse(argv) {
  const opts = { dir: process.cwd(), force: false, strict: false, rest: [], seed: null, home: undefined, packs: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') opts.dir = argv[++i];
    else if (argv[i] === '--packs') opts.packs = argv[++i].split(',').map((p) => p.trim()).filter(Boolean);
    else if (argv[i] === '--profile') opts.seed = fileURLToPath(new URL(`../profiles/${argv[++i]}.layout.json`, import.meta.url));
    else if (argv[i] === '--layout') opts.seed = resolve(argv[++i]);
    else if (argv[i] === '--force') opts.force = true;
    else if (argv[i] === '--strict') opts.strict = true;
    else if (argv[i] === '--home') opts.home = resolve(argv[++i]);
    else opts.rest.push(argv[i]);
  }
  opts.dir = resolve(opts.dir);
  return opts;
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  const { dir, force, strict, rest, seed, home, packs } = parse(argv);
  const seedLayout = seed ? JSON.parse(readFileSync(seed, 'utf8')) : null;
  const installed = readLock(resolve(dir, '.claude')).packs;

  switch (command) {
    case 'new':
      return (await newProject(dir, rest[0], { packs: packs ?? ['audio-core'], seedLayout })).code;
    case 'init':
      if (rest.length === 0) throw new Error('name at least one pack, e.g. `init audio-core`');
      await sync(dir, rest, { force, mkdirs: true, seedLayout });
      return doctor(dir);
    case 'add':
      await sync(dir, [...installed, ...rest], { force, mkdirs: true });
      return doctor(dir);
    case 'remove':
      await sync(dir, installed.filter((p) => p === 'base' || !rest.includes(p)), { force });
      return doctor(dir);
    case 'update':
      if (installed.length === 0) throw new Error('nothing installed here; run init first');
      await sync(dir, installed, { force, mkdirs: true });
      return doctor(dir);
    case 'update-all': {
      let failed = 0;
      for (const d of rest.map((x) => resolve(x))) {
        const lockPacks = readLock(resolve(d, '.claude')).packs;
        if (lockPacks.length === 0) continue;
        console.log(`\n== ${d}`);
        try {
          await sync(d, lockPacks, { force, mkdirs: true });
          failed += await doctor(d);
        } catch (e) {
          failed += 1;
          console.log(`  PROBLEM: ${e.message}`);
        }
      }
      return failed ? 1 : 0;
    }
    case 'doctor':
      return doctor(dir, console.log, { strict });
    case 'survey':
      process.stdout.write(readFileSync(fileURLToPath(new URL('../prompts/survey.md', import.meta.url)), 'utf8'));
      return 0;
    case 'global': {
      const run = { add: globalAdd, remove: globalRemove, doctor: globalDoctor }[rest[0]];
      if (!run) throw new Error('use `global add`, `global remove` or `global doctor`');
      return run({ home, force });
    }
    case 'symmetry':
      return (await import('../packs/base/tools/shape-symmetry.mjs')).main([...rest, '--dir', dir]);
    case 'list':
      for (const name of availablePacks()) console.log(`${name.padEnd(12)} ${readPack(name).description}`);
      return 0;
    default:
      console.log(HELP);
      return command ? 2 : 0;
  }
}

main().then(
  (code) => process.exit(code ?? 0),
  (err) => {
    console.error(`claude-packs: ${err.message}`);
    process.exit(2);
  },
);
