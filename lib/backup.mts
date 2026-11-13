// Before every install or update, copies the files the package writes into (CLAUDE.md,
// settings.json, layout.json, the lock) to .claude/.claude-packs-backup/<timestamp>/.
// Keeps the last 5 backups.
import { appendFileSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ensureDir, readText, slash } from '../packs/base/hooks/lib/files.mts';

const DIR = join('.claude', '.claude-packs-backup');
const KEEP = 5;
const FILES = ['CLAUDE.md', '.claude/settings.json', '.claude/layout.json', '.claude/claude-packs.lock.json'];

/** Copies the managed files into a new stamped backup folder, drops all but the last 5; the folder, relative to the project. */
export function backup(projectDir: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(projectDir, DIR, stamp);
  for (const rel of FILES) {
    const src = join(projectDir, rel);
    if (!existsSync(src)) continue;
    ensureDir(dirname(join(target, rel)));
    copyFileSync(src, join(target, rel));
  }
  const all = existsSync(join(projectDir, DIR)) ? readdirSync(join(projectDir, DIR)).sort() : [];
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) rmSync(join(projectDir, DIR, old), { recursive: true, force: true });
  return join(DIR, stamp);
}

/** Where makers' documents are read (a reverse-engineering project, a synth): their PDFs are never committed (the user, 2026-11-13,
 *  after putting the DSP56300 Family Manual in a project's docs/). Only there: a project that ships its own PDFs keeps them. */
export const MAKER_DOCS: readonly string[] = ['*.pdf', '*.PDF'];

/** Adds the backup folder, the hooks' run state (.claude/state: frozen list, last test log) and brief-guard's refusal counter
 *  (.claude/usage.log, 0.9.2) to .gitignore, and `extra` lines (MAKER_DOCS where makers' documents are read) (appends; never
 *  rewrites the file). */
export function ensureGitignore(projectDir: string, extra: readonly string[] = []): void {
  const file = join(projectDir, '.gitignore');
  for (const line of [`${slash(DIR)}/`, '.claude/state/', '.claude/checks.compiled.json', '.claude/usage.log', '.claude/hooks.log', '.claude/logs/', ...extra]) {
    const text = readText(file) ?? '';
    if (text.split('\n').includes(line)) continue;
    appendFileSync(file, `${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`);
  }
}
