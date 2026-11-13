// W11: the daemon's resident memory against W8's lines (under 100 MB idle at 2 warm workers, under 150 MB with the pool grown to 8, under
// 250 MB at 16 and 300 MB with the sampler). In a scratch install of bandwarp's pack set (the replay's), under the system temp folder and its
// own cache: the daemon is started by a first event, its RSS read when idle (`ps`, the daemon and the sampler as separate processes and
// together), then <events> live-like events (Read, Pre and Post Bash, Pre and Post Write, Pre and Post Edit, Stop) are run through the picker,
// <clients> at once, with the RSS read every 50 events, and again after the pool has been idle for 150 s.
//   node daemon-rss.mts <out.md> [--events 1000] [--clients 8]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { CLI as cli, KIT as kit, makeScratch, payloadOf, settingsCommandOf, sh } from '../../../../scripts/replay-lib.mts';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { events: { type: 'string', default: '1000' }, clients: { type: 'string', default: '8' } } });
const total = Number(values.events);
const clients = Number(values.clients);
const out = positionals[0] ?? 'daemon-rss.md';
const IDLE_MS = 150_000;
const SETTLE_MS = 3000;
const EVERY = 50;

const root = mkdtempSync(join(tmpdir(), 'daemon-rss-'));
const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PACKS_CACHE: join(root, 'cache'), TMPDIR: root };
const { dir, shim } = makeScratch(root, 100, env);
env['CLAUDE_PROJECT_DIR'] = dir;
env['GIT_EXEC_PATH'] = shim;
const commandFor = settingsCommandOf(dir);

/** RSS in MB of the daemon (`resident.mjs --serve <scratch>`) and of the sampler it owns, from ps. */
function rss(): { daemon: number; sampler: number } {
  const rows = sh('ps -axo rss=,command=', kit).out.split('\n').filter((r) => r.includes(root));
  const mb = (r: string | undefined): number => (r ? Number(r.trim().split(/\s+/)[0]) / 1024 : 0);
  return { daemon: mb(rows.find((r) => r.includes('resident.mjs'))), sampler: mb(rows.find((r) => r.includes('hook-proxy') && r.includes('sample'))) };
}
const lines: string[] = [];
const say = (s: string): void => { lines.push(s); console.log(s); };
const mix = [['PreToolUse', 'Read'], ['PreToolUse', 'Bash'], ['PostToolUse', 'Bash'], ['PreToolUse', 'Write'], ['PostToolUse', 'Write'],
  ['PreToolUse', 'Edit'], ['PostToolUse', 'Edit'], ['Stop', '-']] as const;
const one = (k: number): Promise<void> => new Promise((done) => {
  const [event = '', tool = '-'] = mix[k % mix.length] ?? [];
  const cmd = commandFor(event, tool);
  if (cmd === null) { done(); return; }
  const c = spawn('sh', ['-c', cmd], { cwd: dir, env, stdio: ['pipe', 'ignore', 'ignore'] });
  c.on('close', () => done());
  c.stdin.end(payloadOf(dir, { event, tool }, k));
});
const together = (r: { daemon: number; sampler: number }): string => `daemon ${r.daemon.toFixed(0)} MB, sampler ${r.sampler.toFixed(0)} MB, together ${(r.daemon + r.sampler).toFixed(0)} MB`;
const statusOf = (): string => sh(`node ${cli} daemon status --dir ${dir}`, kit, env).out.trim().replace(/\n/g, ' | ');

say(`# W11: the daemon's RSS (scratch install of bandwarp's pack set, ${total} events, ${clients} at once; load ${loadavg().map((x) => x.toFixed(2)).join(' ')})\n`);
await one(0); // the first event starts the daemon
await one(1);
await sleep(SETTLE_MS);
say(`- after the first events, idle: ${together(rss())}`);
say(`  status: ${statusOf()}`);
let peak = 0;
let next = 0;
const lane = async (): Promise<void> => {
  while (next < total) {
    const k = next++;
    await one(k);
    if (k % EVERY === 0) { const r = rss(); peak = Math.max(peak, r.daemon); say(`  event ${k}: daemon ${r.daemon.toFixed(0)} MB`); }
  }
};
await Promise.all(Array.from({ length: clients }, lane));
await sleep(SETTLE_MS);
say(`- after ${total} events at ${clients} at once: ${together(rss())} (peak daemon read ${peak.toFixed(0)} MB)`);
say(`  status: ${statusOf()}`);
await sleep(IDLE_MS); // the pool retires idle workers after 2 minutes
say(`- ${IDLE_MS / 1000} s later, idle: ${together(rss())}`);
say(`  status: ${statusOf()}`);
sh(`node ${cli} daemon stop --dir ${dir}`, kit, env);
writeFileSync(out, `${lines.join('\n')}\n`);
rmSync(root, { recursive: true, force: true });
