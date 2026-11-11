#!/usr/bin/env node
// db-wipe-guard (PreToolUse, Bash): a command that wipes a database runs only against a database this machine holds. Two public reports of an agent
// running a forced reset against a live database lost 60 and 87 tables; in the second, .env pointed at production. A reset is ordinary work on a local
// database, so the guard judges the target, in this order: the host named in the command, then DATABASE_URL or POSTGRES_URL in the checkout's .env
// files. A target it cannot find is refused, because a guard that cannot judge must not pass a wipe: name a local host in the command and it can.
// Only the host is read and shown, never a password. `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot } from './lib/project.mjs';
import { bashOf, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';


const WIPES = [
  [/\bprisma\s+migrate\s+reset\b/, 'prisma migrate reset'],
  [/\bprisma\s+db\s+push\b[^\n;&|]*--(?:force-reset|accept-data-loss)\b/, 'prisma db push with a forced reset'],
  [/\bdrizzle-kit\s+push\b[^\n;&|]*--force\b/, 'drizzle-kit push --force'],
  [/\b(?:rails|rake)\s+db:(?:drop|reset)\b/, 'db:drop or db:reset'],
  [/\bmanage\.py\s+flush\b/, 'manage.py flush'],
  [/(?:^|[\s;&|])dropdb\s/, 'dropdb'],
  [/\bsqlx\s+database\s+(?:drop|reset)\b/, 'sqlx database drop or reset'],
  [/\bdiesel\s+database\s+reset\b/, 'diesel database reset'],
];
const RAW_WIPE = /\bpsql\b[^\n|]*\bDROP\s+(?:DATABASE|SCHEMA)\b/i;
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal', 'db', 'postgres', 'database']);
const URL_HOST = /\b(?:postgres(?:ql)?|mysql|mariadb):\/\/(?:[^@\s/'"]*@)?(\[[^\]]+\]|[^:/?\s'"]+)/i;
const ENV_URL = /^\s*(?:export\s+)?(?:DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DB_URL)\s*=\s*['"]?([^\s'"]+)/m;
const HOST_FLAG = /(?:\s-h\s*|\s--host[=\s])(\S+)/;
const ENV_FILES = ['.env.local', '.env.development', '.env'];

const hostIn = (text) => text.match(URL_HOST)?.[1] ?? null;

function hostOfEnv(root) {
  for (const f of ENV_FILES) {
    const file = join(root, f);
    if (!existsSync(file)) continue;
    const url = readFileSync(file, 'utf8').match(ENV_URL)?.[1];
    if (url) return { host: hostIn(url), from: f };
  }
  return null;
}

// The host a command names, then the host its checkout's .env names.
function targetOf(command, cwd) {
  const named = hostIn(command) ?? command.match(HOST_FLAG)?.[1];
  if (named) return { host: named, from: 'the command' };
  return hostOfEnv(checkoutRoot(projectRoot(), resolve(cwd, 'x'), process.cwd())) ?? { host: null, from: null };
}

export function refusal(command, cwd) {
  const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  const wipe = WIPES.find(([re]) => re.test(body))?.[1] ?? (RAW_WIPE.test(command) ? 'psql with DROP' : null);
  if (!wipe) return null;
  const { host, from } = targetOf(command, cwd);
  if (host && LOCAL.has(host.toLowerCase())) return null;
  const where = host ? `its target is ${host} (from ${from}), which is not this machine` : 'nothing says which database it would hit';
  return `\`${wipe}\` wipes a database, and ${where}.\n` +
    'A wipe runs only against a local database. If this one is local, name it in the command: `DATABASE_URL=postgres://localhost/<db> <command>`, or `-h localhost`.\n' +
    'If it is not, this is the user\'s to run, not Claude\'s: stop and ask.\n';
}

const main = (text) => judgeEvent(text, { name: 'db-wipe-guard', command: refusal }, process);

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const live = scratchProject({ '.env': 'DATABASE_URL=postgres://app@db.prod.example.com:5432/app\n' });
  const local = scratchProject({ '.env': 'DATABASE_URL="postgresql://app@localhost:5432/app"\n' });
  const compose = scratchProject({ '.env.local': 'export POSTGRES_URL=postgres://app@db/app\n' });
  const unknown = scratchProject({});
  const sh = (dir, cmd) => runHook(hook, dir, bashOf(cmd, dir)).status;
  return verdicts('db-wipe-guard', [
    ['a reset, with .env on a live host', sh(live, 'npx prisma migrate reset --force'), 2],
    ['a forced push there', sh(live, 'npx prisma db push --force-reset'), 2],
    ['data loss accepted there', sh(live, 'prisma db push --accept-data-loss'), 2],
    ['drizzle there', sh(live, 'npx drizzle-kit push --force'), 2],
    ['rails there', sh(live, 'bin/rails db:drop'), 2],
    ['django there', sh(live, 'python manage.py flush --no-input'), 2],
    ['psql dropping a database', sh(live, 'psql "$URL" -c "DROP DATABASE app"'), 2],
    ['after other steps', sh(live, 'git status && dropdb app'), 2],
    ['a live host named in the command beats a local .env', sh(local, 'DATABASE_URL=postgres://u@db.prod.example.com/app npx prisma migrate reset'), 2],
    ['a reset with .env on localhost', sh(local, 'npx prisma migrate reset --force'), 0],
    ['a compose service in .env.local', sh(compose, 'npx prisma migrate reset --force'), 0],
    ['no target anywhere', sh(unknown, 'dropdb app'), 2],
    ['a local host named in the command', sh(unknown, 'dropdb -h localhost app'), 0],
    ['a local url named in the command', sh(live, 'DATABASE_URL=postgres://localhost/app npx prisma migrate reset'), 0],
    ['a safe migrate', sh(live, 'npx prisma migrate deploy'), 0],
    ['a push with no force', sh(live, 'npx drizzle-kit push'), 0],
    ['words about a wipe', sh(live, "echo 'npx prisma migrate reset'"), 0],
    ['a heredoc body', sh(live, "cat <<'EOF'\nprisma migrate reset\nEOF"), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('db-wipe-guard', main));
