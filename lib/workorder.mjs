// `claude-packs workorder <name>`: the three files a project needs to build on its own, from what two whole builds taught: the order, the prompt that runs
// it with nobody there, and the runner that starts session after session. The steps are the author's; the `write-a-workorder` skill says how to write them.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitCommand } from './kit-command.mjs';

const TEMPLATES = fileURLToPath(new URL('../prompts/workorder/', import.meta.url));
const FILES = ['workorder.md', 'PROMPT.md', 'run.sh'];

export function newWorkorder(dir, name, { log = console.log } = {}) {
  if (!name || !/^[\w.-]+$/.test(name)) throw new Error(`name the work order: \`${kitCommand(dir)} workorder <name>\``);
  const folder = join(dir, 'docs', 'workorders', name);
  if (existsSync(folder)) throw new Error(`docs/workorders/${name} already exists: nothing was written`);
  mkdirSync(folder, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  for (const file of FILES) {
    const text = readFileSync(join(TEMPLATES, file), 'utf8').replaceAll('{{name}}', name).replaceAll('{{date}}', date);
    writeFileSync(join(folder, file), text, { mode: file.endsWith('.sh') ? 0o755 : 0o644 });
  }
  log(`Work order: docs/workorders/${name}/`);
  log('  1. Write the steps in workorder.md, with Claude if you like: the write-a-workorder skill says how.');
  log(`  2. To watch it, type in Claude Code: Run docs/workorders/${name}/PROMPT.md`);
  log(`  3. To leave it running, read run.sh, then: bash docs/workorders/${name}/run.sh`);
  return 0;
}
