// `claude-packs workorder <name>`: the three files a project needs to build on its own, from what two whole builds taught: the order, the prompt that runs
// it with nobody there, and the runner that starts session after session. The steps are the author's; the `write-a-workorder` skill says how to write them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitCommand } from './kit-command.mjs';

const TEMPLATES = fileURLToPath(new URL('../prompts/workorder/', import.meta.url));
const FILES = ['workorder.md', 'PROMPT.md', 'run.sh'];

// The steps a work order starts from: `workorder.md` is the blank one; `workorder-<kind>.md` beside it is one taught by builds of
// that kind (`rebuild`: a hardware instrument rebuilt as a plugin, from four rebuilds), chosen with --template <kind>.
export const workorderTemplates = () => readdirSync(TEMPLATES).map((f) => f.match(/^workorder-([\w-]+)\.md$/)?.[1]).filter(Boolean).sort();

export function newWorkorder(dir, name, { log = console.log, template = null } = {}) {
  if (!name || !/^[\w.-]+$/.test(name)) throw new Error(`name the work order: \`${kitCommand(dir)} workorder <name>\``);
  if (template && !workorderTemplates().includes(template)) {
    throw new Error(`no work order template "${template}": the kit has ${workorderTemplates().join(', ')}. Nothing was written`);
  }
  const folder = join(dir, 'docs', 'workorders', name);
  if (existsSync(folder)) throw new Error(`docs/workorders/${name} already exists: nothing was written`);
  mkdirSync(folder, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  for (const file of FILES) {
    const source = file === 'workorder.md' && template ? `workorder-${template}.md` : file;
    const text = readFileSync(join(TEMPLATES, source), 'utf8').replaceAll('{{name}}', name).replaceAll('{{date}}', date);
    writeFileSync(join(folder, file), text, { mode: file.endsWith('.sh') ? 0o755 : 0o644 });
  }
  log(`Work order: docs/workorders/${name}/`);
  log('  1. Write the steps in workorder.md, with Claude if you like: the write-a-workorder skill says how.');
  log(`  2. To watch it, type in Claude Code: Run docs/workorders/${name}/PROMPT.md`);
  log(`  3. To leave it running, read run.sh, then: bash docs/workorders/${name}/run.sh`);
  return 0;
}
