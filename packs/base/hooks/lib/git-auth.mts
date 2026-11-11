// git-auth: how a push and a `gh` call prove who they act as, for git-guard's house laws (KF-12). The laws used to assume one machine: a
// token variable, and `GH_TOKEN=$X` passed as text even with X unset, which proves nothing about the account. A project either
// names a token (ghAuth "token") or uses this machine's own git and gh login (ghAuth "cli"), and a refusal says which login that is.
//   NEW_INSTALL_GIT                   what a new install's guards.git holds (KF-8); lib/layout.mjs writes it, "enable": ["guards/git-house"] applies it
//   pushLaw(p, target, c)             a refusal for a push, or null. p: the words of the push; target: its URL; c: guards.git
//   ghLaw(cmd, p, c, env, login)      a refusal for a `gh` call, or null. cmd: the whole command, since a `source` before it may set the token;
//                                     env: the caller's, where the token variable may be set
//   loggedInAs(env)                   the account gh is logged in as, or ''
import { execFileSync } from 'node:child_process';
import { escapeRegExp } from './glob.mts';
import { sshOwner } from './push-form.mts';
import type { GitEnv, GitGuards } from './remote-heads.mts';

export const NEW_INSTALL_GIT: GitGuards = { house: true, ghAuth: 'cli', trunkNeedsYes: true };

const LOADS_ENV = /(?:^|[;&|(\s])(?:source|\.)\s+\S/;
const DEFAULT_TOKEN_VAR = 'PERSONAL_GITHUB_TOKEN';

export function pushLaw(p: string, target: string | null, c: GitGuards): string | null {
  const { owner } = c;
  const tok = c.tokenVar ?? DEFAULT_TOKEN_VAR;
  const cli = c.ghAuth === 'cli';
  const ssh = !owner || sshOwner(target) === owner; // over SSH the key picks the account; the URL names the repo (KWB-39). No owner: no repo to hold it to
  const named = new RegExp(`github\\.com/${escapeRegExp(owner ?? '')}/[\\w.-]+`);
  if (owner && !ssh && !named.test(p) && !(cli && named.test(target ?? ''))) {
    return `A push must name the repo: git push https://x-access-token:$${tok}@github.com/${owner}/<repo>.git <branch>, or a remote whose URL is git@github.com:${owner}/<repo>.git (SSH). ${c.accountNote ?? ''}`;
  }
  if (!cli && !ssh && !p.includes(`$${tok}`) && !p.includes(`\${${tok}}`)) return `A push names the token as $${tok}, never a pasted one.`;
  return null;
}

export function loggedInAs(env: GitEnv): string {
  try {
    return execFileSync('gh', ['config', 'get', 'user', '-h', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000, env }).trim();
  } catch {
    return ''; // no gh here, or no login: the refusal says less, and still refuses
  }
}

export function ghLaw(cmd: string, p: string, c: GitGuards, env: GitEnv, login: () => string = () => loggedInAs(env)): string | null {
  if (c.ghAuth === 'cli' || !/(^|\s)gh\s/.test(p)) return null;
  const tok = c.tokenVar ?? DEFAULT_TOKEN_VAR;
  const named = cmd.includes(`GH_TOKEN=$${tok}`);
  if (named && (env[tok] || LOADS_ENV.test(cmd))) return null;
  const who = login();
  const wayOut = `If this machine's own login is the right account${who ? ` (gh is logged in as ${who})` : ''}, set "ghAuth": "cli" in guards.git in .claude/layout.json, and no call names a token.`;
  if (named) return `$${tok} is not set here, so GH_TOKEN would be empty and gh would act as whichever account is logged in. ${wayOut}`;
  return `Every \`gh\` names the token: source ~/.env && GH_TOKEN=$${tok} gh ... ${c.accountNote ?? ''} ${wayOut}`;
}
