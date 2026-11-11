// doctor and the hook proxy (typescript order W8.2, review-2-go 5.8, 6.1): says which path a hook event takes in this install (the
// proxy's binary from the user's cache, or the TypeScript runner when there is none), and runs the binary's own `--selftest` like a
// hook's. A passed selftest is remembered by the binary's hash.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { cachedBinary, hostTarget } from './proxy-binary.mts';
import { proved, remember, type CacheEnv } from './selftest-cache.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

const SECONDS = 60;

/** The problems of this machine's proxy binary (its selftest failed or hung); a note says which path is live. */
export function proxyProblems(projectDir: string, env: CacheEnv, log: Logger, fresh = false): string[] {
  const target = hostTarget();
  const picker = existsSync(`${projectDir}/.claude/hooks/bin/hook-proxy`);
  const binary = target === null ? null : cachedBinary(env, target);
  if (!picker) return [];
  if (binary === null || !existsSync(binary)) {
    log(`  note: hook path: the TypeScript runner, each event pays node's start (no proxy binary in ${binary ?? 'this machine\'s cache'}; the kit's build makes one when Go is on PATH)`);
    return [];
  }
  const key = `hook-proxy-${createHash('sha256').update(readFileSync(binary)).digest('hex')}`;
  if (!fresh && proved(key, env)) { log(`  note: hook path: the proxy (${binary}); its selftest is unchanged, not run again`); return []; }
  const run = spawnSync(binary, ['--selftest'], { encoding: 'utf8', env: { ...env, CLAUDE_PROJECT_DIR: projectDir }, timeout: SECONDS * 1000 });
  if (run.status === 0) {
    remember(key, env);
    log(`  note: hook path: the proxy (${binary})`);
    return [];
  }
  const why = run.error !== undefined ? run.error.message : `${run.stdout}${run.stderr}`.trim().split('\n').slice(-4).join('\n');
  return [`hook-proxy fails its selftest (${binary}):\n${why}`];
}
