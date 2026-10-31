#!/usr/bin/env node
// Locks parameter IDs: once seen, an ID may never disappear from the source.
//   node param-id-lock.mjs --init   create .claude/param-ids.lock.json from the current repo
//   (as PostToolUse hook)           fail (exit 2) if a locked ID is gone; add new IDs to the lock
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { insideProject } from './lib/project.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LOCK = join(ROOT, '.claude', 'param-ids.lock.json');
const CONFIG = join(ROOT, '.claude', 'param-ids.config.json');
const SKIP_DIRS = /(^|\/)(build|Builds|JuceLibraryCode|JUCE|node_modules|\.git|cmake-build[^/]*)(\/|$)/;

const DEFAULT_PATTERNS = [
  'ParameterID\\s*(?:[A-Za-z_]\\w*\\s*)?[({]\\s*"([^"]+)"',
  'AudioParameter(?:Float|Int|Bool|Choice)\\s*>?\\s*\\(\\s*"([^"]+)"',
];

function loadConfig() {
  const cfg = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : {};
  return {
    extensions: new RegExp(cfg.extensions ?? '\\.(cpp|h|hpp|cc|mm)$'),
    patterns: (cfg.patterns ?? DEFAULT_PATTERNS).map((p) => new RegExp(p, 'g')),
  };
}

function collectIds({ extensions, patterns }) {
  const ids = new Set();
  for (const entry of readdirSync(ROOT, { recursive: true })) {
    const rel = String(entry);
    if (SKIP_DIRS.test(rel) || !extensions.test(rel)) continue;
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) ids.add(m[1]);
    }
  }
  return ids;
}

const save = (ids) => writeFileSync(LOCK, JSON.stringify([...ids].sort(), null, 2) + '\n');

function main() {
  if (process.argv.includes('--init')) {
    const ids = collectIds(loadConfig());
    save(ids);
    console.log(`Locked ${ids.size} parameter IDs in ${relative(ROOT, LOCK)}`);
    return 0;
  }

  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    // run by hand without stdin
  }
  const file = payload.tool_input?.file_path;
  if (file && !insideProject(file)) return 0; // another project's edit: not ours to rescan
  const current = collectIds(loadConfig());
  if (!existsSync(LOCK)) return 0;

  const locked = new Set(JSON.parse(readFileSync(LOCK, 'utf8')));
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
  if (added.length > 0) save(new Set([...locked, ...added]));
  return 0;
}

process.exit(main());
