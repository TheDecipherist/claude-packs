// resident/status: the status line, served by the daemon (typescript order W8.6, the user, 2026-11-12: "It should be the go proxy that
// maintains and updates the statusbar"). The daemon keeps the facts as events arrive and as the sampler reports (the live agents with
// their tools and clocks, the lead's last tool, the last commit, the kit version, npm's newest version), and `hook-proxy status` asks the
// socket and prints what `render` draws from them: no render reads a transcript, a worktree, `ps` or the network. What it cannot know
// from an event it keeps warm in the background, each answered from memory at the next render: git's state (a few seconds old at most),
// npm's newest version (asked at most hourly, a failed ask kept as the last answer), the RUNS rows (the cache the detached refresh writes).
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { put } from '../lib/files.mjs';
import { toJson } from '../lib/json.mjs';
import { KIT, cacheDir, parseVersion } from '../lib/kit-fresh-look.mjs';
import { AgentBoard } from './agent-board.mjs';
/** How old git's state or the RUNS rows get before they are drawn again; the version is read again this often too. */
export const GIT_MS = 4000;
export const RUNS_MS = 2000;
export const VERSION_MS = 60_000;
/** npm's newest version is asked at most this often. */
export const NPM_MS = 60 * 60_000;
const NPM_TIMEOUT_MS = 8000;
const run = (file, args, cwd) => new Promise((done) => {
    execFile(file, args, { cwd, timeout: NPM_TIMEOUT_MS, encoding: 'utf8' }, (error, out) => done(error === null ? out.trim() : null));
});
const npmNewest = async () => { const v = await run('npm', ['view', KIT, 'version'], '/'); return v !== null && parseVersion(v) !== null ? v : null; };
const gitStatus = (cwd) => run('git', ['--no-optional-locks', 'status', '--porcelain=v2', '--branch', '--untracked-files=normal'], cwd);
export class StatusKeeper {
    board;
    newest = null;
    o;
    bar;
    git = new Map();
    version = null;
    runs = null;
    npmAt = 0;
    npmBusy = false;
    constructor(o) {
        this.o = o;
        this.board = new AgentBoard(o.project);
        this.bar = o.load();
        this.bar.catch((e) => o.log(`status line module not loaded: ${e instanceof Error ? e.message : String(e)}`));
    }
    note(ev, ppid, now) { this.board.note(ev, ppid, now); }
    /** The sampler's tick: agents with no process and no event for five minutes are dropped even when no one renders. */
    tick(now) { this.board.observe(now, this.o.usageOf); void this.refreshNewest(now); }
    /** Asks npm in the background when the last ask is an hour old; never waits, never throws. A failed or hung ask leaves the last answer. */
    async refreshNewest(now) {
        if (this.npmBusy || now - this.npmAt < NPM_MS)
            return;
        this.npmBusy = true;
        this.npmAt = now;
        try {
            const v = await (this.o.askNpm ?? npmNewest)();
            if (v !== null) {
                this.newest = v;
                try {
                    put(join(cacheDir(this.o.env), 'kit-fresh.json'), toJson({ version: v, at: now }));
                }
                catch { /* kept in memory only */ }
            }
        }
        catch (e) {
            this.o.log(`npm newest not had: ${e instanceof Error ? e.message : String(e)}`);
        }
        finally {
            this.npmBusy = false;
        }
    }
    gitOf(cwd, now) {
        const kept = this.git.get(cwd) ?? { at: 0, busy: false, state: {} };
        this.git.set(cwd, kept);
        if (!kept.busy && now - kept.at >= GIT_MS) {
            kept.busy = true;
            void (this.o.askGit ?? gitStatus)(cwd).then(async (text) => {
                const bar = await this.bar;
                if (text !== null)
                    kept.state = bar.parseStatusV2(text);
            }).catch(() => undefined).finally(() => { kept.busy = false; kept.at = Date.now(); });
        }
        return kept.state;
    }
    /** The status line for Claude Code's session JSON `raw`, drawn from what the daemon holds. */
    async render(raw, env, now = Date.now()) {
        const bar = await this.bar;
        const project = this.o.project;
        if (this.version === null || now - this.version.at >= VERSION_MS)
            this.version = { at: now, value: bar.kitVersion(join(project, '.claude', 'tools'), project) };
        const usageOf = this.o.usageOf;
        const refreshRuns = this.o.refreshRuns !== false;
        const lines = bar.statusBar(raw, {
            env, nowMs: now, refresh: false, resident: 'up', toolDir: join(project, '.claude', 'tools'),
            git: (cwd) => this.gitOf(cwd, now),
            live: {
                agents: this.board.rows(now, usageOf), lastCommit: this.board.lastCommit, activity: this.board.activity(bar.sessionIdOf(raw)),
                newest: this.newest ?? bar.keptNewest(env), version: this.version.value,
                runs: (paint, mode) => {
                    if (this.runs === null || this.runs.mode !== mode || now - this.runs.at >= RUNS_MS) {
                        const cache = bar.runsCache(env);
                        if (refreshRuns)
                            bar.refreshRuns(cache, now);
                        this.runs = { at: now, mode, rows: bar.runsSegments(cache, now, paint, mode) };
                    }
                    return this.runs.rows;
                },
            },
        });
        return lines.join('\n');
    }
}
