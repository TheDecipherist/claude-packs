// The runs of other machines (1.8.1; the user, as a run moved to the Mac: "but we still need to get some kind of report here
// for whats happening"). ~/.config/claude-packs/remotes.json names them:
//   { "remotes": [ { "name": "mac", "ssh": "mac", "dir": "~/projects/bandwarp" } ] }
// name: what the rows call it; ssh: the host as `ssh` knows it (a ~/.ssh/config entry, with its key); dir: a project there
// whose installed kit answers (left out: `claude-packs` on that machine's PATH). Each is asked for its `status --json`, its
// own processes and files measured there, with no password prompt and a time limit, so a machine asleep never holds a
// refresh; one that cannot be reached is reported as such, never as silence.
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseJson, readJson } from './json.mts';

const ASK_MS = 20_000;
const SAFE_DIR = /^[\w./~-]+$/;   // a folder name goes into a remote shell command: plain path characters only

/** The environment a caller passes. */
type Env = Readonly<Record<string, string | undefined>>;

/** One machine remotes.json lists. */
export interface Remote { name: string; ssh: string; dir?: string; kit?: string }
/** A machine that could not be asked, and why in a few words. */
export interface Unreachable { host: string; why: string }
/** What one ssh call asks: the program and its arguments, answered with its stdout (a throw is "could not be asked"). */
export type Asker = (cmd: string, args: readonly string[]) => string;

interface RemotesFile { name?: unknown; remotes?: unknown }
interface RemoteReport { runs?: unknown }

/** remotes.json's path, from the caller's environment. */
export const remotesFile = (env: Env): string => join(env.XDG_CONFIG_HOME || join(env.HOME || homedir(), '.config'), 'claude-packs', 'remotes.json');

/** This machine's name on its own runs once other machines are listed (the user: "the statusbar needs to say which project
 *  runs where so like a PC/MAC thing in the beginning"): remotes.json's "name", else mac on macOS and pc elsewhere. */
export function machineName(file: string, platform: string): string {
  const named = readJson<RemotesFile>(file)?.name;
  return typeof named === 'string' && named.trim() ? named.trim() : platform === 'darwin' ? 'mac' : 'pc';
}

const isRemote = (r: unknown): r is Remote => {
  if (typeof r !== 'object' || r === null) return false;
  const row = r as Record<string, unknown>;
  const plain = (p: unknown): boolean => !p || (typeof p === 'string' && SAFE_DIR.test(p));
  return typeof row.name === 'string' && typeof row.ssh === 'string' && plain(row.dir) && plain(row.kit);
};

/** The machines to ask, from the user's remotes.json; [] when there is none or it is broken. */
export function remotesOf(file: string): Remote[] {
  const list = readJson<RemotesFile>(file)?.remotes;
  return Array.isArray(list) ? list.filter(isRemote) : [];
}

/** The ssh command that asks one machine: [program, args]. A login shell, so the machine's own PATH (Homebrew's node) holds.
 *  kit: a checkout of the kit there (its bin/claude-packs.mjs), else dir's installed kit, else claude-packs on its PATH. */
export function askCommand(remote: Remote): [string, string[]] {
  const kit = remote.kit ? `node ${remote.kit}/bin/claude-packs.mjs status --json`
    : remote.dir ? `cd ${remote.dir} && npx --no-install @thedecipherist/claude-packs status --json` : 'claude-packs status --json';
  return ['ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', remote.ssh, `$SHELL -lc '${kit}'`]];
}

/** The real ask: ssh with the caller's environment and a time limit. */
export const sshAsk = (env: Env): Asker => (cmd, args) =>
  execFileSync(cmd, [...args], { encoding: 'utf8', timeout: ASK_MS, stdio: ['ignore', 'pipe', 'pipe'], env: { ...env } });

const lastWords = (e: unknown): string => {
  const row = (typeof e === 'object' && e !== null ? e : {}) as { stderr?: unknown; message?: unknown };
  return String(row.stderr || row.message || e).trim().split('\n').pop()?.slice(0, 80) ?? '';
};

/** One machine's runs, each marked with its name; or one row saying it could not be asked. Never throws. */
export function remoteRuns<R extends object = Record<string, unknown>>(remote: Remote, run: Asker): { runs: (R & { host: string })[]; unreachable: Unreachable | null } {
  let text = '';
  try { text = run(...askCommand(remote)); } catch (e) { return { runs: [], unreachable: { host: remote.name, why: lastWords(e) } }; }
  const report = parseJson<RemoteReport>(text);
  if (!Array.isArray(report?.runs)) return { runs: [], unreachable: { host: remote.name, why: 'no status from its kit (is 1.8.0 or later installed there?)' } };
  const rows: R[] = report.runs;
  return { runs: rows.map((r) => ({ ...r, host: remote.name })), unreachable: null };
}

/** Every listed machine's runs, and the machines that could not be asked. */
export function remotesReport<R extends object = Record<string, unknown>>(remotes: readonly Remote[], run: Asker): { runs: (R & { host: string })[]; unreachable: Unreachable[] } {
  const answers = remotes.map((r) => remoteRuns<R>(r, run));
  return { runs: answers.flatMap((a) => a.runs), unreachable: answers.map((a) => a.unreachable).filter((u): u is Unreachable => u !== null) };
}
