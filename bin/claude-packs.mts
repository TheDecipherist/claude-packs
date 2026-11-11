#!/usr/bin/env node
// claude-packs: per-project Claude Code rules, checks, hooks and skills, for any project.
// Everything installs into the project's own .claude/ (and nested skill folders).
// The one exception is `global`: latest-versions (skill and hook), gnu-shell and shell-traps.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';
import { describeConfigs, layoutConfiguration, readConfig, switchConfig } from '../lib/config-cli.mts';
import type { PackSource } from '../lib/custom-packs.mts';
import { addCustomPack, loadCustomPacks, newPack } from '../lib/custom-packs.mts';
import { doctor } from '../lib/doctor.mts';
import { fixPlan } from '../lib/fix-plan.mts';
import { globalAdd, globalDoctor, globalRemove } from '../lib/global.mts';
import { blockPacks, installFrom, readInstallBlock } from '../lib/install-block.mts';
import { lockCommand } from '../lib/kit-lock.mts';
import { logsCommand } from '../lib/logs.mts';
import { readLock } from '../lib/manifest.mts';
import { newProject } from '../lib/new.mts';
import { dupScan } from '../lib/once-only-report.mts';
import { PRESETS, availablePacks, readPack } from '../lib/packs.mts';
import { plannerSkills, writeClaudeAiZips } from '../lib/planner.mts';
import { scan } from '../lib/scan.mts';
import { ensureShape, isSynth, shapeCommand } from '../lib/shape-cli.mts';
import { statusCommand } from '../lib/status-cli.mts';
import { detectedConfig, suggest, suggestionOf } from '../lib/suggest.mts';
import { sync } from '../lib/sync.mts';
import { workorderCheck } from '../lib/workorder-check.mts';
import { assertTemplate, newWorkorder } from '../lib/workorder.mts';

const INSTALLING = { installing: true }; // doctor at the end of an install: what the project has yet to do is a note
const SHAPE_WRITTEN = '  design/shape.json: written empty; add a row per concept (one or many) before building it';
const HELP = readFileSync(fileURLToPath(new URL('../prompts/help.txt', import.meta.url)), 'utf8').trimEnd();

// ---- The command line: switches, flags that take a value, and the words left ----

const SWITCHES = { '--dry-run': 'dryRun', '--force': 'force', '--strict': 'strict', '--fresh': 'fresh' } as const;
type Switch = (typeof SWITCHES)[keyof typeof SWITCHES];
const VALUE_FLAGS = ['--dir', '--packs', '--profile', '--layout', '--config', '--home', '--from', '--template', '--out', '--zip', '--repo', '--branch'] as const;
type ValueFlag = (typeof VALUE_FLAGS)[number];
const isSwitch = (word: string): word is keyof typeof SWITCHES => Object.hasOwn(SWITCHES, word);
const isValueFlag = (word: string): word is ValueFlag => (VALUE_FLAGS as readonly string[]).includes(word);

/** Everything one run of the command knows: its words, its flags, and what the project has installed. */
interface Run extends Record<Switch, boolean> {
  /** The words after the command, flags included, as typed (status reads its own). */
  argv: readonly string[];
  /** The words that are not a known flag or its value. */
  rest: string[];
  dir: string;
  value: Partial<Record<ValueFlag, string>>;
  packs: string[] | null;
  seedLayout: Partial<Layout> | null;
  installed: readonly string[];
  fetched: Record<string, PackSource>;
}

const pathOf = (run: Run, flag: ValueFlag): string | null => (run.value[flag] === undefined ? null : resolve(run.value[flag]));

function seedOf(value: Run['value']): Partial<Layout> | null {
  const file = value['--profile'] ? fileURLToPath(new URL(`../profiles/${value['--profile']}.layout.json`, import.meta.url)) : value['--layout'] ? resolve(value['--layout']) : null;
  if (file === null) return null;
  const seed = readJson<Partial<Layout>>(file);
  if (seed === null) throw new Error(`${file}: not a layout (missing or not JSON)`);
  return seed;
}

// The commands that never load a team's custom packs (they read, or they make something new).
const NO_CUSTOM_PACKS = new Set(['new-pack', 'scan', 'suggest', 'fix', 'logs', 'global', 'claude-ai-skill', 'status']);

function parse(command: string | undefined, argv: readonly string[]): Run {
  const flags: Record<Switch, boolean> = { dryRun: false, force: false, strict: false, fresh: false };
  const value: Run['value'] = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const word = argv[i] ?? '';
    if (isSwitch(word)) flags[SWITCHES[word]] = true;
    else if (isValueFlag(word)) { i += 1; value[word] = argv[i] ?? ''; }
    else rest.push(word);
  }
  const dir = resolve(value['--dir'] ?? process.cwd());
  const packs = value['--packs']?.split(',').map((p) => p.trim()).filter(Boolean) ?? null;
  const fetched = command === undefined || NO_CUSTOM_PACKS.has(command) ? {} : loadCustomPacks(dir, { latest: command === 'update' });
  return { ...flags, argv, rest, dir, value, packs, seedLayout: seedOf(value), installed: readLock(resolve(dir, '.claude')).packs, fetched };
}

// ---- The commands, one row each ----

type Command = (run: Run) => number | Promise<number>;

async function installAndCheck(run: Run, packs: readonly string[], config: string | null = null): Promise<number> {
  await sync(run.dir, packs, { force: run.force, mkdirs: true, seedLayout: run.seedLayout, config });
  if (isSynth(packs) && ensureShape(run.dir)) console.log(SHAPE_WRITTEN);
  return doctor(run.dir, console.log, INSTALLING);
}

async function init(run: Run): Promise<number> {
  const config = run.value['--config'] ?? null;
  if (run.rest.includes('--auto')) {
    const pick = suggestionOf(run.dir);
    await sync(run.dir, pick.packs.map((p) => p.pack), { force: run.force, mkdirs: true, seedLayout: run.seedLayout, config: pick.config });
    return doctor(run.dir, console.log, INSTALLING);
  }
  const from = pathOf(run, '--from');
  if (from) {
    const block = await installFrom(run.dir, from, { force: run.force });
    if (isSynth(blockPacks(block)) && ensureShape(run.dir)) console.log(SHAPE_WRITTEN);
    return doctor(run.dir, console.log, INSTALLING);
  }
  if (run.rest.length === 0 && !config) throw new Error('name at least one pack or a configuration, e.g. `init audio-core` or `init --config base` (`configs` lists them)');
  const chosen = run.rest.length || !config ? run.rest : [...readConfig(config).packs.default];
  return installAndCheck(run, chosen, config ?? detectedConfig(run.dir, chosen));
}

async function newCommand(run: Run): Promise<number> {
  const config = run.value['--config'] ?? null;
  const from = pathOf(run, '--from');
  const block = from ? readInstallBlock(from) : null;
  if (block?.configuration && config && block.configuration !== config) throw new Error(`--config ${config} and the install block's configuration ${block.configuration} differ: name one`);
  const named = config ?? block?.configuration ?? null;
  const fallback = named ? [...readConfig(named).packs.default] : ['base'];
  const chosen = run.packs ?? (block ? blockPacks({ ...block, configuration: named }) : fallback);
  // --template <t>: the project's work order too, docs/workorders/<name>/ from that template (checked before anything is made)
  const template = run.value['--template'];
  if (template) assertTemplate(template);
  const made = await newProject(run.dir, run.rest[0], { packs: chosen, seedLayout: run.seedLayout, config: named, block });
  if (template) newWorkorder(made.dir, run.rest[0], { template });
  return made.code;
}

async function workorder(run: Run): Promise<number> {
  const [sub, name] = run.rest;
  if (sub === 'check') return workorderCheck(run.dir, name);
  const template = run.value['--template'];
  newWorkorder(run.dir, sub, template ? { template } : {});
  console.log(`  What is left to fill in, as \`workorder check ${sub ?? ''}\` will judge it before a run starts:`);
  await workorderCheck(run.dir, sub, { withDoctor: false });
  return 0;
}

async function updateAll(run: Run): Promise<number> {
  let failed = 0;
  for (const d of run.rest.map((x) => resolve(x))) {
    const lockPacks = readLock(resolve(d, '.claude')).packs;
    if (lockPacks.length === 0) continue;
    console.log(`\n== ${d}`);
    try {
      await sync(d, lockPacks, { force: run.force, mkdirs: true });
      failed += await doctor(d, console.log, INSTALLING);
    } catch (e) {
      failed += 1;
      console.log(`  PROBLEM: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return failed ? 1 : 0;
}

const printPrompt = (name: string): number => {
  process.stdout.write(readFileSync(fileURLToPath(new URL(`../prompts/${name}`, import.meta.url)), 'utf8'));
  return 0;
};

const GLOBAL: Record<string, Command> = {
  add: (run) => globalAdd({ home: pathOf(run, '--home') ?? undefined, force: run.force }),
  remove: (run) => globalRemove({ home: pathOf(run, '--home') ?? undefined }),
  doctor: (run) => globalDoctor({ home: pathOf(run, '--home') ?? undefined }),
};

function list(): number {
  for (const name of availablePacks()) {
    const p = readPack(name);
    const author = typeof p.author === 'object' ? p.author.name : p.author ?? '';
    console.log(`${name.padEnd(14)}${p.version.padEnd(8)}${p.type.padEnd(7)}${author}: ${p.description}`);
  }
  console.log('\npresets (init <preset> installs the packs that stack needs):');
  for (const [name, packs] of Object.entries(PRESETS)) console.log(`${name.padEnd(12)} ${packs.join(', ')}`);
  return 0;
}

const COMMANDS: Record<string, Command> = {
  new: newCommand,
  'claude-ai-skill': (run) => writeClaudeAiZips(run.dir, ['workorder-writer']),
  workorder,
  init,
  'planner-skills': (run) => plannerSkills(pathOf(run, '--out'), console.log, { zip: pathOf(run, '--zip') }),
  configs: (run) => { console.log(describeConfigs(layoutConfiguration(run.dir))); return 0; },
  config: (run) => switchConfig(run.dir, run.rest[0], run.installed, { force: run.force, dryRun: run.dryRun }),
  add: async (run) => {
    const from = run.value['--from'];
    const sources = from ? { ...run.fetched, [run.rest[0] ?? '']: addCustomPack(run.rest[0], from) } : run.fetched;
    await sync(run.dir, [...run.installed, ...run.rest], { force: run.force, mkdirs: true, sources });
    return doctor(run.dir, console.log, INSTALLING);
  },
  remove: async (run) => {
    await sync(run.dir, run.installed.filter((p) => p === 'base' || !run.rest.includes(p)), { force: run.force });
    return doctor(run.dir, console.log, INSTALLING);
  },
  update: async (run) => {
    if (run.installed.length === 0) throw new Error('nothing installed here; run init first');
    await sync(run.dir, run.installed, { force: run.force, mkdirs: true, sources: run.fetched });
    return doctor(run.dir, console.log, INSTALLING);
  },
  'update-all': updateAll,
  doctor: (run) => doctor(run.dir, console.log, { strict: run.strict, fresh: run.fresh }),
  shape: (run) => shapeCommand(run.rest[0], run.dir),
  scan: async (run) => {
    if (run.rest.includes('--prompt')) return printPrompt('scan-review.md');
    await scan(run.dir, { out: pathOf(run, '--out') });
    return 0;
  },
  logs: (run) => logsCommand(run.dir, run.rest),
  status: (run) => statusCommand(run.argv.includes('--dir') ? [...run.rest, '--dir', run.dir] : run.rest), // no --dir: every run on the machine
  suggest: (run) => { suggest(run.dir); return 0; },
  fix: async (run) => { await fixPlan(run.dir, { from: pathOf(run, '--from'), out: pathOf(run, '--out') }); return 0; },
  'new-pack': (run) => newPack(run.dir, run.rest[0], { repo: run.value['--repo'] ?? null }),
  survey: () => printPrompt('survey.md'),
  global: (run) => {
    const command = run.rest[0] !== undefined && Object.hasOwn(GLOBAL, run.rest[0]) ? GLOBAL[run.rest[0]] : undefined;
    if (!command) throw new Error('use `global add`, `global remove` or `global doctor`');
    return command(run);
  },
  symmetry: async (run) => (await import('../packs/base/tools/shape-symmetry.mts')).main([...run.rest, '--dir', run.dir]),
  dup: (run) => {
    if (run.rest[0] !== 'scan') throw new Error('use `dup scan [--dir <project>]`');
    return dupScan(run.dir);
  },
  lock: (run) => lockCommand(run.rest[0] ?? '', run.dir, { force: run.force, branch: run.value['--branch'] }),
  list,
};

async function main(): Promise<number> {
  const [command, ...argv] = process.argv.slice(2);
  const run = command !== undefined && Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
  if (!run) { console.log(HELP); return command ? 2 : 0; }
  return run(parse(command, argv));
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`claude-packs: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  },
);
