// `workorder compile <name> <step>[.<item>]`: one task of a work order as the prompt a fresh session runs, with every skill it needs
// compiled in (the user, 2026-11-14: "its not even a skill anymore but all the skills are now instructions that are part of the actual
// workorder"; "and of course the entire skill if there are things outside constraints ... it should just inject the whole thing"). The
// task's text first; then ONE <constraints> block: the order's own Always do and Never do lines, then each skill on the step's
// **Skills:** line WHOLE (its body without the frontmatter, and every side file in its folder), read from the project's installed skills
// (so a kit fix reaches the next task). A side file of another skill that a compiled skill names (`gather-sources/datasheet-sources.md`)
// comes in too, so no line of the task points at text the task does not hold. Each compile is logged to .claude/logs/compiled.jsonl, so
// a skill's use is still tracked by name. A skill the step names that is not installed stops the compile.
import { appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';

export interface CompiledTask { prompt: string; skills: string[]; task: string }

const STEP = /^## ([A-Z]+\d+[a-z]?)\. .*$/gm;
const ITEM = /^(\d+)\. /m;

/** An Always do / Never do split of one <constraints> block's lines: numbered steps become bullets, continuation lines stay with them. */
export function constraintLines(block: string): { always: string[]; never: string[] } {
  const [a = '', n = ''] = block.split(/^Never do:\s*$/m);
  const lines = (part: string, head: string): string[] => part.replace(new RegExp(`^\\s*${head}:\\s*$`, 'm'), '').split('\n').filter((l) => l.trim());
  return { always: lines(a, 'Always do').map((l) => l.replace(/^(\d+)\.\s/, '- ')), never: lines(n, 'Never do') };
}

const firstBlock = (text: string): string => text.match(/<constraints>([\s\S]*?)<\/constraints>/)?.[1] ?? '';

/** The step's section, or with an item number only its lead, that item and its Done when. */
export function taskText(order: string, task: string): string {
  const [id, item] = task.split('.');
  const heads = [...order.matchAll(STEP)];
  const at = heads.findIndex((m) => m[1] === id);
  if (at < 0) throw new Error(`the order has no step ${id} (its steps: ${heads.map((m) => m[1]).join(', ')})`);
  const start = heads[at]?.index ?? 0;
  const section = order.slice(start, heads[at + 1]?.index ?? order.length).replace(/\n---\s*$/, '').trimEnd();
  if (!item) return section;
  const lead = section.split(ITEM)[0] ?? '';
  const items = [...section.matchAll(/^(\d+)\. [\s\S]*?(?=^\d+\. |^\*\*Done when:\*\*|(?![\s\S]))/gm)];
  const one = items.find((m) => m[1] === item);
  if (!one) throw new Error(`step ${id} has no item ${item} (its items: ${items.map((m) => m[1]).join(', ')})`);
  const done = section.match(/^\*\*Done when:\*\*[\s\S]*$/m)?.[0] ?? '';
  return `${lead.trimEnd()}\n\n${one[0].trimEnd()}\n\n${done}`.trimEnd();
}

/** The skills a step names on its **Skills:** line. */
export const stepSkills = (section: string): string[] => [...(section.match(/^\*\*Skills:\*\*(.*)$/m)?.[1] ?? '').matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1] ?? '');

const FRONT = /^---\n[\s\S]*?\n---\n/;
/** A skill's text as it goes into a task: no frontmatter, and its own <constraints> tags dropped (their lines stay), so the task has one block. */
export const skillBody = (text: string): string => text.replace(FRONT, '').replace(/<\/?constraints>/g, '').replace(/\n{3,}/g, '\n\n').trim();

/** The side files of an installed skill: every file in its folder but SKILL.md, by name. */
function sideFiles(dir: string, skill: string): string[] {
  const at = join(dir, '.claude', 'skills', skill);
  return existsSync(at) ? readdirSync(at).filter((f) => f !== 'SKILL.md' && /\.(md|txt|json)$/.test(f)).sort() : [];
}

/** Side files of skills NOT compiled whole that the text names as `<skill>/<file>`: they come in on their own. */
function namedSideFiles(dir: string, text: string, whole: readonly string[]): [string, string][] {
  const out: [string, string][] = [];
  for (const m of text.matchAll(/([a-z0-9-]+)\/([A-Za-z0-9._-]+\.(?:md|txt|json))/g)) {
    const [, skill = '', file = ''] = m;
    if (whole.includes(skill) || !sideFiles(dir, skill).includes(file) || out.some(([s, f]) => s === skill && f === file)) continue;
    out.push([skill, file]);
  }
  return out;
}

/** Compile one task of docs/workorders/<name>/workorder.md in project `dir`. */
export function compileTask(dir: string, name: string, task: string): CompiledTask {
  const order = readText(join(dir, 'docs', 'workorders', name, 'workorder.md'));
  if (order === null) throw new Error(`no order at docs/workorders/${name}/workorder.md`);
  const text = taskText(order, task);
  const skills = stepSkills(text);
  const own = constraintLines(firstBlock(order.split(/^## /m)[0] ?? ''));
  const parts: string[] = [];
  for (const s of skills) {
    const body = readText(join(dir, '.claude', 'skills', s, 'SKILL.md'));
    if (body === null) throw new Error(`step ${task} names the skill \`${s}\`, which this project has not installed`);
    parts.push(`## The skill \`${s}\`\n\n${skillBody(body)}`);
    for (const f of sideFiles(dir, s)) parts.push(`### \`${s}/${f}\` (beside the skill)\n\n${skillBody(readText(join(dir, '.claude', 'skills', s, f)) ?? '')}`);
  }
  for (const [s, f] of namedSideFiles(dir, parts.join('\n'), skills)) {
    parts.push(`### \`${s}/${f}\` (named by a skill above)\n\n${skillBody(readText(join(dir, '.claude', 'skills', s, f)) ?? '')}`);
  }
  const title = order.match(/^# .*$/m)?.[0] ?? `# ${name}`;
  const prompt = `${title}: task ${task}\n\nCompiled by \`workorder compile\` with the skills ${skills.map((s) => `\`${s}\``).join(', ') || '(none)'}: each is below, whole, part of this task.\n\n`
    + `${text}\n\n<constraints>\nAlways do:\n${own.always.join('\n')}\n\nNever do:\n${own.never.join('\n')}\n\n${parts.join('\n\n')}\n</constraints>\n`;
  try {
    mkdirSync(join(dir, '.claude', 'logs'), { recursive: true });
    appendFileSync(join(dir, '.claude', 'logs', 'compiled.jsonl'), `${toJson({ t: new Date().toISOString(), order: name, task, skills })}\n`);
  } catch { /* the prompt matters more than its log line */ }
  return { prompt, skills, task };
}
