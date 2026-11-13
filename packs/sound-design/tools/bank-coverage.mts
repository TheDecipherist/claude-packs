// bank-coverage: every control is varied across the bank's programs, or exempt with a written reason.
//   node .claude/tools/bank-coverage.mjs <bank.json> [exempt.json]
// bank.json: { "controls": [ { "id": "cutoff", "needs": "filterOn" } ], "programs": [ { "name": "PAD . Tide", "values": { "cutoff": 0.4, "filterOn": 1 } } ] }
// A control with `needs` is counted only over the programs where the named switch is non-zero. exempt.json: { "<control id>": "<reason>" }.
// Exit 0: every control takes two or more distinct values or is exempt with a reason. Exit 1: a flat control, or an exempt one with no reason. Exit 2: misuse.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson } from '../hooks/lib/json.mts';

/** One control of the machine, and the switch that arms it when it has one. */
export interface Control { id: string; needs?: string }
/** One program of the bank: its name and the value of each control it sets. */
export interface Program { name: string; values: Record<string, number> }
export interface Bank { controls: Control[]; programs: Program[] }

/** The distinct values a control takes across the programs that arm it. */
export function distinctValues(bank: Bank, control: Control): Set<number> {
  const seen = new Set<number>();
  for (const program of bank.programs) {
    if (control.needs !== undefined && !program.values[control.needs]) continue;
    const value = program.values[control.id];
    if (value !== undefined) seen.add(value);
  }
  return seen;
}

/** What is still to do: a flat control that is not exempt, an exempt control with no reason. */
export function coverage(bank: Bank, exempt: Record<string, string>): string[] {
  const todo: string[] = [];
  for (const control of bank.controls) {
    const reason = exempt[control.id];
    if (reason !== undefined) {
      if (reason.trim() === '') todo.push(`exempt with no reason: ${control.id}`);
      continue;
    }
    const count = distinctValues(bank, control).size;
    if (count < 2) todo.push(`flat control: ${control.id} takes ${count} distinct value${count === 1 ? '' : 's'}${control.needs ? ` where ${control.needs} is on` : ''}`);
  }
  return todo;
}

function main(args: readonly string[]): number {
  const [bankPath, exemptPath] = args;
  if (bankPath === undefined || !existsSync(bankPath) || (exemptPath !== undefined && !existsSync(exemptPath))) {
    console.error('usage: node .claude/tools/bank-coverage.mjs <bank.json> [exempt.json]');
    return 2;
  }
  const bank = readJson<Bank>(resolve(bankPath));
  const exempt = exemptPath ? readJson<Record<string, string>>(resolve(exemptPath)) : {};
  if (!bank?.controls || !bank.programs || !exempt) { console.error('bank-coverage: the bank or the exempt file is not readable'); return 2; }
  const todo = coverage(bank, exempt);
  if (todo.length === 0) { console.log(`bank coverage: ${bank.controls.length} controls, each varied or exempt`); return 0; }
  console.log(`bank coverage: ${todo.length} still to do`);
  for (const item of todo) console.log(`  ${item}`);
  return 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
