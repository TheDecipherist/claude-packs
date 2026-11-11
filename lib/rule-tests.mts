// KF-31: a rule's Check can name a test, and an install reads as if the test exists. Three rules of the MPX 500 named tests that were never written, and
// the gap held four real bugs while every hook, scan and doctor stayed quiet. doctor is red for a live rule (one that matches a file of the project)
// whose Check names a test nothing answers to. A test answers by naming the rule (`proves: <rule>`, in a test, bench or gate file), or layout.json
// "ruleTests" points the rule at a file, or declines it with "none: <reason>".
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';

const TEST_PLACE = /(^|\/)(tests?|specs?|e2e|bench|benches|benchmarks?|gates?)(\/|$)|(^|[._-])(test|spec)[._-][^/]*$|_test\.[^/]+$/i;
const MAX_BYTES = 2 * 1024 * 1024;
const checkOf = (text: string): string => text.split(/^## Check[ \t]*$/m)[1]?.split(/^## /m)[0] ?? '';

/** "Test:", "Tests:", "- Unit test:", "ThreadSanitizer stress test:", "Benchmark test, offline render:" at the head of a line of the Check. */
export const namesATest = (text: string): boolean => /^[ \t]*(?:(?:[-*]|\d+\.)[ \t]+)?(?:[\w'-]+[ \t]+){0,3}tests?(?:,[^:\n]*)?:/im.test(checkOf(text));

// A file's text, or '' for one too big to be a test (files.mts reads at most 8 MB; a test is far smaller) or gone since it was listed.
const smallFileText = (file: string): string => {
  const text = readText(file);
  return text === null || Buffer.byteLength(text) > MAX_BYTES ? '' : text;
};
const inTestFolder = (rel: string, folders: readonly string[]): boolean => TEST_PLACE.test(rel) || folders.some((f) => rel === f || rel.startsWith(`${f}/`));

/** A project's layout with the one key this check reads. */
type RuleTestsLayout = Layout & { ruleTests?: Record<string, string> };

export interface RuleTestsInput { liveRules: readonly string[]; files: readonly string[] }

/** The doctor problems for the live rules whose Check names a test nothing in the project answers to. */
export function ruleTestProblems(projectDir: string, layout: RuleTestsLayout, { liveRules, files }: RuleTestsInput): string[] {
  const dir = join(projectDir, '.claude', 'rules');
  if (!existsSync(dir)) return [];
  const named = readdirSync(dir).filter((f) => liveRules.includes(f) && namesATest(smallFileText(join(dir, f)))).map((f) => basename(f, '.md'));
  if (!named.length) return [];
  const folders = (layout.concepts?.tests ?? []).map((f) => layout.folders?.[f]?.path ?? f).filter((f) => !f.includes('*'));
  const tests = files.filter((f) => inTestFolder(f, folders)).map((f) => smallFileText(join(projectDir, f)));
  const declared = layout.ruleTests ?? {};
  const problems: string[] = [];
  const open = named.filter((rule) => {
    const said = declared[rule];
    if (/^none:\s*\S/.test(said ?? '')) return false;
    if (said && said !== 'none') {
      if (!existsSync(join(projectDir, said))) problems.push(`${rule}: ruleTests names ${said}, which does not exist`);
      return false;
    }
    return !tests.some((t) => t.includes(rule));
  });
  if (open.length) {
    const how = 'Write the test its Check names, and put `proves: <rule>` in it. Or set layout.json "ruleTests": { "<rule>": "<path>" }, or "none: <reason>".';
    problems.push(`${open.length} rule(s) name a test nothing in this project answers to: ${open.join(', ')}\n    ${how}`);
  }
  return problems;
}
