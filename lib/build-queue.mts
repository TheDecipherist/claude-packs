// KF-1: build-guard named a queue no pack shipped, and took any file called build.sh as a queue. doctor checks both ways it fails open: the tool is gone, or the project's
// wrapper queues nothing. A wrapper that holds the law itself says so: layout.json "guards": { "build": { "queue": "none: <reason>" } }.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';

const TOOL = '.claude/tools/buildq.mjs';

const wrappersOf = (commands: Layout['commands']): string[] =>
  [...new Set(Object.values(commands ?? {}).flatMap((c) => String(c).split(/\s+/)).filter((w) => /(^|\/)build\.sh$/.test(w)))];

/** What the layout declares as the build queue (`guards.build.queue`), or '' when it says nothing (guards is the project's own data). */
function declaredQueue(layout: Layout): string {
  const build: unknown = layout.guards?.['build'];
  const queue: unknown = build !== null && typeof build === 'object' && 'queue' in build ? build.queue : '';
  return typeof queue === 'string' ? queue : '';
}

/** The ways the project's build queue fails open: the tool is gone, or a build.sh wrapper never calls it. */
export function buildQueueProblems(projectDir: string, layout: Layout): string[] {
  if (!existsSync(join(projectDir, '.claude/hooks/build-guard.mjs'))) return [];
  const problems: string[] = [];
  if (!existsSync(join(projectDir, TOOL))) problems.push(`build-guard sends every build to ${TOOL}, which is missing: run update`);
  if (/^none:\s*\S/.test(declaredQueue(layout))) return problems;
  for (const rel of wrappersOf(layout.commands)) {
    const text = readText(join(projectDir, rel));
    if (text !== null && !text.includes('buildq')) {
      problems.push(`${rel} does not call the queue, so build-guard passes it and no job waits. Call ${TOOL} in it, or set layout.json "guards": { "build": { "queue": "none: <reason>" } }`);
    }
  }
  return problems;
}
