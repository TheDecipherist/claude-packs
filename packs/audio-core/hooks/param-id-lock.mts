// Locks parameter IDs: once seen, an ID may never disappear from the source. The lock starts itself at the first id it sees (KF-15).
//   node param-id-lock.mjs --init   create .claude/param-ids.lock.json from the current repo
//   node param-id-lock.mjs --status exit 1, saying why, when the unit has parameters and the lock holds no ids (doctor runs it)
//   (as PostToolUse hook)           fail (exit 2) if a locked ID is gone; add new IDs to the lock. Every route that
//                                   writes is judged (Write, Edit, MultiEdit, NotebookEdit, and the shell's >, >>, tee,
//                                   sed -i, cp, mv, rm, a heredoc; lib/writes.mjs): an id deleted by `sed -i` is gone too.
//   node param-id-lock.mjs --selftest  proves it
// Where IDs are read: .claude/param-ids.config.json, else layout.json "paramIds", else JUCE
// ParameterID / AudioParameter* string literals. Both forms: { "extensions": "<regex>", "patterns": ["<regex with one group>"] }.
// A pattern is a JavaScript regex, with ^ and $ matching at each line. One that cannot compile is reported by name, never a crash (KF-18).
// The project's build output (layout.json "buildOutput") is never read: ids in a library's sources are not the unit's (KF-15).
// A file is judged in its own checkout: an agent worktree is scanned, and keeps its lock, on its own.
// It both refuses (an id gone) and records (the lock's new ids); splitting it into a judge and a recorder is the lead's to decide.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { matchesAny } from './lib/glob.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { parseJson, readJson, writeJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mts';
import { put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, Verdict } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { writesOf } from './lib/writes.mts';

// .claude is skipped so the worktrees under .claude/worktrees/ never stand in for this checkout's code.
const SKIP_DIRS = /^out(\/|$)|(^|\/)(build|Builds|_deps|JuceLibraryCode|JUCE|node_modules|\.git|\.claude|cmake-build[^/]*)(\/|$)/;
const PARAMETER_WORDS = /\b(?:ParameterID|AudioParameter(?:Float|Int|Bool|Choice)|AudioProcessorValueTreeState|addParameter)\b/;
const CONFIG = join('.claude', 'param-ids.config.json');

const DEFAULT_PATTERNS = [
  'ParameterID\\s*(?:[A-Za-z_]\\w*\\s*)?[({]\\s*"([^"]+)"',
  'AudioParameter(?:Float|Int|Bool|Choice)\\s*>?\\s*\\(\\s*"([^"]+)"',
];

/** Where ids are read: the files they are in, and the patterns that find them. */
export interface IdConfig { extensions: RegExp; patterns: RegExp[] }

/** What a settings file or layout.json "paramIds" says: each key only when it is the right kind. */
function idSettings(value: unknown): { extensions?: string; patterns?: string[] } {
  if (value === null || typeof value !== 'object') return {};
  const { extensions, patterns } = value as Record<string, unknown>;
  const found: { extensions?: string; patterns?: string[] } = {};
  if (typeof extensions === 'string') found.extensions = extensions;
  if (Array.isArray(patterns)) found.patterns = patterns.map(String);
  return found;
}

// The settings, or { error } saying what cannot be read and where.
function loadConfig(root: string): IdConfig | { error: string } {
  const file = join(root, CONFIG);
  try {
    let cfg: unknown = readLayout(root).paramIds ?? {};
    if (existsSync(file)) {
      const parsed = parseJson<unknown>(readText(file));
      if (parsed === null) throw new Error(`${CONFIG} is not JSON`);
      cfg = parsed;
    }
    const { extensions, patterns } = idSettings(cfg);
    return {
      extensions: new RegExp(extensions ?? '\\.(cpp|h|hpp|cc|mm)$'),
      patterns: (patterns ?? DEFAULT_PATTERNS).map((p) => new RegExp(p, 'gm')),
    };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { error: `param-id-lock could not read its settings (${CONFIG}, or layout.json "paramIds"), so no parameter id was checked: ${why}\n` };
  }
}

function* sourcesOf(root: string, extensions: RegExp): Generator<string> {
  const output = readLayout(root).buildOutput;
  const skipped = Array.isArray(output) ? output.map(String) : [];
  for (const entry of readdirSync(root, { recursive: true })) {
    const rel = String(entry);
    if (!SKIP_DIRS.test(rel) && extensions.test(rel) && !matchesAny(rel, skipped)) yield join(root, rel);
  }
}

function collectIds(root: string, { extensions, patterns }: IdConfig): Set<string> {
  const ids = new Set<string>();
  for (const file of sourcesOf(root, extensions)) {
    const text = readText(file) ?? '';
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) ids.add(m[1] ?? '');
    }
  }
  return ids;
}

const lockFile = (root: string): string => join(root, '.claude', 'param-ids.lock.json');
const save = (root: string, ids: Iterable<string>): void => { writeJson(lockFile(root), [...ids].sort(), { pretty: true }); };
// The locked ids; a lock that is no list of ids is a fault, never an empty lock (it would be written over and every id forgotten).
function lockedIds(root: string): string[] {
  if (!existsSync(lockFile(root))) return [];
  const ids = readJson<unknown>(lockFile(root));
  if (!Array.isArray(ids)) throw new Error(`${lockFile(root)} is not a list of parameter ids`);
  return ids.map(String);
}

// KF-15: ids built from a table or a generator are invisible to the default patterns, and a lock with nothing in it protects nothing.
export function status(root: string): Verdict {
  const config = loadConfig(root);
  if ('error' in config) return { code: 1, stdout: config.error, stderr: '' };
  if (lockedIds(root).length || collectIds(root, config).size) return pass;
  for (const file of sourcesOf(root, config.extensions)) {
    if (!PARAMETER_WORDS.test(readText(file) ?? '')) continue;
    return {
      code: 1,
      stdout: `param-id-lock: ${relative(root, file)} makes parameters and the lock holds no ids, so it protects nothing. ` +
        `Say where the ids are in ${CONFIG} ("extensions", "patterns"), then \`node .claude/hooks/param-id-lock.mjs --init\`.\n`,
      stderr: '',
    };
  }
  return pass;
}

/** `--init`: the lock written from the project's sources; its words, and the exit code. */
export function init(root: string): Verdict {
  const config = loadConfig(root);
  if ('error' in config) return { code: 2, stdout: '', stderr: config.error };
  const ids = collectIds(root, config);
  save(root, ids);
  return { code: 0, stdout: `Locked ${ids.size} parameter IDs in ${relative(root, lockFile(root))}\n`, stderr: '' };
}

// The checkout's own lock only: main's lock may hold ids a worktree branch never had.
function judge(root: string, config: IdConfig): string | null {
  const current = collectIds(root, config);
  if (!existsSync(lockFile(root))) {
    if (current.size) save(root, current);
    return null;
  }

  const locked = new Set(lockedIds(root));
  const missing = [...locked].filter((id) => !current.has(id));
  if (missing.length > 0) {
    return `Parameter IDs removed or renamed: ${missing.join(', ')}\n` +
      'IDs never change once assigned (saved patches and host automation use them). ' +
      'Restore them; if a control changed meaning, add a NEW ID and migrate old patches in setStateInformation. ' +
      'See .claude/rules/parameter-ids-never-change.md\n';
  }

  const added = [...current].filter((id) => !locked.has(id));
  if (added.length > 0) save(root, new Set([...locked, ...added]));
  return null;
}

export const hook: Hook = (event, ctx) => {
  const main = ctx.projectDir;
  // Run by hand (no tool): the main checkout. Otherwise every checkout a write of an id file landed in.
  const files: (string | null)[] = event.tool_name ? writesOf(event, ctx.cwd, ctx.env).map((w) => w.path).filter((f) => insideProject(main, f, ctx.cwd)) : [null];
  const seen = new Set<string>();
  for (const file of files) {
    const root = file ? checkoutRoot(main, file, ctx.cwd) : main;
    if (seen.has(root)) continue;
    const config = loadConfig(file ? claudeRoot(main, file, ctx.cwd) : main);
    if ('error' in config) return refuse(config.error);
    if (file && !config.extensions.test(file)) continue; // not a file ids are written in
    seen.add(root);
    const said = judge(root, config);
    if (said) return refuse(said);
  }
  return pass;
};

const PARAMS = (...ids: string[]): string => ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n') + '\n';

/** A worktree that drops an id its own lock holds is refused, though main still has it (PostToolUse: the edit is already on disk).
 *  The steps after it (a new id joining the worktree's lock, never main's) read the lock files, and stay with the test's own case. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/src/params/Params.h': PARAMS('cutoff') },
  steps: [
    { label: 'a worktree that drops an id its lock holds', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/params/Params.h' } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/params/Params.h': PARAMS('cutoff', 'res') }, { folders: {}, concepts: {} });
  const unlocked = scratchProject({ 'src/params/Params.h': PARAMS('cutoff') }, { folders: {}, concepts: {} });
  const file = join(dir, 'src/params/Params.h');
  const post = (text: string): number | null => (put(file, text), runHook(hookFile, dir, writeOf(file, text)).status);
  const initStatus = runHook(hookFile, dir, null, ['--init']).status;
  const locked = (): string[] => readJson<string[]>(join(dir, '.claude/param-ids.lock.json'), []) ?? [];
  return verdicts('param-id-lock', [
    ['--init writes the lock', initStatus === 0 && locked().join() === 'cutoff,res', true],
    ['an id removed', post(PARAMS('cutoff')), 2],
    ['an id renamed', post(PARAMS('cutoff', 'resonance')), 2],
    ['an id added', post(PARAMS('cutoff', 'res', 'drive')), 0],
    ['the new id joins the lock', locked().includes('drive'), true],
    ['a project with no lock', runHook(hookFile, unlocked, writeOf(join(unlocked, 'src/params/Params.h'))).status, 0],
    ['the first id seen starts the lock', existsSync(join(unlocked, '.claude/param-ids.lock.json')), true],
    ['another project is not ours', runHook(hookFile, dir, writeOf(join(dirname(dir), 'elsewhere/Params.h'))).status, 0],
    ['--status: a lock with ids', runHook(hookFile, dir, null, ['--status']).status, 0],
  ]);
}

// `--init` and `--status` are by-hand modes (doctor runs `--status`): their words go to the process's streams.
if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'param-id-lock', hook, selftest, {
  flags: {
    '--status': () => { const v = status(contextOf().projectDir); writeVerdict(v); return v.code; },
    '--init': () => { const v = init(contextOf().projectDir); writeVerdict(v); return v.code; },
  },
});
