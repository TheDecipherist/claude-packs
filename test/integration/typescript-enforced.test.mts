// W8.5 (d-5): TypeScript is enforced in a project that takes the `typescript-only` check: `init` writes the devDependency, the strict
// tsconfig and the language server declaration; a new .mjs is refused; doctor is red without them; an existing project takes all of it
// only when layout.json `enable` names the check (an `update` alone changes nothing).
import { assert, cli, existsSync, fresh, join, lessonWrite, readFileSync, rmSync, run, test } from '../kit-cli.mts';
import { fixture, lockOf, withLayout } from '../fixtures/installs.mts';
import { readJson, writeJson } from '../../packs/base/hooks/lib/json.mts';
import { put } from '../../packs/base/hooks/lib/files.mts';

interface Pkg { devDependencies?: Record<string, string> }
interface Settings { enabledPlugins?: Record<string, boolean> }

const PLUGIN = 'kit-typescript-lsp@claude-packs-kit';
const pkgOf = (dir: string): Pkg => readJson<Pkg>(join(dir, 'package.json')) ?? {};
const settingsOf = (dir: string): Settings => readJson<Settings>(join(dir, '.claude/settings.json')) ?? {};

test('a node project from init holds typescript, a strict tsconfig and the declaration, and refuses a new .mjs', () => {
  const dir = fresh('ts-node-');
  run(dir, 'init', '--config', 'node');
  assert.equal(pkgOf(dir).devDependencies?.['typescript'], '7.0.2');
  assert.equal(settingsOf(dir).enabledPlugins?.[PLUGIN], true);
  const tsconfig = readFileSync(join(dir, 'tsconfig.json'), 'utf8');
  for (const flag of ['strict', 'noUncheckedIndexedAccess', 'verbatimModuleSyntax']) assert.match(tsconfig, new RegExp(`"${flag}": true`));
  assert.ok(existsSync(join(dir, '.claude/checks/typescript-only.json')));
  assert.equal(lessonWrite(dir, 'src/helper.mjs', 'export const answer = 42;\n').status, 2, 'a new .mjs is refused');
  assert.equal(lessonWrite(dir, 'src/helper.cjs', 'module.exports = 42;\n').status, 2, 'a new .cjs is refused');
  assert.match(lessonWrite(dir, 'src/helper.js', 'export const a = 1;\n').stderr, /typescript-only/);
  for (const rel of ['src/helper.ts', 'src/helper.mts', 'eslint.config.js', 'vite.config.mjs', '.eslintrc.cjs', 'postcss.config.cjs', 'public/app.js']) {
    assert.equal(lessonWrite(dir, rel, 'export const answer = 42;\n').status, 0, `${rel} is left out`);
  }
  const doctor = cli(dir, 'doctor');
  assert.doesNotMatch(doctor.stdout, /typescript-only is installed/);
});

test('doctor is red when typescript is removed from the project, and when the declaration is', () => {
  const dir = fixture('js-ts');
  assert.doesNotMatch(cli(dir, 'doctor').stdout, /PROBLEM: typescript-only/);
  const pkg = pkgOf(dir);
  writeJson(join(dir, 'package.json'), { ...pkg, devDependencies: {} });
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /PROBLEM: typescript-only is installed, but `typescript` is not in package.json/);
  writeJson(join(dir, 'package.json'), pkg);
  writeJson(join(dir, '.claude/settings.json'), { ...settingsOf(dir), enabledPlugins: {} });
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: typescript-only is installed, but .claude\/settings.json does not enable/);
});

test('an existing project: an update changes nothing until layout.json enable names the check, then takes all of it', () => {
  const dir = fixture('js-ts');
  // the install as an older kit left it: no check, no typescript, no tsconfig, no declaration
  rmSync(join(dir, '.claude/checks/typescript-only.json'));
  rmSync(join(dir, 'tsconfig.json'));
  rmSync(join(dir, 'package.json'));
  put(join(dir, 'package.json'), '{ "name": "old", "devDependencies": { "left-pad": "1.3.0" } }\n');
  const { extraKnownMarketplaces: _gone, enabledPlugins: _off, ...rest } = readJson<Record<string, unknown>>(join(dir, '.claude/settings.json')) ?? {};
  writeJson(join(dir, '.claude/settings.json'), rest);
  const lock = lockOf(dir);
  const files = { ...lock.files };
  delete files['.claude/checks/typescript-only.json'];
  writeJson(join(dir, '.claude/claude-packs.lock.json'), { ...lock, files });

  const before = { pkg: readFileSync(join(dir, 'package.json'), 'utf8'), settings: settingsOf(dir) };
  const said = run(dir, 'update');
  assert.match(said, /held back[^\n]*checks\/typescript-only\.json/);
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), before.pkg);
  assert.deepEqual(settingsOf(dir), before.settings, 'settings.json holds the same keys (an update may reformat it)');
  assert.ok(!existsSync(join(dir, 'tsconfig.json')));
  assert.ok(!existsSync(join(dir, '.claude/checks/typescript-only.json')));
  assert.equal(lessonWrite(dir, 'src/helper.mjs', 'export const answer = 42;\n').status, 0, 'not switched on: a new .mjs passes');

  withLayout(dir, (layout) => ({ ...layout, enable: [...((layout['enable'] as string[] | undefined) ?? []), 'checks/typescript-only.json'] }));
  run(dir, 'update');
  assert.deepEqual(pkgOf(dir).devDependencies, { 'left-pad': '1.3.0', 'typescript': '7.0.2' }, 'the project\'s own entry is kept');
  assert.equal(settingsOf(dir).enabledPlugins?.[PLUGIN], true);
  assert.ok(existsSync(join(dir, 'tsconfig.json')));
  assert.equal(lessonWrite(dir, 'src/helper.mjs', 'export const answer = 42;\n').status, 2);
});
