// The path function of the change-to-tests map (d-7): a source file's tests are at the path computed from its own, in the tier the
// test lives in (CLAUDE.md "Project layout"), then what a pack's manifest says (`tests`, `requires`).
//   lib/x                      -> test/unit/lib/x, and its split parts x-*
//   packs/p/hooks/h            -> test/hooks/p/h, and its split parts h-*
//   packs/p/hooks/lib/m        -> test/unit/hooks-lib/m, and the hook tests of every hook that imports m, transitively
//   packs/p/tools/t            -> test/tools/p/t, and its split parts
//   test/kit-cli, fresh-tmp, a fixture builder -> the integration tier
//   pack.json `tests`          -> the test files it names for the changed file (a map from each code file to its tests)
//   pack.json `requires`       -> a change under a pack also reaches the tests of the packs that require it
import { join } from 'node:path';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import { testsOf, type PackFields } from '../lib/pack-manifest.mts';
import { HOOK, TEST } from './test-changed-table.mts';

/** A test file and why a path says it covers the change. */
export type PathPick = [test: string, why: string];

/** Every module that imports a file, directly or through others. */
export type Reachers = (file: string) => ReadonlySet<string>;


const stringsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stemOf = (file: string): string => (file.split('/').pop() ?? '').replace(/\.(?:mjs|mts|py|js|ts)$/, '');

/** The tests of one stem in one tier folder: NAME.test and its split parts NAME-*.test. */
const inTier = (tests: readonly string[], dir: string, stem: string): string[] =>
  tests.filter((t) => new RegExp(`^${escapeRe(dir)}/${escapeRe(stem)}(?:-[\\w.-]*)?\\.test\\.m[jt]s$`).test(t));

const INTEGRATION_HELPER = /^test\/(?:kit-cli|fresh-tmp)\.m[jt]s$|^test\/fixtures\/.*\.m[jt]s$/;

/** The manifest of a pack, or none. */
const manifestOf = (root: string, pack: string): PackFields | null => readJson<PackFields>(join(root, 'packs', pack, 'pack.json'));

/** The tests a changed file reaches by its path and its pack's manifest. `files` is every file of the repo. */
export function pathTests(root: string, changed: string, files: readonly string[], reachers: Reachers): PathPick[] {
  const tests = files.filter((f) => TEST.test(f));
  const picks: PathPick[] = [];
  const add = (found: readonly string[], why: string): void => { for (const t of found) if (t !== changed) picks.push([t, why]); };
  const stem = stemOf(changed);
  const m = /^packs\/([\w-]+)\/(hooks\/lib|hooks|tools)\/[\w-]+\.(?:mjs|mts|py)$/.exec(changed);
  const [, pack = '', kind = ''] = m ?? [];
  if (/^lib\/[\w-]+\.m[jt]s$/.test(changed)) add(inTier(tests, 'test/unit/lib', stem), `path: ${changed} is covered by test/unit/lib/${stem}`);
  if (kind === 'hooks') add(inTier(tests, `test/hooks/${pack}`, stem), `path: hook ${stem} is covered by test/hooks/${pack}/${stem}`);
  if (kind === 'tools') add(inTier(tests, `test/tools/${pack}`, stem), `path: tool ${stem} is covered by test/tools/${pack}/${stem}`);
  if (kind === 'hooks/lib') {
    add(inTier(tests, 'test/unit/hooks-lib', stem), `path: hook lib ${stem} is covered by test/unit/hooks-lib/${stem}`);
    for (const hook of [...reachers(changed)].filter((f) => HOOK.test(f)).sort()) {
      add(inTier(tests, `test/hooks/${hook.split('/')[1] ?? pack}`, stemOf(hook)), `path: hook ${stemOf(hook)} imports ${changed}`);
    }
  }
  if (INTEGRATION_HELPER.test(changed)) add(tests.filter((t) => t.startsWith('test/integration/')), `path: ${changed} builds what the integration tier runs on`);
  const owner = /^packs\/([\w-]+)\//.exec(changed)?.[1];
  if (owner) {
    // `tests` is a map from each code file of the pack (its path inside the pack) to its test files; a change to pack.json itself reaches them all
    const named = testsOf(manifestOf(root, owner) ?? {});
    const inPack = changed.slice(`packs/${owner}/`.length);
    add((inPack === 'pack.json' ? Object.values(named).flat() : named[inPack] ?? []).filter((t) => tests.includes(t)), `pack.json of ${owner} names it in tests`);
    for (const f of files) {
      const dependent = /^packs\/([\w-]+)\/pack\.json$/.exec(f)?.[1];
      if (dependent && stringsOf(manifestOf(root, dependent)?.requires).includes(owner)) {
        add(tests.filter((t) => t.startsWith(`test/hooks/${dependent}/`) || t.startsWith(`test/tools/${dependent}/`)), `pack ${dependent} requires ${owner}`);
      }
    }
  }
  return picks;
}
