// `claude-packs status`: where every unattended run stands, one line per project and one per agent, each with a bar (1.7.3;
// the user: "super simple with like a line graph ... PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS 0% - 100%)").
//   status                                    every run alive on this machine
//   status --dir <project> [--order <name>]   one project's orders, running or not
//   status --watch <minutes>                  the same again every so many minutes
//   status --json [--out <file>]              the same as data (1.8.0): what the status line draws from, --out written whole
import { toJson, writeJson } from '../packs/base/hooks/lib/json.mjs';
import { barCells, percentLabel as pct, runRows, runsReport } from './run-status.mjs';

export function bar(p, width) {
  const [full, empty] = barCells(p, width);
  return `[${'█'.repeat(full)}${'░'.repeat(empty)}]`;
}

/** The report's lines for one order: the project's line, then one line per agent (or the lead's step when none runs). */
export function statusLines(s) {
  const { project, agents } = runRows(s);
  const row = (a) => `  > ${a.who.padEnd(10)} > ${`${a.id ?? '?'} ${a.title.slice(0, 22)}`.padEnd(28)} ${bar(a.percent, 10)} ${pct(a.percent)}` +
    `${a.quiet ? `   quiet ${a.quiet}m` : ''}${a.now ? `   ${a.now.slice(0, 50)}` : ''}`;
  return [`${project.name.padEnd(24)} ${bar(project.percent, 20)} ${pct(project.percent)}   ${project.state}`, ...agents.map(row)];
}

export function statusReport(options = {}) {
  const { dir, runs } = runsReport(options);
  if (runs.length === 0) return [dir ? `no work orders in ${dir}` : 'no unattended run is alive on this machine'];
  return runs.flatMap(statusLines);
}

export async function statusCommand(args, { log = console.log, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), ticks = Infinity } = {}) {
  const at = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const options = { dir: at('--dir'), order: at('--order') };
  if (args.includes('--json')) {
    const report = runsReport(options);
    if (!at('--out')) log(toJson(report, { pretty: true }));
    else if (!writeJson(at('--out'), report)) { log(`status: could not write ${at('--out')}`); return 1; }
    return 0;
  }
  const every = Number(at('--watch'));
  for (let tick = 0; tick < (every > 0 ? ticks : 1); tick += 1) {
    if (tick > 0) await wait(every * 60_000);
    if (every > 0) log(`-- ${new Date().toLocaleTimeString()}`);
    for (const line of statusReport(options)) log(line);
  }
  return 0;
}
