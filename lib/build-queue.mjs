// KF-1: build-guard named a queue no pack shipped, and took any file called build.sh as a queue. doctor checks both ways it fails open: the tool is gone, or the project's
// wrapper queues nothing. A wrapper that holds the law itself says so: layout.json "guards": { "build": { "queue": "none: <reason>" } }.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOOL = '.claude/tools/buildq.mjs';

const wrappersOf = (commands) => [...new Set(Object.values(commands ?? {}).flatMap((c) => String(c).split(/\s+/)).filter((w) => /(^|\/)build\.sh$/.test(w)))];

export function buildQueueProblems(projectDir, layout) {
  if (!existsSync(join(projectDir, '.claude/hooks/build-guard.mjs'))) return [];
  const problems = [];
  if (!existsSync(join(projectDir, TOOL))) problems.push(`build-guard sends every build to ${TOOL}, which is missing: run update`);
  if (/^none:\s*\S/.test(layout.guards?.build?.queue ?? '')) return problems;
  for (const rel of wrappersOf(layout.commands)) {
    const file = join(projectDir, rel);
    if (existsSync(file) && !readFileSync(file, 'utf8').includes('buildq')) {
      problems.push(`${rel} does not call the queue, so build-guard passes it and no job waits. Call ${TOOL} in it, or set layout.json "guards": { "build": { "queue": "none: <reason>" } }`);
    }
  }
  return problems;
}
