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
import { parseJson, readJson } from './json.mjs';

const ASK_MS = 20_000;
const SAFE_DIR = /^[\w./~-]+$/;   // a folder name goes into a remote shell command: plain path characters only

/** The machines to ask, from the user's remotes.json; [] when there is none or it is broken. */
export function remotesOf(file = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'claude-packs', 'remotes.json')) {
  const list = readJson(file)?.remotes;
  return Array.isArray(list) ? list.filter((r) => typeof r?.name === 'string' && typeof r?.ssh === 'string' && (!r.dir || SAFE_DIR.test(r.dir))) : [];
}

/** The ssh command that asks one machine: [program, args]. A login shell, so the machine's own PATH (Homebrew's node) holds. */
export function askCommand(remote) {
  const kit = remote.dir ? `cd ${remote.dir} && npx --no-install @thedecipherist/claude-packs status --json` : 'claude-packs status --json';
  return ['ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', remote.ssh, `$SHELL -lc '${kit}'`]];
}

/** One machine's runs, each marked with its name; or one row saying it could not be asked. Never throws. */
export function remoteRuns(remote, run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: ASK_MS, stdio: ['ignore', 'pipe', 'pipe'] })) {
  let text = '';
  try { text = run(...askCommand(remote)); } catch (e) { return { runs: [], unreachable: { host: remote.name, why: String(e?.stderr || e?.message || e).trim().split('\n').pop().slice(0, 80) } }; }
  const report = parseJson(text);
  if (!Array.isArray(report?.runs)) return { runs: [], unreachable: { host: remote.name, why: 'no status from its kit (is 1.8.0 or later installed there?)' } };
  return { runs: report.runs.map((r) => ({ ...r, host: remote.name })), unreachable: null };
}

/** Every listed machine's runs, and the machines that could not be asked. */
export function remotesReport(remotes = remotesOf(), run = undefined) {
  const answers = remotes.map((r) => remoteRuns(r, run));
  return { runs: answers.flatMap((a) => a.runs), unreachable: answers.map((a) => a.unreachable).filter(Boolean) };
}
