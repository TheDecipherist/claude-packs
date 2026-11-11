// The one git runner (typescript order W2.5; the base-hooks and cli-lib surveys counted 22 definitions in 6 wrappers with 4
// signatures). One result type; the folder and the environment are the caller's, never the process's own, so a resident runner
// judging another session's event runs git where that event happened (review-2 8.5).
import { spawnSync } from 'node:child_process';
/** git with these arguments; never throws. */
export function gitRun(args, { cwd, env, identity, input, timeoutMs = 30_000 }) {
    const who = identity ? ['-c', `user.name=${identity.name}`, '-c', `user.email=${identity.email}`] : [];
    const r = spawnSync('git', [...who, ...args], { cwd, env, input, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
    return { ok: r.status === 0, status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? (r.error ? String(r.error.message) : '') };
}
/** git's trimmed output when it exited 0, else null. */
export function gitOut(args, options) {
    const r = gitRun(args, options);
    return r.ok ? r.stdout.trim() : null;
}
/** The lines git printed, each as printed (a porcelain line's leading space kept), empty ones left out; none when it failed. */
export function gitLines(args, options) {
    const r = gitRun(args, options);
    return r.ok ? r.stdout.split('\n').filter(Boolean) : [];
}
