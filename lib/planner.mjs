// The planner-skills generator (0.10.0, STEP 3 item 5; KWB-35): one project-layout skill body per configuration, made
// from that configuration's layout template, its packs and its preamble, for a planner that briefs work before any project
// of that kind exists (or without reading one). `claude-packs planner-skills` prints them; `--out <dir>` writes
// <dir>/<configuration>/project-layout/SKILL.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { availableConfigs, itemsOf, planOf, readConfig } from './configs.mjs';

export function plannerSkill(name) {
  const c = readConfig(name);
  const folders = c.layout?.folders ?? {};
  const where = (k) => (folders[k.in] ? `${folders[k.in].path}/` : k.in);
  const items = itemsOf(planOf(c, [...c.packs.always, ...c.packs.default]));
  return [
    '---',
    'name: project-layout',
    `description: Use when planning, briefing or placing work in a ${name} project: where a new file, folder or kind of thing goes, and which laws hold there.`,
    '---',
    `# Project layout: ${name}`,
    '',
    c.description,
    '',
    '## Folders',
    '',
    ...Object.values(folders).map((f) => `- \`${f.path}/\`: ${f.purpose}`),
    '',
    ...(Object.keys(c.layout?.kinds ?? {}).length ? ['## What goes where', '', ...Object.values(c.layout.kinds).map((k) => `- ${k.what} → \`${where(k)}\``), ''] : []),
    '## What it installs',
    '',
    `- packs: ${c.packs.always.join(', ')}${c.packs.choose.length ? `; to choose: ${c.packs.choose.join(', ')}` : ''}`,
    `- hooks: ${items.hooks.join(', ')}`,
    `- skills: ${items.skills.join(', ') || 'none'}`,
    `- rules: ${items.rules.length} (\`npx --no-install @thedecipherist/claude-packs configs\` lists the configurations)`,
    '',
    '## House rules',
    '',
    '<constraints>',
    'Always do:',
    '- Put every kind of thing in its one place (the folders above); a new folder goes into `.claude/layout.json` first.',
    ...c.preamble.always.map((l) => `- ${l}`),
    '',
    'Never do:',
    ...c.preamble.never.map((l) => `- ${l}`),
    '</constraints>',
    '',
  ].join('\n');
}

export function plannerSkills(out = null, log = console.log) {
  for (const name of availableConfigs()) {
    const body = plannerSkill(name);
    if (!out) { log(`==> ${name}/project-layout/SKILL.md\n${body}`); continue; }
    const dir = join(out, name, 'project-layout');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), body);
    log(`  wrote ${join(dir, 'SKILL.md')}`);
  }
  return 0;
}
