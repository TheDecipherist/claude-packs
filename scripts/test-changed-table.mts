// What test-changed knows without reading a test: how it tells a module, a test and a hook by their names, and the table of what a
// change can break when no import or name shows it (the table's row for each kind of file the kit keeps).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PRESETS } from '../lib/packs.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';

// What the picker reads as a module, a test and a test helper: JavaScript and TypeScript alike (W2.6; review O1).
export const MODULE = /\.(?:mjs|js|mts|cts|ts)$/;
export const TEST = /^test\/.*\.test\.m[jt]s$/;
export const HOOK = /^packs\/[\w-]+\/hooks\/[\w-]+\.(?:mjs|mts|py)$/;

// the CLI: it imports nearly all of lib/, so a chain through it reaches everything (KWB-166); and how far an import chain counts
export const HUBS: ReadonlySet<string> = new Set(['bin/claude-packs.mjs', 'bin/claude-packs.mts']);
export const MAX_HOPS = 2;
export const GENERIC: ReadonlySet<string> = new Set(['SKILL.md', 'pack.json', 'package.json', 'layout.json', 'settings.json', 'README.md', 'CHANGELOG.md', 'selftest.mjs', 'selftest.mts', 'index.mjs']);
export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'worktrees', '.claude-packs-backup']);

/** One row of the table: the files it is about, what kind of change counts, why, and which tests it picks (by a test's text). */
export interface TableRow {
  files: RegExp;
  when?: (changed: string, status: string) => boolean;
  why: string;
  tests: (text: string, changed: string, root: string, test: string) => boolean;
}

// What no import or name shows. `tests` picks the test files by their text. A test installs through the CLI itself or through
// a test helper that runs it (kit-cli for most; worktree-rig, whose project() runs init, for the worktree tests).
const INSTALLING_HELPERS = ['bin/claude-packs.mjs', './kit-cli.mjs', './worktree-rig.mjs', './kit-cli.mts', './worktree-rig.mts', 'fixtures/installs.mts'];
const installs = (text: string): boolean => INSTALLING_HELPERS.some((h) => text.includes(h)) && /['"](init|new|add|update|update-all)['"]/.test(text);

interface ConfigPacks { packs: { always: string[]; choose: string[] } }

// The text of a test that brings a pack in: its name, a preset that holds it, a configuration that takes it (by --config; a
// configuration's own pack also comes with the packs it offers), or a walk over every configuration (KWB-41).
function brings(root: string, pack: string): RegExp {
  const words = new Set([pack]);
  const configs: string[] = [];
  const dir = join(root, 'configurations');
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const c = readJson<ConfigPacks>(join(dir, name, 'config.json'));
    if (!c) continue;
    if (c.packs.always.includes(pack)) for (const p of c.packs.choose) words.add(p);
    if ([...c.packs.always, ...c.packs.choose].includes(pack)) configs.push(name);
  }
  for (const [preset, packs] of Object.entries(PRESETS)) if (packs.some((p) => words.has(p))) words.add(preset);
  return new RegExp(`['"](?:${[...words].join('|')})['"]|--config['"]?,?\\s*['"]?(?:${configs.join('|') || '$^'})\\b|['"]configurations['"]`);
}

// What a change can break, by what kind of change it is (KWB-166); a changed hook also proves its own selftest (selftestsOf).
const SHAPE = (status: string): boolean => status === 'A' || status === 'D' || status === 'R';
const packOf = (c: string): string => (c.startsWith('packs/') ? (c.split('/')[1] ?? 'base') : 'base');
const noopOf = (text: string, changed: string, root: string): boolean => /noop/.test(text) && /updated\(/.test(text) && (packOf(changed) === 'base' || brings(root, packOf(changed)).test(text));

// No change picks every test that installs (the user: "There is no way we touch every single file every time just because we touch
// base"). A pack's file changes what an install holds, and only noop (every installed file listed), the counts (a file gained or
// lost) and the worktree cases (every installed hook has one) read that; a configuration or a profile reaches the tests that bring
// it in; the installer's own code (lib/) reaches its tests through their imports and names.
export const TABLE: readonly TableRow[] = [
  { files: /^package\.json$/, why: 'runs every test (its scripts, its dependencies)', tests: () => true },
  { files: /^docs\//, why: 'a document: the tests that read every file the repo keeps (KWB-131)', tests: (text) => /reads every file the repo keeps/.test(text) },
  { files: /^test\/fresh-tmp\.m[jt]s$/, why: 'the preload: its own test (every test loads it; this one checks what it gives them)', tests: (text) => /test\/fresh-tmp\.mjs itself|The preload itself/.test(text) },
  { files: /^packs\//, why: 'an installed file changed: noop holds every installed file and every change to one listed', tests: noopOf },
  { files: /^packs\/[\w-]+\/(rules|checks|hooks|skills)\//, when: (_c, status) => SHAPE(status), why: 'a pack gained or lost a rule, check, hook or skill: the tests that hold the true counts',
    tests: (text) => /true counts/.test(text) },
  { files: /^packs\/[\w-]+\/(hooks\/[\w-]+\.(mjs|mts|py)|pack\.json)$/, when: (c, status) => SHAPE(status) || c.endsWith('pack.json'), why: 'a hook added, removed or registered: every installed hook has its worktree case',
    tests: (text) => /every installed hook needs a worktree case/.test(text) },
  { files: /^configurations\//, why: 'a configuration: the tests that bring it in', tests: (text, changed) => installs(text) && new RegExp(`--config['"]?,?\\s*['"]?${changed.split('/')[1]}\\b|['"]configurations['"]`).test(text) },
  // a module of the CLI: the tests about it (named after it); a test that only runs its command on the way (every install runs
  // doctor) uses it and does not check it (KWB-166)
  { files: /^lib\/[\w-]+\.m[jt]s$/, why: 'a module of the CLI: the tests named after it', tests: (_text, changed, _root, test) => new RegExp(`^test/${changed.slice(4).replace(/\.m[jt]s$/, '')}[.-]`).test(test) },
  { files: /^test\/fixtures\/[\w-]+\//, why: 'a fixture: the tests that read its folder', tests: (text, changed) => text.includes(`fixtures/${changed.split('/')[2]}`) },
  { files: /^planner\//, why: 'the planner skills claude.ai takes: the tests that read the planner folder (KWB-141)', tests: (text) => /join\(KIT, 'planner'\)/.test(text) },
  { files: /^global\//, why: 'the global part: the tests that run `global`', tests: (text) => /['"]global['"]/.test(text) },
];
