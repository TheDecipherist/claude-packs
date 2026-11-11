// The template of every kind of pack content (typescript order W7 (a), survey pack-content.md section 4): one canonical form for a rule,
// a lesson check, a skill, a hook and a pack.json. `new-pack` scaffolds a pack from it and `add-lesson-check` writes one check from
// it; test/pack-content.test.mts holds every scaffold to the conformance gate, so the template and the gate cannot drift apart.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { selftest as proveChecks } from '../packs/base/hooks/lesson-checks.mts';
import type { Check } from '../packs/base/hooks/lesson-checks.mts';
import type { LessonCheck } from '../packs/base/hooks/lib/types.d.mts';

/** The globs every check leaves out: tests, builds and the project's own `.claude` (321 checks carried this list by hand). */
export const EXCLUDE: readonly string[] = [
  '**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '.claude/**', '**/.claude/**',
  '**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**',
];

/** What `scan` files a check under. */
export const KINDS: readonly string[] = ['security', 'correctness', 'quality', 'performance', 'failures and lost data'];

const lines = (rows: readonly string[]): string => `${rows.join('\n')}\n`;
const json = (value: unknown): string => `${toJson(value, { pretty: true })}\n`;

// ---- Rule ----

export interface RuleSpec {
  /** The concept the rule loads on (one the pack's `concepts`, a configuration or the layout defines). */
  concept: string;
  /** One line that states the law, at most 110 characters. */
  title: string;
  /** The reason, one or two sentences, stated as a fact; the gate does not require it. */
  reason?: string;
  always: readonly string[];
  never: readonly string[];
  /** The ids of the checks that point here, and the sentence for each. */
  checks?: Readonly<Record<string, string>>;
}

const bullets = (rows: readonly string[]): string[] => rows.map((row) => `- ${row}`);
const checkLines = (checks: Readonly<Record<string, string>>): string[] => Object.entries(checks).map(([id, what]) => `\`${id}\` ${what}`);

export function ruleText(spec: RuleSpec): string {
  const checks = Object.keys(spec.checks ?? {}).length > 0 ? ['', '## Check', ...checkLines(spec.checks ?? {})] : [];
  return lines([
    '---', `# concepts: ${spec.concept}`, 'paths:', '  - "placeholder"', '---', '',
    `# ${spec.title}`, '',
    ...(spec.reason === undefined ? [] : [spec.reason, '']),
    '<constraints>', 'Always do:', ...bullets(spec.always), '', 'Never do:', ...bullets(spec.never), '</constraints>',
    ...checks,
  ]);
}

/** A rule's text with the check named in its `## Check` section (made when it has none): a rule names every check that points at it. */
export function nameCheckInRule(text: string, id: string, what: string): string {
  if (text.includes(`\`${id}\``)) return text;
  const entry = `\`${id}\` ${what}`;
  const at = text.search(/^## Checks?\s*$/m);
  if (at < 0) return `${text.trimEnd()}\n\n## Check\n${entry}\n`;
  const head = text.slice(at);
  const next = head.slice(1).search(/^## /m);
  const end = next < 0 ? text.length : at + 1 + next;
  return `${text.slice(0, end).trimEnd()}\n${entry}\n${next < 0 ? '' : `\n${text.slice(end)}`}`;
}

// ---- Lesson check ----

export interface CheckSpec {
  id: string;
  why: string;
  /** The rule's file name, `<name>.md`: it is written as `.claude/rules/<name>.md`. */
  rule: string;
  globs: readonly string[];
  pattern: string;
  bad: string;
  good: string;
  kind?: string;
  /** `code` blanks comments and strings before the pattern is read (the default for a check on code). */
  code?: boolean;
  exclude?: readonly string[];
}

/** One check in the order its fields are read: id, why, rule, globs, exclude, code, pattern, kind, bad, good. */
export function checkObject(spec: CheckSpec): LessonCheck {
  return {
    id: spec.id,
    why: spec.why,
    rule: `.claude/rules/${spec.rule.replace(/^.*\//, '')}`,
    globs: spec.globs,
    exclude: spec.exclude ?? EXCLUDE,
    code: spec.code ?? true,
    pattern: spec.pattern,
    kind: spec.kind ?? 'correctness',
    bad: spec.bad,
    good: spec.good,
  };
}

/** The problems of a check as the lesson-checks hook proves it: its `bad` is caught, its `good` passes, its fields are whole. */
export function proofOf(spec: CheckSpec): string[] {
  const check: Check = { ...checkObject(spec), file: `${spec.id}.json` };
  const kind = check.kind ?? '';
  const problems = proveChecks([check]);
  return [...problems, ...(KINDS.includes(kind) ? [] : [`${spec.id}: kind "${kind}" is not one of ${KINDS.join(', ')}`]), ...(spec.good.length < 25 ? [`${spec.id}: "good" is a stub: show the real fix of "bad"`] : [])];
}

/** Writes one check into `folder` (a project's `.claude/checks`, or a pack's `checks`) after its examples are proved, and names it in the rule. */
export function addCheck(folder: string, rulesFolder: string, spec: CheckSpec): string {
  if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error(`name the check in lower case with hyphens: ${spec.id}`);
  const file = join(folder, `${spec.id}.json`);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  const rule = join(rulesFolder, spec.rule.replace(/^.*\//, ''));
  const ruleBody = readText(rule);
  if (ruleBody === null) throw new Error(`the rule ${rule} does not exist: write the rule first (the check points at it)`);
  const problems = proofOf(spec);
  if (problems.length > 0) throw new Error(problems.join('; '));
  put(file, json(checkObject(spec)));
  put(rule, nameCheckInRule(ruleBody, spec.id, `refuses an edit that adds what this rule forbids: ${spec.why.split('. ')[0] ?? spec.why}.`));
  return file;
}

// ---- Skill ----

export interface SkillSpec { name: string; when: string; job: string; title: string; steps: readonly string[]; never: readonly string[]; output: string }

export function skillText(spec: SkillSpec): string {
  return lines([
    '---', `name: ${spec.name}`, `description: Use when ${spec.when}.`, '---', '',
    `# ${spec.title} (one job: ${spec.job})`, '',
    '<constraints>', 'Always do:', ...spec.steps.map((step, i) => `${i + 1}. ${step}`), '', 'Never do:', ...bullets(spec.never), '</constraints>', '',
    '## Output', spec.output,
  ]);
}

// ---- Hook ----

/** A hook of a custom pack: plain JavaScript on the installed hook library, on `runAsHook`, with its selftest and its worktree case. */
export function hookText(name: string): string {
  const id = `${name}-example`;
  return lines([
    `// ${id} (PreToolUse, Bash): refuses a command that runs \`old-command\`. A judge: it writes nothing. Replace the pattern and the`,
    '// refusal with the law this hook holds, keep the selftest rows (the fault planted, the correct case passed, nothing written).',
    "import { fileURLToPath } from 'node:url';",
    "import { runAsHook } from './lib/hook-log.mjs';",
    "import { bashOf, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mjs';",
    "import { judgeVerdict } from './lib/writes.mjs';",
    '',
    'const FORBIDDEN = /\\bold-command\\b/;',
    '',
    '/** The reason a command is refused, or null. */',
    'export const refusal = (command) => (FORBIDDEN.test(command) ? `BLOCKED by ' + id + ': old-command is retired; use new-command.\\n` : null);',
    '',
    `export const hook = (event, ctx) => judgeVerdict(event, { name: '${id}', command: refusal }, ctx);`,
    '',
    '/** The hook judges a command in a worktree as in the main checkout. */',
    'export const worktreeCase = {',
    '  steps: [',
    "    { label: 'the forbidden command after a cd into the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && old-command --now' } }, want: 2 },",
    "    { label: 'another command in the worktree passes', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && ls' } }, want: 0 },",
    '  ],',
    '};',
    '',
    'export function selftest() {',
    '  const hookFile = fileURLToPath(import.meta.url);',
    "  const dir = scratchProject({ 'a.txt': 'one\\n' });",
    '  const before = snapshot(dir);',
    '  const sh = (command) => runHook(hookFile, dir, bashOf(command, dir)).status;',
    `  return verdicts('${id}', [`,
    "    ['the forbidden command is refused', sh('old-command --now'), 2],",
    "    ['another command passes', sh('ls'), 0],",
    "    ['a command that only starts with the word passes', sh('./tools/old-commander.sh'), 0],",
    "    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],",
    '  ]);',
    '}',
    '',
    `await runAsHook(import.meta.url, '${id}', hook, selftest);`,
  ]);
}

// ---- pack.json ----

export interface PackSpec { name: string; author: string; repo: string; withHook: boolean }

/** A custom pack's manifest: every key of a stock pack, the concept its example rule loads on, and the hook row when there is a hook. */
export function packJson(spec: PackSpec): Record<string, unknown> {
  const id = `${spec.name}-example`;
  return {
    name: spec.name,
    version: '0.1.0',
    description: `What ${spec.name} is for.`,
    type: 'custom',
    fits: [],
    requires: [],
    tests: {},
    author: spec.author,
    license: 'UNLICENSED',
    homepage: spec.repo,
    repository: { type: 'git', url: spec.repo, directory: `packs/${spec.name}` },
    keywords: [spec.name, 'team'],
    engines: { 'claude-packs': '>=2.0.0' },
    folders: {},
    concepts: { [spec.name]: ['src/**'] },
    skillsIn: null,
    hooks: spec.withHook
      ? { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${id}.mjs"`, role: 'judge', order: 100, timeout: 10 }] }] }
      : {},
  };
}

// ---- The pack ----

/** The files of a new pack, by path under the repository: pack.json, an example rule, check and skill (and a hook when asked). */
export function packFiles(spec: PackSpec): Record<string, string> {
  const { name } = spec;
  const id = `${name}-example`;
  const base = `packs/${name}`;
  const rule = ruleText({
    concept: name,
    title: 'State the law in one line, at most 110 characters',
    reason: 'The reason, stated as a fact: what went wrong without the law.',
    always: ['What the rule asks for, as one action.'],
    never: ['What it refuses, as one refusal.'],
    checks: { [id]: 'refuses an edit that adds the old API name.' },
  });
  const check = json(checkObject({
    id,
    why: 'The old API name is retired; a call to it is refused at edit time.',
    rule: `${id}.md`,
    globs: ['**/*.ts', '**/*.js'],
    pattern: '\\bOLD_API_NAME\\b',
    kind: 'quality',
    bad: 'OLD_API_NAME();\n',
    good: 'newApiName();   // the new name replaces the retired one\n',
  }));
  const skill = skillText({
    name: id,
    when: 'the situation this skill is for comes up',
    job: 'what it does and nothing else',
    title: 'Name the job',
    steps: ['The first step, as one action.'],
    never: ['What goes wrong without this skill.'],
    output: 'What to say when it is done, in one or two lines.',
  });
  return {
    [`${base}/pack.json`]: json(packJson(spec)),
    [`${base}/rules/${id}.md`]: rule,
    [`${base}/checks/${id}.json`]: check,
    [`${base}/skills/${id}/SKILL.md`]: skill,
    ...(spec.withHook ? { [`${base}/hooks/${id}.mjs`]: hookText(name) } : {}),
  };
}
