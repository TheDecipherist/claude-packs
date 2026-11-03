// Before every install or update, copies the files the package writes into (CLAUDE.md,
// settings.json, layout.json, the lock) to .claude/.claude-packs-backup/<timestamp>/.
// Keeps the last 5 backups.
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join('.claude', '.claude-packs-backup');
const KEEP = 5;
const FILES = ['CLAUDE.md', '.claude/settings.json', '.claude/layout.json', '.claude/claude-packs.lock.json'];

export function backup(projectDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(projectDir, DIR, stamp);
  for (const rel of FILES) {
    const src = join(projectDir, rel);
    if (!existsSync(src)) continue;
    mkdirSync(join(target, rel, '..'), { recursive: true });
    copyFileSync(src, join(target, rel));
  }
  const all = existsSync(join(projectDir, DIR)) ? readdirSync(join(projectDir, DIR)).sort() : [];
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) rmSync(join(projectDir, DIR, old), { recursive: true, force: true });
  return join(DIR, stamp);
}

// Adds the backup folder, the hooks' run state (.claude/state: frozen list, last test log) and brief-guard's refusal counter
// (.claude/usage.log, 0.9.2) to .gitignore (appends; never rewrites the file).
export function ensureGitignore(projectDir) {
  const file = join(projectDir, '.gitignore');
  for (const line of [`${DIR.replace(/\\/g, '/')}/`, '.claude/state/', '.claude/usage.log', '.claude/hooks.log']) {
    const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (text.split('\n').includes(line)) continue;
    appendFileSync(file, `${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`);
  }
}
