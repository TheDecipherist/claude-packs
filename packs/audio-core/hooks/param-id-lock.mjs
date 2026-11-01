#!/usr/bin/env node
// Locks parameter IDs: once seen, an ID may never disappear from the source.
//   node param-id-lock.mjs --init   create .claude/param-ids.lock.json from the current repo
//   (as PostToolUse hook)           fail (exit 2) if a locked ID is gone; add new IDs to the lock. Every route that
//                                   writes is judged (Write, Edit, MultiEdit, NotebookEdit, and the shell's >, >>, tee,
//                                   sed -i, cp, mv, rm, a heredoc; lib/writes.mjs): an id deleted by `sed -i` is gone too.
//   node param-id-lock.mjs --selftest  proves it
// Where IDs are read: .claude/param-ids.config.json, else layout.json "paramIds", else JUCE
// ParameterID / AudioParameter* string literals. Both forms: { "extensions": "<regex>", "patterns": ["<regex with one group>"] }.
// A file is judged in its own checkout: an agent worktree is scanned, and keeps its lock, on its own.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mjs';
import { writesOf } from './lib/writes.mjs';
import { put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// .claude is skipped so the worktrees under .claude/worktrees/ never stand in for this checkout's code.
const SKIP_DIRS = /(^|\/)(build|Builds|JuceLibraryCode|JUCE|node_modules|\.git|\.claude|cmake-build[^/]*)(\/|$)/;

const DEFAULT_PATTERNS = [
  'ParameterID\\s*(?:[A-Za-z_]\\w*\\s*)?[({]\\s*"([^"]+)"',
  'AudioParameter(?:Float|Int|Bool|Choice)\\s*>?\\s*\\(\\s*"([^"]+)"',
];

function loadConfig(root) {
  const file = join(root, '.claude', 'param-ids.config.json');
  const cfg = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : readLayout(root).paramIds ?? {};
  return {
    extensions: new RegExp(cfg.extensions ?? '\\.(cpp|h|hpp|cc|mm)$'),
    patterns: (cfg.patterns ?? DEFAULT_PATTERNS).map((p) => new RegExp(p, 'g')),
  };
}

function collectIds(root, { extensions, patterns }) {
  const ids = new Set();
  for (const entry of readdirSync(root, { recursive: true })) {
    const rel = String(entry);
    if (SKIP_DIRS.test(rel) || !extensions.test(rel)) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) ids.add(m[1]);
    }
  }
  return ids;
}

const lockFile = (root) => join(root, '.claude', 'param-ids.lock.json');
const save = (root, ids) => writeFileSync(lockFile(root), JSON.stringify([...ids].sort(), null, 2) + '\n');

function main() {
  if (process.argv.includes('--init')) {
    const ids = collectIds(ROOT, loadConfig(ROOT));
    save(ROOT, ids);
    console.log(`Locked ${ids.size} parameter IDs in ${relative(ROOT, lockFile(ROOT))}`);
    return 0;
  }

  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    // run by hand without stdin
  }
  // Run by hand (no tool): the main checkout. Otherwise every checkout a write of an id file landed in.
  const files = payload.tool_name ? writesOf(payload).map((w) => w.path).filter((f) => insideProject(f)) : [null];
  const seen = new Set();
  for (const file of files) {
    const root = file ? checkoutRoot(file) : ROOT;
    if (seen.has(root)) continue;
    const config = loadConfig(file ? claudeRoot(file) : ROOT);
    if (file && !config.extensions.test(file)) continue; // not a file ids are written in
    seen.add(root);
    const code = judge(root, config);
    if (code) return code;
  }
  return 0;
}

// The checkout's own lock only: main's lock may hold ids a worktree branch never had.
function judge(root, config) {
  if (!existsSync(lockFile(root))) return 0;
  const current = collectIds(root, config);

  const locked = new Set(JSON.parse(readFileSync(lockFile(root), 'utf8')));
  const missing = [...locked].filter((id) => !current.has(id));
  if (missing.length > 0) {
    process.stderr.write(
      `Parameter IDs removed or renamed: ${missing.join(', ')}\n` +
        'IDs never change once assigned (saved patches and host automation use them). ' +
        'Restore them; if a control changed meaning, add a NEW ID and migrate old patches in setStateInformation. ' +
        'See .claude/rules/parameter-ids-never-change.md\n',
    );
    return 2;
  }

  const added = [...current].filter((id) => !locked.has(id));
  if (added.length > 0) save(root, new Set([...locked, ...added]));
  return 0;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const params = (...ids) => ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n') + '\n';
  const dir = scratchProject({ 'src/params/Params.h': params('cutoff', 'res') }, { folders: {}, concepts: {} });
  const unlocked = scratchProject({ 'src/params/Params.h': params('cutoff') });
  const file = join(dir, 'src/params/Params.h');
  const post = (text) => (put(file, text), runHook(hook, dir, writeOf(file, text)));
  const initStatus = runHook(hook, dir, null, ['--init']);
  const locked = () => JSON.parse(readFileSync(join(dir, '.claude/param-ids.lock.json'), 'utf8'));
  const cases = [
    ['--init writes the lock', initStatus === 0 && locked().join() === 'cutoff,res', true],
    ['an id removed', post(params('cutoff')), 2],
    ['an id renamed', post(params('cutoff', 'resonance')), 2],
    ['an id added', post(params('cutoff', 'res', 'drive')), 0],
    ['the new id joins the lock', locked().includes('drive'), true],
    ['a project with no lock', runHook(hook, unlocked, writeOf(join(unlocked, 'src/params/Params.h'))), 0],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/Params.h'))), 0],
  ];
  return verdicts('param-id-lock', cases);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
