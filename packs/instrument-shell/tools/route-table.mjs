#!/usr/bin/env node
// A menu system's route table: judged, and drawn. The table (pages, the inputs each takes, the routes between them) is the one
// source of the menu; the project's generator writes it as JSON (the form is at the top of lib/route-judge.mjs).
//   node .claude/tools/route-table.mjs check <table.json>          every fault, one line each, with its law
//   node .claude/tools/route-table.mjs mermaid <table.json> <dir>  one Mermaid diagram per branch, for a person to read
//   node .claude/tools/route-table.mjs --selftest                  each law catches its planted fault, and a clean table passes
// Exit 0: clean (or written). Exit 1: faults, listed. Exit 2: the command was used wrongly.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { judge, LAW_NAMES } from './lib/route-judge.mjs';
import { diagrams } from './lib/route-mermaid.mjs';
import { CLEAN, planted } from './lib/route-plants.mjs';

const USAGE = 'usage: route-table.mjs check <table.json> | mermaid <table.json> <dir> | --selftest';
const routeTableIn = (file) => JSON.parse(readFileSync(file, 'utf8'));

function check([file]) {
  if (!file) return usage();
  const faults = judge(routeTableIn(file));
  for (const f of faults) console.log(`${f.law}: ${f.what}`);
  console.log(faults.length ? `${faults.length} fault(s) in ${file}` : `${file}: clean (${LAW_NAMES.length} laws)`);
  return faults.length ? 1 : 0;
}

function mermaid([file, dir]) {
  if (!file || !dir) return usage();
  mkdirSync(dir, { recursive: true });
  for (const d of diagrams(routeTableIn(file))) {
    writeFileSync(join(dir, d.file), d.text);
    console.log(`${join(dir, d.file)}: ${d.name}`);
  }
  return 0;
}

/** The clean table passes, and each law catches its own planted fault. */
export function selftest() {
  const wrong = [];
  if (judge(CLEAN).length) wrong.push(`the clean table has faults: ${judge(CLEAN).map((f) => f.law).join(', ')}`);
  for (const law of LAW_NAMES) if (!judge(planted(law)).some((f) => f.law === law)) wrong.push(`${law} misses its planted fault`);
  for (const w of wrong) console.error(w);
  console.log(wrong.length ? 'route-table selftest: FAILED' : `route-table selftest: ${LAW_NAMES.length} laws each catch their plant`);
  return wrong.length ? 1 : 0;
}

function usage() {
  console.error(USAGE);
  return 2;
}

const COMMANDS = { check, mermaid, '--selftest': selftest };

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  const [command, ...rest] = process.argv.slice(2);
  process.exit((COMMANDS[command] ?? usage)(rest));
}
