#!/usr/bin/env node
// claude-packs: the command. `load` (the governor's answer, typescript order W8.8) is asked before every heavy job and must answer in
// one node start, so it is sent on before the rest of the command is loaded; every other command is lib/cli.mts.
const [command, ...rest] = process.argv.slice(2);
if (command === 'load') {
  const { main } = await import('../packs/base/tools/load.mts');
  process.exit(main(rest, { env: process.env, cwd: process.cwd(), ppid: process.ppid }));
}
await import('../lib/cli.mts');
