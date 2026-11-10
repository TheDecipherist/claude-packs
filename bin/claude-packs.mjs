#!/usr/bin/env node
// claude-packs: per-project Claude Code rules, checks, hooks and skills for The Decipherist's synths.
// Everything installs into the project's own .claude/ (and nested skill folders).
// The one exception is `global`: latest-versions (skill and hook), gnu-shell and shell-traps.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor } from '../lib/doctor.mjs';
import { globalAdd, globalDoctor, globalRemove } from '../lib/global.mjs';
import { lockCommand } from '../lib/kit-lock.mjs';
import { readLock } from '../lib/manifest.mjs';
import { newProject } from '../lib/new.mjs';
import { dupScan } from '../lib/once-only-report.mjs';
import { PRESETS, availablePacks, readPack } from '../lib/packs.mjs';
import { describeConfigs, layoutConfiguration, readConfig, switchConfig } from '../lib/config-cli.mjs';
import { plannerSkills } from '../lib/planner.mjs';
import { addCustomPack, loadCustomPacks, newPack } from '../lib/custom-packs.mjs';
import { fixPlan } from '../lib/fix-plan.mjs';
import { logsCommand } from '../lib/logs.mjs';
import { scan } from '../lib/scan.mjs';
import { detectedConfig, suggest, suggestionOf } from '../lib/suggest.mjs';
import { newWorkorder } from '../lib/workorder.mjs';
import { writeClaudeAiSkill } from '../lib/claude-ai-skill.mjs';
import { sync } from '../lib/sync.mjs';
import { ensureShape, isSynth, shapeCommand } from '../lib/shape-cli.mjs';

const INSTALLING = { installing: true }; // doctor at the end of an install: what the project has yet to do is a note

const HELP = `usage: npx --no-install @thedecipherist/claude-packs <command> [options]

  new <name>         a new project in <dir>/<name>: the house files (CLAUDE.md, build.md, bugs.md,
                     workflow-bugs.md, docs/versions.md), a git repo on a work/ branch, the kit installed
                     --packs <a,b>     the packs (default base alone); --profile <name>, --config <name> as for init
  workorder <name>   a work order in docs/workorders/<name>: the steps, the prompt that runs them with nobody
                     there, and a runner that starts session after session
                     --template rebuild   the steps of a hardware instrument rebuilt as a plugin
  claude-ai-skill    workorder-writer.zip in <dir>: the guided work order interview, a skill to upload to claude.ai
  init [pack...]     install packs or presets (e.g. init node-api; list shows them); base is always included
                     and create the layout folders
                     --config <name>   the configuration (configs lists them; stored in layout.json
                                       "configuration"); with no packs named, the ones it takes by default
                     --profile <name>  start from a tailored layout shipped in the package (e.g. stellix)
                     --layout <file>   start from your own layout.json
                     --auto            the configuration and packs suggest finds, so nobody picks them by hand
  add <pack...>      add packs to an existing install
                     --from <git-url>  a custom pack from a team's repository; its hooks stay off until "enable" names them
  new-pack <name> [--repo <git-url>]  a new repository for a team's own pack, ready to edit and push
  remove <pack...>   remove packs (files you edited are kept)
  update             re-sync installed packs from this package version, in the project's configuration
  configs            list the configurations: what each installs, its packs and its folder template
  config <name>      switch this project to another configuration; prints what changes first
                     --dry-run         print what would change and stop
  planner-skills [--out <dir>]   one project-layout skill body per configuration, from its layout template
                     (printed, or written to <dir>/<configuration>/project-layout/SKILL.md)
  update-all <dir...>  update every listed project that already has claude-packs
                     (e.g. update-all ~/projects/*); folders without it are skipped
  doctor [--strict] [--fresh]  verify the install (paths, folders, hooks, checks' own examples); a hook's selftest that
                     passed is not run again until the hook changes (--fresh runs them all); --strict also fails
                     when a rule matches no file or a source file is covered by no rule
  shape scan         every instance literal in the repo (code, tests, docs, briefs), by file and concept,
                     with a count, against design/shape.json; exit 1 when any
  scan [--out <file>]  before installing anything: on a copy of the project, what to install and every issue the checks
                     find; the project is never touched. scan --prompt prints the review brief for what checks cannot see
  suggest            which configuration and packs this project needs, read from its own files, with the evidence
  fix [--from <scan.json>] [--out <file>]  the last scan as a work order for Claude, .claude/fix-plan.md; scans first if there is none
  logs               which hooks earn their place: calls, refusals and verdicts per hook, over all the history
                     logs refusals [--hook <h>] [--open]; logs mark <id> right|wrong "<why>"
                     logs crashes; logs clear <hook>|all fixed|superseded "<why>"
  survey             print the prompt that makes Claude write docs/project.md for tailoring
  list               show available packs
  symmetry gen --cmake <out.cmake> | --list   the generated gate shape_symmetry: one test per many concept in
                     design/shape.json (add_test lines a CMakeLists includes at configure time, or plain lines)
  symmetry run <concept>   that gate for one concept: every instance the same members, every pair swaps the same
  dup scan           every duplicated block (jscpd, the once-only hook's detector), listed by file
  lock status|take [--branch <b>]|release [--force]
                     the claude-packs repo's kit lock, a lease, in each checkout: who holds it, since when, last seen,
                     live or stale (30 min without renewal); take takes it for this session (a stale one is taken over
                     and logged); release takes away your own lock or a stale one, never a live lease without --force
  global add|remove|doctor
                     the global part, exactly three pieces: latest-versions (skill and
                     version-pin-guard), gnu-shell, shell-traps, in ~/.claude (never
                     overwrites; --home <dir> to target another home)

options: --dir <project> (default: current folder)   --force (replace files you edited)`;

function parse(argv) {
  const opts = { dir: process.cwd(), force: false, strict: false, rest: [], seed: null, home: undefined, packs: null, config: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') opts.dir = argv[++i];
    else if (argv[i] === '--packs') opts.packs = argv[++i].split(',').map((p) => p.trim()).filter(Boolean);
    else if (argv[i] === '--profile') opts.seed = fileURLToPath(new URL(`../profiles/${argv[++i]}.layout.json`, import.meta.url));
    else if (argv[i] === '--layout') opts.seed = resolve(argv[++i]);
    else if (argv[i] === '--config') opts.config = argv[++i];
    else if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--force') opts.force = true;
    else if (argv[i] === '--strict') opts.strict = true;
    else if (argv[i] === '--fresh') opts.fresh = true;
    else if (argv[i] === '--home') opts.home = resolve(argv[++i]);
    else opts.rest.push(argv[i]);
  }
  opts.dir = resolve(opts.dir);
  return opts;
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  const { dir, force, strict, fresh, rest, seed, home, packs, config, dryRun } = parse(argv);
  const seedLayout = seed ? JSON.parse(readFileSync(seed, 'utf8')) : null;
  const installed = readLock(resolve(dir, '.claude')).packs;
  const fromUrl = rest.includes('--from') ? rest.splice(rest.indexOf('--from'), 2)[1] : null;
  const fetched = ['new-pack', 'scan', 'suggest', 'fix', 'logs', 'global', 'claude-ai-skill'].includes(command) ? {} : loadCustomPacks(dir, { latest: command === 'update' });

  switch (command) {
    case 'new':
      return (await newProject(dir, rest[0], { packs: packs ?? (config ? readConfig(config).packs.default : ['base']), seedLayout, config })).code;
    case 'claude-ai-skill':
      return writeClaudeAiSkill(dir);
    case 'workorder': {
      const template = rest.includes('--template') ? rest.splice(rest.indexOf('--template'), 2)[1] : null;
      return newWorkorder(dir, rest[0], { template });
    }
    case 'init': {
      if (rest.includes('--auto')) {
        const pick = suggestionOf(dir);
        await sync(dir, pick.packs.map((p) => p.pack), { force, mkdirs: true, seedLayout, config: pick.config });
        return doctor(dir, console.log, INSTALLING);
      }
      if (rest.length === 0 && !config) throw new Error('name at least one pack or a configuration, e.g. `init audio-core` or `init --config base` (`configs` lists them)');
      const chosen = rest.length ? rest : readConfig(config).packs.default;
      await sync(dir, chosen, { force, mkdirs: true, seedLayout, config: config ?? detectedConfig(dir, chosen) });
      if (isSynth(chosen) && ensureShape(dir)) console.log('  design/shape.json: written empty; add a row per concept (one or many) before building it');
      return doctor(dir, console.log, INSTALLING);
    }
    case 'planner-skills':
      return plannerSkills(rest.includes('--out') ? resolve(rest[rest.indexOf('--out') + 1]) : null);
    case 'configs':
      console.log(describeConfigs(layoutConfiguration(dir)));
      return 0;
    case 'config':
      return switchConfig(dir, rest[0], installed, { force, dryRun });
    case 'add': {
      const sources = fromUrl ? { ...fetched, [rest[0]]: addCustomPack(rest[0], fromUrl) } : fetched;
      await sync(dir, [...installed, ...rest], { force, mkdirs: true, sources });
      return doctor(dir, console.log, INSTALLING);
    }
    case 'remove':
      await sync(dir, installed.filter((p) => p === 'base' || !rest.includes(p)), { force });
      return doctor(dir, console.log, INSTALLING);
    case 'update':
      if (installed.length === 0) throw new Error('nothing installed here; run init first');
      await sync(dir, installed, { force, mkdirs: true, sources: fetched });
      return doctor(dir, console.log, INSTALLING);
    case 'update-all': {
      let failed = 0;
      for (const d of rest.map((x) => resolve(x))) {
        const lockPacks = readLock(resolve(d, '.claude')).packs;
        if (lockPacks.length === 0) continue;
        console.log(`\n== ${d}`);
        try {
          await sync(d, lockPacks, { force, mkdirs: true });
          failed += await doctor(d, console.log, INSTALLING);
        } catch (e) {
          failed += 1;
          console.log(`  PROBLEM: ${e.message}`);
        }
      }
      return failed ? 1 : 0;
    }
    case 'doctor':
      return doctor(dir, console.log, { strict, fresh });
    case 'shape':
      return shapeCommand(rest[0], dir);
    case 'scan':
      if (rest.includes('--prompt')) { process.stdout.write(readFileSync(fileURLToPath(new URL('../prompts/scan-review.md', import.meta.url)), 'utf8')); return 0; }
      await scan(dir, { out: rest.includes('--out') ? resolve(rest[rest.indexOf('--out') + 1]) : null });
      return 0;
    case 'logs':
      return logsCommand(dir, rest);
    case 'suggest':
      suggest(dir);
      break;
    case 'fix':
      await fixPlan(dir, { from: fromUrl ? resolve(fromUrl) : null, out: rest.includes('--out') ? resolve(rest[rest.indexOf('--out') + 1]) : null });
      break;
    case 'new-pack':
      return newPack(dir, rest[0], { repo: rest.includes('--repo') ? rest[rest.indexOf('--repo') + 1] : null });
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
    case 'dup':
      if (rest[0] !== 'scan') throw new Error('use `dup scan [--dir <project>]`');
      return dupScan(dir);
    case 'lock':
      return lockCommand(rest[0], dir, { force, branch: rest.includes('--branch') ? rest[rest.indexOf('--branch') + 1] : undefined });
    case 'list':
      for (const name of availablePacks()) { const p = readPack(name); console.log(`${name.padEnd(14)}${p.version.padEnd(8)}${p.type.padEnd(7)}${p.author}: ${p.description}`); }
      console.log('\npresets (init <preset> installs the packs that stack needs):');
      for (const [name, packs] of Object.entries(PRESETS)) console.log(`${name.padEnd(12)} ${packs.join(', ')}`);
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
