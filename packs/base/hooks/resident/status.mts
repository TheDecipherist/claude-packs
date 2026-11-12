// resident/status: the status line, served by the daemon (typescript order W8.6, the user, 2026-11-12: "It should be the go proxy that
// maintains and updates the statusbar"). The daemon keeps the facts as events arrive and as the sampler reports (the live agents with
// their tools and clocks, the lead's last tool, the last commit, the kit version, npm's newest version), and `hook-proxy status` asks the
// socket and prints what `render` draws from them: no render reads a transcript, a worktree, `ps` or the network. What it cannot know
// from an event it keeps warm in the background, each answered from memory at the next render: git's state (a few seconds old at most),
// npm's newest version (asked at most hourly, a failed ask kept as the last answer), the RUNS rows (the cache the detached refresh writes).
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { put } from '../lib/files.mts';
import { toJson } from '../lib/json.mts';
import { KIT, cacheDir, parseVersion } from '../lib/kit-fresh-look.mts';
import type { Env, HookEvent } from '../lib/types.d.mts';
import { AgentBoard } from './agent-board.mts';
import type { Usage } from './usage.mts';

/** How old git's state or the RUNS rows get before they are drawn again; the version is read again this often too. */
export const GIT_MS = 4000;
export const RUNS_MS = 2000;
export const VERSION_MS = 60_000;
/** npm's newest version is asked at most this often. */
export const NPM_MS = 60 * 60_000;
const NPM_TIMEOUT_MS = 8000;

export type Bar = typeof import('../../tools/statusline-live.mts');

export interface StatusOptions {
  project: string;
  /** The drawing module (tools/statusline), loaded at start so the first render does not pay for it. */
  load: () => Promise<Bar>;
  /** The sampler's totals for an owner (W8.7): the daemon's own store, or a test's plant. */
  usageOf: (owner: string) => Usage | null;
  /** npm's newest version, or null when it could not be had. It may hang or throw: the render never waits for it. */
  askNpm?: () => Promise<string | null>;
  /** git's state of a folder, asked in the background. */
  askGit?: (cwd: string) => Promise<string | null>;
  /** Whether the RUNS cache is renewed (a detached `node statusline --refresh`); a test turns it off. */
  refreshRuns?: boolean;
  env: Env;
  log: (line: string) => void;
}

const run = (file: string, args: readonly string[], cwd: string): Promise<string | null> => new Promise((done) => {
  execFile(file, args, { cwd, timeout: NPM_TIMEOUT_MS, encoding: 'utf8' }, (error, out) => done(error === null ? out.trim() : null));
});
const npmNewest = async (): Promise<string | null> => { const v = await run('npm', ['view', KIT, 'version'], '/'); return v !== null && parseVersion(v) !== null ? v : null; };
const gitStatus = (cwd: string): Promise<string | null> => run('git', ['--no-optional-locks', 'status', '--porcelain=v2', '--branch', '--untracked-files=normal'], cwd);

export class StatusKeeper {
  readonly board: AgentBoard;
  newest: string | null = null;
  private readonly o: StatusOptions;
  private bar: Promise<Bar>;
  private readonly git = new Map<string, { at: number; busy: boolean; state: Record<string, unknown> }>();
  private version: { at: number; value: string | null } | null = null;
  private runs: { at: number; mode: string; rows: string[] } | null = null;
  private npmAt = 0;
  private npmBusy = false;

  constructor(o: StatusOptions) {
    this.o = o;
    this.board = new AgentBoard(o.project);
    this.bar = o.load();
    this.bar.catch((e: unknown) => o.log(`status line module not loaded: ${e instanceof Error ? e.message : String(e)}`));
  }

  note(ev: HookEvent, ppid: number, now: number): void { this.board.note(ev, ppid, now); }

  /** The sampler's tick: agents with no process and no event for five minutes are dropped even when no one renders. */
  tick(now: number): void { this.board.observe(now, this.o.usageOf); void this.refreshNewest(now); }

  /** Asks npm in the background when the last ask is an hour old; never waits, never throws. A failed or hung ask leaves the last answer. */
  async refreshNewest(now: number): Promise<void> {
    if (this.npmBusy || now - this.npmAt < NPM_MS) return;
    this.npmBusy = true;
    this.npmAt = now;
    try {
      const v = await (this.o.askNpm ?? npmNewest)();
      if (v !== null) {
        this.newest = v;
        try { put(join(cacheDir(this.o.env), 'kit-fresh.json'), toJson({ version: v, at: now })); } catch { /* kept in memory only */ }
      }
    } catch (e) { this.o.log(`npm newest not had: ${e instanceof Error ? e.message : String(e)}`); } finally { this.npmBusy = false; }
  }

  private gitOf(cwd: string, now: number): Record<string, unknown> {
    const kept = this.git.get(cwd) ?? { at: 0, busy: false, state: {} };
    this.git.set(cwd, kept);
    if (!kept.busy && now - kept.at >= GIT_MS) {
      kept.busy = true;
      void (this.o.askGit ?? gitStatus)(cwd).then(async (text) => {
        const bar = await this.bar;
        if (text !== null) kept.state = bar.parseStatusV2(text);
      }).catch(() => undefined).finally(() => { kept.busy = false; kept.at = Date.now(); });
    }
    return kept.state;
  }

  /** The status line for Claude Code's session JSON `raw`, drawn from what the daemon holds. */
  async render(raw: string, env: Env, now: number = Date.now()): Promise<string> {
    const bar = await this.bar;
    const project = this.o.project;
    if (this.version === null || now - this.version.at >= VERSION_MS) this.version = { at: now, value: bar.kitVersion(join(project, '.claude', 'tools'), project) };
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
            if (refreshRuns) bar.refreshRuns(cache, now);
            this.runs = { at: now, mode, rows: bar.runsSegments(cache, now, paint, mode) };
          }
          return this.runs.rows;
        },
      },
    });
    return lines.join('\n');
  }
}
