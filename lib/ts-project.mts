// TypeScript enforced in a project (typescript order W8.5, d-5). A project that takes the `typescript-only` check holds what the check
// assumes: `typescript` in its devDependencies (TypeScript 7's own `tsc --lsp --stdio` is the language server, so it is one package),
// a strict tsconfig.json where it has none, and the kit's LSP plugin declared in its .claude/settings.json. `enforceTypeScript` writes
// the three when the check switches on (init, or an update whose layout.json `enable` names it); `typescriptProblems` is doctor's
// half: red when the check is installed and the package or the declaration is gone.
import { appendFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { readJson, toJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { readSettings } from './settings.mts';

/** The check this module serves, as a switch names it. */
export const TS_CHECK = 'checks/typescript-only.json';
/** The version the kit pins (docs/versions.md: typescript, and the language server inside it). */
export const TS_VERSION = '7.0.2';
export const PLUGIN = 'kit-typescript-lsp@claude-packs-kit';
const MARKETPLACE = 'claude-packs-kit';
const MARKETPLACE_REPO = 'TheDecipherist/claude-packs';

// The kit's own strict set (tsconfig.json), less what is the kit's: its build (rootDir, rootDirs, incremental, rewriteRelativeImportExtensions,
// erasableSyntaxOnly) and its `types` (a project may not carry @types/node). The project's tool emits, so `noEmit`.
const STRICT = {
  compilerOptions: {
    module: 'nodenext', moduleResolution: 'nodenext', target: 'es2023', skipLibCheck: true, noEmit: true,
    strict: true, noUncheckedIndexedAccess: true, noImplicitOverride: true, noFallthroughCasesInSwitch: true,
    verbatimModuleSyntax: true, isolatedModules: true, useUnknownInCatchVariables: true, allowJs: false,
  },
  include: ['src'],
} as const;

interface Pkg { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; [key: string]: unknown }

const hasTypeScript = (pkg: Pkg | null): boolean => pkg !== null && (pkg.devDependencies?.['typescript'] !== undefined || pkg.dependencies?.['typescript'] !== undefined);

const declared = (projectDir: string): boolean => {
  const plugins = readSettings(join(projectDir, '.claude'))['enabledPlugins'];
  return typeof plugins === 'object' && plugins !== null && (plugins as Record<string, unknown>)[PLUGIN] === true;
};

// The row docs/versions.md keeps for the pin: only a project that has that file needs it.
function versionsRow(): string {
  const today = new Date().toISOString().slice(0, 10);
  const note = "devDependency: the project's sources are TypeScript, checked by TypeScript 7's native tsc, which is also the language server (the kit's typescript-only check)";
  return `| typescript | ${TS_VERSION} | ${today} | https://registry.npmjs.org/typescript | ${TS_VERSION} | ${note} |\n`;
}

function addDevDependency(projectDir: string, log: Logger): void {
  const file = join(projectDir, 'package.json');
  const pkg: Pkg = readJson<Pkg>(file) ?? { name: basename(projectDir).toLowerCase().replace(/[^a-z0-9-_.]/g, '-'), private: true };
  if (hasTypeScript(pkg)) return;
  const dev = Object.entries({ ...pkg.devDependencies, typescript: TS_VERSION }).sort(([a], [b]) => a.localeCompare(b));
  writeJson(file, { ...pkg, devDependencies: Object.fromEntries(dev) }, { pretty: true });
  log(`  typescript: ${TS_VERSION} added to devDependencies in package.json (run your package manager's install); it is the language server too`);
  const versions = join(projectDir, 'docs', 'versions.md');
  if (existsSync(versions)) appendFileSync(versions, `${(readText(versions) ?? '').endsWith('\n') ? '' : '\n'}${versionsRow()}`);
}

function declarePlugin(projectDir: string): void {
  const claudeDir = join(projectDir, '.claude');
  const settings = readSettings(claudeDir);
  const marketplaces = (settings['extraKnownMarketplaces'] ?? {}) as Record<string, unknown>;
  const plugins = (settings['enabledPlugins'] ?? {}) as Record<string, unknown>;
  put(join(claudeDir, 'settings.json'), `${toJson({
    ...settings,
    extraKnownMarketplaces: { ...marketplaces, [MARKETPLACE]: marketplaces[MARKETPLACE] ?? { source: { source: 'github', repo: MARKETPLACE_REPO } } },
    enabledPlugins: { ...plugins, [PLUGIN]: true },
  }, { pretty: true })}\n`);
}

/** Writes what the `typescript-only` check assumes, each part only where it is missing; the project's own values are never replaced. */
export function enforceTypeScript(projectDir: string, log: Logger): void {
  addDevDependency(projectDir, log);
  if (!existsSync(join(projectDir, 'tsconfig.json'))) {
    put(join(projectDir, 'tsconfig.json'), `${toJson(STRICT, { pretty: true })}\n`);
    log('  tsconfig.json: written (strict, noUncheckedIndexedAccess, verbatimModuleSyntax); none existed');
  }
  if (!declared(projectDir)) {
    declarePlugin(projectDir);
    log(`  .claude/settings.json: the TypeScript language server declared (${PLUGIN})`);
  }
}

/** Doctor's half: a project that has the check installed is red without `typescript` in its package.json or without the declaration. */
export function typescriptProblems(projectDir: string): string[] {
  if (!existsSync(join(projectDir, '.claude', TS_CHECK))) return [];
  const problems: string[] = [];
  if (!hasTypeScript(readJson<Pkg>(join(projectDir, 'package.json')))) {
    problems.push('typescript-only is installed, but `typescript` is not in package.json devDependencies (add it, or take the check out of layout.json enable)');
  }
  if (!declared(projectDir)) {
    problems.push(`typescript-only is installed, but .claude/settings.json does not enable the language server plugin ("enabledPlugins": { "${PLUGIN}": true })`);
  }
  return problems;
}
