#!/usr/bin/env node
// `npm run release -- patch|minor|major`: the whole release, in order, each step skipped when it is already done, so a stopped
// release is finished by running it again (typescript order W9, KWB-166): the gate (`test:changed` against the trunk, on committed
// work), the version bump, the CHANGELOG heading dated, the generators, the proxy's four builds, the landing (merge the trunk into
// the branch, the branch into main, push main), `npm publish`, the tag and the GitHub release.
//   node scripts/release.mjs [patch|minor|major] [--dry-run] [--registry <url>] [--remote <name>]
//     --dry-run   plan only: each step, whether it is done, its wall (the last measured, else an estimate) and every refusal
//     --registry  a local registry: publish goes there, and the landing, tag and push go to the scratch remote (--remote, else the
//                 clone's own origin), never GitHub; the GitHub release is skipped. Both are refused if they name a public one.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { TOKEN, factsOf, refusals, releaseContext, type Ctx, type ReleaseOptions } from './release-state.mts';
import { ESTIMATED_S, STEPS, type StepId } from './release-steps.mts';
import { KINDS, type Kind } from './release-version.mts';

export { githubRemote, gitWithToken, refusals } from './release-state.mts';
export { notesFor } from './release-version.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const wallsFile = (root: string): string => join(root, 'build', 'release-walls.json');
type Walls = Partial<Record<StepId, number>>;

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** The release: 0 done or finished (or planned), 2 refused or stopped (the reasons are logged to `error`). */
export function release(options: ReleaseOptions, env: Env, log: (line: string) => void, error: (line: string) => void): number {
  const ctx: Ctx = releaseContext(options, env);
  const facts = factsOf(ctx);
  const why = refusals(facts, { dryRun: options.dryRun, scratch: ctx.scratch });
  const heading = `release ${facts.name} ${facts.base} -> ${facts.target} (${options.kind})${ctx.scratch ? ` on the scratch registry ${ctx.registry ?? ''}, remote ${ctx.remoteName}` : ''}`;
  if (why.length) { error(`release refused (${why.length}):\n${why.map((w) => `  - ${w}`).join('\n')}`); return 2; }
  log(`${options.dryRun ? 'plan: ' : ''}${heading}`);
  if (options.dryRun && !facts.token && !ctx.scratch) log(`note: ${TOKEN} is not set here; a real run needs it, and stops without it`);
  const walls = parseJson<Walls>(readText(wallsFile(ctx.root))) ?? {};
  const measured: Walls = { ...walls };
  let total = 0;
  for (const step of STEPS) {
    const label = step.label(facts);
    const status = step.status(ctx, facts);
    const estimate = walls[step.id] ?? ESTIMATED_S[step.id];
    if (status !== 'todo') { log(`${status === 'done' ? 'done already' : 'skipped'}: ${label}`); continue; }
    if (options.dryRun) { log(`would run: ${label} (about ${estimate.toFixed(0)} s, ${walls[step.id] === undefined ? 'estimated' : 'measured'})`); total += estimate * 1000; continue; }
    log(`running: ${label}`);
    const started = Date.now();
    try { step.run(ctx, facts, log); options.after?.[step.id]?.(); } catch (e) { error(`release stopped at ${step.id}: ${e instanceof Error ? e.message : String(e)}\nrun it again once that is fixed; the steps already done are skipped`); return 2; }
    const wall = Date.now() - started;
    total += wall;
    measured[step.id] = wall / 1000;
    log(`done: ${label} in ${seconds(wall)}`);
  }
  if (!options.dryRun) writeJson(wallsFile(ctx.root), measured, { pretty: true });
  log(`${options.dryRun ? 'planned' : 'total'}: ${seconds(total)}`);
  return 0;
}

/** The options a command line gives, or why it gives none. */
export function parseArgs(argv: readonly string[], root: string, now: Date): ReleaseOptions | string {
  const flag = (name: string): string | undefined => { const at = argv.indexOf(name); return at === -1 ? undefined : argv[at + 1]; };
  const kind: Kind | undefined = KINDS.find((k) => argv.includes(k));
  if (kind === undefined) return `usage: npm run release -- ${KINDS.join('|')} [--dry-run] [--registry <url>] [--remote <name>]`;
  const registry = flag('--registry');
  const remote = flag('--remote');
  if (argv.includes('--registry') && !registry) return '--registry needs a url';
  return { root, kind, dryRun: argv.includes('--dry-run'), date: now.toISOString().slice(0, 10), ...(registry ? { registry } : {}), ...(remote ? { remote } : {}) };
}

if (isMain(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2), KIT, new Date());
  if (typeof options === 'string') { console.error(options); process.exit(2); }
  try { process.exit(release(options, process.env, console.log, console.error)); } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); }
}
