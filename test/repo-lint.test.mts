// The repo lint (typescript order W2.7): the gates that hold the conversion, each a function of a root so its planted fault is
// seen red on every run. Gates 6 to 10 are the reader tests that read every TypeScript source (file-urls, no-personal-name,
// npx-name, base-neutral, file-size; seen red on planted .mts, build/evidence/W2/gates-6-10-red.txt); W5 moves them in here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, readText, scratchDir, walk } from '../packs/base/hooks/lib/files.mts';
import { emittedFrom } from '../packs/base/hooks/lib/source-exts.mts';
import { languageOf } from '../packs/base/hooks/lib/languages.mjs';
import { manifestProblems } from '../lib/pack-manifest.mts';
import { PRESETS, availablePacks, readPack } from '../lib/packs.mts';
import { CLI } from './kit-cli.mts';
import {
  BARE, addedRawJson, bareNpx, configurationFaults, frameBenchFaults, lineLimit, overLimit, pathnameForms, personalNames,
  readmeOrder, readmeRefusal, leftBaseStillThere, siteFiles, siteShipped, siteWords, slowChecks, synthWordsInBase,
} from './repo-readers.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const TSC = join(KIT, 'node_modules/.bin/tsc');
const SOURCE_FOLDERS = ['bin', 'lib', 'global', 'scripts', 'packs', '.claude/hooks', 'test'];
// The folders converted whole: no hand-written .mjs, .js or .py is left in them (the lead adds each as W3 and W4 finish it).
const CONVERTED: readonly string[] = ['packs', 'global', 'scripts', 'lib', 'bin'];
// A hand-written file a converted folder still holds on purpose, each with the step that removes it (none since W4 wave 2).
const NOT_YET: ReadonlySet<string> = new Set([]);

const rel = (root: string, file: string): string => relative(root, file).replace(/\\/g, '/');
const skipped = (name: string): boolean => name === 'node_modules' || name === 'fixtures' || name === 'worktrees' || name === '.DS_Store';
const typescriptOf = (root: string, folders = SOURCE_FOLDERS): string[] =>
  folders.flatMap((f) => walk(join(root, f), skipped)).filter((f) => /\.(?:mts|cts)$/.test(f));
const blank = (text: string): string => languageOf('.mts')?.blank(text) ?? text;

// Gate 1: the compiler finds nothing, over the sources and over the tests.
export function typeErrors(root: string, projects: readonly string[]): string[] {
  return projects.flatMap((p) => {
    const r = spawnSync(TSC, ['--noEmit', '-p', join(root, p)], { cwd: root, encoding: 'utf8' });
    return r.status === 0 ? [] : [`${p}: ${(r.stdout + r.stderr).trim().split('\n')[0] ?? ''}`];
  });
}

// Gate 2: no `any`, and no comment that silences the compiler.
const ANY = /(?::|\bas|<|,|\|)\s*any\b|\bany\s*\[\]/;
const SILENCER = /@ts-(?:ignore|expect-error|nocheck)\b/;
export function escapes(root: string, folders = SOURCE_FOLDERS): string[] {
  return typescriptOf(root, folders).flatMap((f) => {
    const raw = readText(f) ?? '';
    const code = blank(raw).split('\n');
    return raw.split('\n').flatMap((line, i) => (ANY.test(code[i] ?? '') || SILENCER.test(line) ? [`${rel(root, f)}:${i + 1}`] : []));
  });
}

// Gate 3: a folder marked converted holds no hand-written .mjs, .js or .py (proxy/ holds Go and is never listed).
export function handWritten(root: string, folders: readonly string[]): string[] {
  return folders.flatMap((f) => walk(join(root, f), skipped)).filter((f) => /\.(?:mjs|js|cjs|py)$/.test(f) && emittedFrom(f) === null).map((f) => rel(root, f));
}

// Gate 3b: git tracks no file it ignores: an emitted .mjs committed by naming its module in `git commit -- <paths>` (KWB-179).
export function trackedIgnored(root: string): string[] {
  const r = spawnSync('git', ['ls-files', '--cached', '--ignored', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  return r.stdout.split('\n').filter(Boolean);
}

// Gate 4: every shape types.d.mts declares is declared there and nowhere else.
const DECLARED = /^\s*(?:export\s+)?(?:declare\s+)?(?:interface|type)\s+([A-Z]\w*)/gm;
export function secondShapes(root: string, typesFile: string, folders = SOURCE_FOLDERS): string[] {
  const shared = new Set([...(readText(join(root, typesFile)) ?? '').matchAll(DECLARED)].map((m) => m[1]));
  return typescriptOf(root, folders).filter((f) => rel(root, f) !== typesFile).flatMap((f) =>
    [...blank(readText(f) ?? '').matchAll(DECLARED)].filter((m) => shared.has(m[1])).map((m) => `${rel(root, f)}: ${m[1]}`));
}

// Gate 5: the emitted files are what tsc writes now (built into a temporary folder, compared byte for byte).
export function staleEmit(root: string, project: string): string[] {
  const out = scratchDir('emit-');
  const r = spawnSync(TSC, ['-p', join(root, project), '--outDir', out, '--incremental', 'false', '--tsBuildInfoFile', 'null'], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) return [`tsc failed: ${(r.stdout + r.stderr).trim().split('\n')[0] ?? ''}`];
  return walk(out).flatMap((built) => {
    const inTree = join(root, rel(out, built));
    return readText(inTree) === readFileSync(built, 'utf8') ? [] : [rel(out, built)];
  });
}

// Gates 11 and 12: a hook or hook-lib module touches no process global outside its isMain tail, and does no work at import.
const TAIL = /^if \(isMain\(import\.meta\.url\)\)/m;
const PROCESS = /\bprocess\.(?:env\b|cwd\(|ppid\b|exit\b|chdir\b|stdout\b|stderr\b)|\bconsole\./;
const DECLARES = /^(?:import\b|export\b|const\b|let\b|var\b|function\b|async function\b|class\b|interface\b|type\b|declare\b|[}\])]|$)/;
// A selftest module runs only under --selftest, never inside the resident runner, and is left out (d-20); so is hook-log, the
// hooks' process boundary (stdin in, stderr out, the exit code), which the resident runner replaces for a hook (d-23).
const SELFTEST_ONLY = /\/(?:selftest|[\w-]+-selftest|hub-rig|hook-log)\.mts$/;
const hookModules = (root: string): string[] => walk(join(root, 'packs'), skipped)
  .filter((f) => /\/hooks\/(?:lib\/)?[\w-]+\.(?:mts|cts)$/.test(f) && !f.endsWith('.d.mts') && !SELFTEST_ONLY.test(f));
export function processGlobals(root: string, files = hookModules(root)): string[] {
  return files.flatMap((f) => {
    const code = blank(readText(f) ?? '');
    const body = code.slice(0, TAIL.exec(code)?.index ?? code.length).split('\n');
    return body.flatMap((line, i) => (PROCESS.test(line) ? [`${rel(root, f)}:${i + 1}`] : []));
  });
}
export function workAtImport(root: string, files = hookModules(root)): string[] {
  return files.flatMap((f) => {
    const code = blank(readText(f) ?? '');
    const body = code.slice(0, TAIL.exec(code)?.index ?? code.length).split('\n');
    return body.flatMap((line, i) => (/^\S/.test(line) && !DECLARES.test(line) ? [`${rel(root, f)}:${i + 1}`] : []));
  });
}

const tsconfig = { compilerOptions: { strict: true, noEmit: true, module: 'nodenext', moduleResolution: 'nodenext', target: 'es2023', types: [], skipLibCheck: true, rewriteRelativeImportExtensions: true }, include: ['**/*.mts'] };
function planted(files: Record<string, string>): string {
  const dir = scratchDir('repo-lint-');
  for (const [name, text] of Object.entries(files)) put(join(dir, name), text);
  return dir;
}

test('gate 1: npm run check finds 0 errors; a wrong type is found', () => {
  assert.deepEqual(typeErrors(KIT, ['tsconfig.json', 'test/tsconfig.json']), []);
  const dir = planted({ 'tsconfig.json': JSON.stringify(tsconfig), 'a.mts': "export const n: number = 'one';\n" });
  assert.equal(typeErrors(dir, ['tsconfig.json']).length, 1);
});

test('gate 2: no any and no silenced error in a TypeScript source; a planted any is found', () => {
  assert.deepEqual(escapes(KIT), []);
  const dir = planted({ 'lib/a.mts': "export const a = (x: any): number => x; // 'any' in a string or a comment is no escape\n", 'lib/b.mts': `// @ts-${'ignore'}\nexport const b = 1;\n` });
  assert.deepEqual(escapes(dir, ['lib']), ['lib/a.mts:1', 'lib/b.mts:1']);
});

test('gate 3: a converted folder holds no hand-written .mjs; a stray one beside the emitted ones is found', () => {
  assert.deepEqual(handWritten(KIT, CONVERTED).filter((f) => !NOT_YET.has(f)), []);
  const dir = planted({ 'lib/a.mts': 'export const a = 1;\n', 'lib/a.mjs': 'export const a = 1;\n', 'lib/b.mjs': 'export const b = 2;\n' });
  assert.deepEqual(handWritten(dir, ['lib']), ['lib/b.mjs']);
});

test('gate 3b: git tracks no file it ignores (an emitted .mjs); a committed one is found (KWB-179)', () => {
  assert.deepEqual(trackedIgnored(KIT), []);
  const dir = planted({ '.gitignore': 'lib/a.mjs\n', 'lib/a.mts': 'export const a = 1;\n', 'lib/a.mjs': 'export const a = 1;\n' });
  for (const args of [['init', '-q'], ['add', '-f', 'lib/a.mjs', 'lib/a.mts', '.gitignore']]) spawnSync('git', args, { cwd: dir });
  assert.deepEqual(trackedIgnored(dir), ['lib/a.mjs']);
});

test('gate 4: each shared shape is defined once, in types.d.mts; a second interface Lock is found', () => {
  assert.deepEqual(secondShapes(KIT, 'packs/base/hooks/lib/types.d.mts'), []);
  const dir = planted({ 'lib/types.d.mts': 'export interface Lock { kit: string }\n', 'lib/other.mts': 'interface Lock { kit: string }\nexport const x = 1;\n' });
  assert.deepEqual(secondShapes(dir, 'lib/types.d.mts', ['lib']), ['lib/other.mts: Lock']);
});

test('gate 5: the emitted files are current; an edited .mts with no build is found', () => {
  assert.deepEqual(staleEmit(KIT, 'tsconfig.json'), []);
  const config = { ...tsconfig, compilerOptions: { ...tsconfig.compilerOptions, noEmit: false } };
  const dir = planted({ 'tsconfig.json': JSON.stringify(config), 'a.mts': 'export const a: number = 2;\n', 'a.mjs': 'export const a = 1;\n' });
  assert.deepEqual(staleEmit(dir, 'tsconfig.json'), ['a.mjs']);
});

test('gates 11 and 12: no process global and no work at import in a converted hook module; a planted line of each is found', () => {
  assert.deepEqual(processGlobals(KIT), []);
  assert.deepEqual(workAtImport(KIT), []);
  const dir = planted({
    'packs/x/hooks/lib/a.mts': "export const root = process.env.HOME ?? '';\nconsole.log(root);\n",
    'packs/x/hooks/b.mts': "import { isMain } from './lib/hook-log.mts';\nexport const hook = (): number => 0;\nif (isMain(import.meta.url)) process.exit(0);\n",
  });
  assert.deepEqual(processGlobals(dir), ['packs/x/hooks/lib/a.mts:1', 'packs/x/hooks/lib/a.mts:2']);
  assert.deepEqual(workAtImport(dir), ['packs/x/hooks/lib/a.mts:2']);
});

// The picker reaches this file for a change under docs/ because it reads every file the repo keeps (KWB-131: no-personal-name).
// The reader tests of W2.7 and the count and fact readers (test/repo-readers.mts, W5.4): each one asserts the real tree clean and a planted one found.

test('base and the base configuration name no synth word', () => {
  assert.deepEqual(synthWordsInBase(KIT), []);
  assert.equal(synthWordsInBase(planted({ 'packs/base/rules/a.md': 'tune the Voice\n', 'configurations/base/config.json': '{}' })).length, 1);
});
test('what left base is in the synth-creator pack and not in base; a synth hook put back into base is found', () => {
  assert.deepEqual(leftBaseStillThere(KIT), []);
  const back = planted({ 'packs/synth-creator/hooks/build-guard.mts': 'x\n', 'packs/synth-creator/pack.json': '{}', 'packs/base/hooks/build-guard.mts': 'x\n', 'packs/base/pack.json': '{}' });
  assert.deepEqual(leftBaseStillThere(back), ['hooks/build-guard.mts']);
});
test('only the synth-creator configuration installs the synth-creator pack, and every configuration installs base first', () => {
  assert.deepEqual(configurationFaults(KIT), { takers: ['synth-creator'], notBaseFirst: [] });
  const shared = '{"packs":{"always":["writing"]},"layout":{"folders":{},"kinds":{}},"preamble":{"always":[],"never":[]}}';   // a base that does not start with base, and a delta that adds the synth pack
  const bad = planted({ 'configurations/shared.json': shared, 'configurations/x/config.json': '{"packs":{"with":["synth-creator"]}}' });
  assert.deepEqual(configurationFaults(bad), { takers: ['x'], notBaseFirst: ['x'] });
});
test('every lesson check gets through a large file within its budget', () => {
  assert.deepEqual(slowChecks(KIT), []);
  const slow = planted({ 'packs/p/checks/c.json': '{"id":"c","pattern":"(a|a)*b"}' });
  assert.deepEqual(slowChecks(slow, -1).length, 3, 'a budget no check meets finds it in each large file');
});
test('every installed hook, check and tool file fits in the line limit, and every .mts it is built from', () => {
  assert.deepEqual(overLimit(KIT, lineLimit(KIT)), []);
  assert.deepEqual(overLimit(planted({ 'packs/p/hooks/a.mts': 'x\n'.repeat(5) }), 4), ['packs/p/hooks/a.mts']);
});
test('no source takes its own path from a URL\'s pathname (Windows reads it as /C:/...)', () => {
  assert.deepEqual(pathnameForms(KIT), []);
  assert.deepEqual(pathnameForms(planted({ 'lib/a.mts': 'export const f = new URL(\'.\', import.meta.url).pathname;\n' }), ['lib']), ['lib/a.mts']);
});
test('gpu-painter skills name Dawn timestamps, never GL timer queries', () => {
  assert.deepEqual(frameBenchFaults(KIT), []);
  assert.equal(frameBenchFaults(planted({ 'packs/gpu-painter/skills/gpu-frame-bench/SKILL.md': 'uses GL timer queries\n' })).length, 2);
});
test('a change adds no raw JSON.parse or JSON.stringify call: it calls toJson, parseJson, readJson or writeJson', () => {
  const base = process.env.CLAUDE_PACKS_LINT_BASE ?? 'HEAD';   // a gate on committed work names the trunk it lands on
  assert.deepEqual(addedRawJson(KIT, base), [], 'call the helper in packs/base/hooks/lib/json.mts');
  const dir = planted({ 'lib/a.mts': 'export const a = 1;\n' });
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'a']]) spawnSync('git', args, { cwd: dir });
  put(join(dir, 'lib/a.mts'), 'export const a = JSON.parse(\'1\');\n');
  put(join(dir, 'lib/new.mts'), 'export const b = JSON.stringify(1);\n// JSON.parse( in a comment is no call\n');
  assert.deepEqual(addedRawJson(dir).map((h) => h.split(':')[0]), ['lib/a.mts', 'lib/new.mts']);
});
test('no file names a person', () => {
  assert.deepEqual(personalNames(KIT), []);
  const dir = planted({ 'docs/a.md': 'thanks to ' + ['T', 'im'].join('') + '\n' });
  assert.equal(personalNames(dir, ['docs/a.md']).length, 1);
});
test('nothing in the kit names the bare `npx claude-packs` (it resolves to someone else\'s package)', () => {
  assert.deepEqual(bareNpx(KIT), [], 'use `npx --no-install @thedecipherist/claude-packs ...` or the installed path');
});
test('the bare-name reader finds a planted line', () => {
  assert.ok(BARE.test('run `npx claude-packs doctor`') && BARE.test('npx -y claude-packs update'));
  assert.ok(!BARE.test('npx --no-install @thedecipherist/claude-packs doctor'));
});
test('recorded run output under evidence/ is left out, and the same line anywhere else is found (KWB-99)', () => {
  const root = planted(Object.fromEntries(['build/evidence/W1/gate.txt', 'docs/how.md'].map((f) => [f, 'run `npx claude-packs doctor`\n'])));
  assert.deepEqual(bareNpx(root), ['docs/how.md:1']);
});

test('every pack the kit ships is a stock pack with a full manifest', () => {
  for (const name of availablePacks()) {
    const p = readPack(name);
    assert.deepEqual(manifestProblems(p, name), [], name);
    assert.equal(p.type, 'stock', name);
    assert.match(p.repository?.url ?? '', /TheDecipherist\/claude-packs/, name);
    assert.equal((p.repository as { directory?: string } | undefined)?.directory, `packs/${name}`, name);
  }
});
test('a custom pack passes with an author and a git url, and each missing field is named', () => {
  const custom = { name: 'acme', version: '1.2.0', description: 'Acme laws', type: 'custom' as const, author: 'Acme Platform', license: 'UNLICENSED', repository: { type: 'git', url: 'git@git.acme.example:p/acme.git' } };
  assert.deepEqual(manifestProblems(custom), []);
  assert.deepEqual(manifestProblems({ ...custom, author: { name: 'Acme', email: 'a@acme.example' } }), []);
  const faults: [string, unknown, RegExp][] = [['author', '', /needs an author/], ['repository', {}, /needs repository\.url/], ['repository', { url: 'not a url' }, /needs repository\.url/],
    ['type', 'mine', /needs a type: stock or custom/], ['version', '1', /needs a version/], ['license', undefined, /needs a license/], ['description', ' ', /needs a description/]];
  for (const [field, value, said] of faults) assert.match(manifestProblems({ ...custom, [field]: value }).join('\n'), said, field);
  assert.match(manifestProblems(custom, 'other').join('\n'), /says its name is acme/);
});
test('list shows each pack\'s version, type and author', () => {
  assert.match(execFileSync('node', [CLI, 'list'], { encoding: 'utf8' }), /^mongo +1\.0\.0 +stock +claude-packs: MongoDB/m);
});

test('the refusal on the page is the check\'s own words, so the first thing a reader sees is true', () => assert.deepEqual(readmeRefusal(KIT), []));
test('a new reader meets what it is before any command, and how to install one pack', () => assert.deepEqual(readmeOrder(KIT), []));
test('every file the page loads is in the site, by a relative path, so it works under any repo name', () => {
  assert.deepEqual(siteFiles(KIT), []);
  assert.deepEqual(siteFiles(planted({ 'site/index.html': '<link href="a.css"><script src="/x.js">' })), ['a.css', '/x.js', 'an absolute path']);
});
test('the page carries no analytics, and the refusal it shows is the check\'s own words', () => {
  assert.deepEqual(siteWords(KIT), []);
  assert.ok(siteWords(planted({ 'site/index.html': 'gtag' })).includes('the page carries analytics'));
});
test('the site is not shipped in the npm package', () => assert.equal(siteShipped(KIT), false));
