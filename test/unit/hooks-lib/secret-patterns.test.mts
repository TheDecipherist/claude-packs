// secret-patterns.mts: what a secret looks like, what a log masks, and which file names are secret files. Secrets are built at run time, never written whole here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SECRETS, isEnvFile, isSecretFile, maskSecrets } from '../../../packs/base/hooks/lib/secret-patterns.mts';

const nameOf = (text: string): string[] => SECRETS.filter(([, re]) => { re.lastIndex = 0; return re.test(text); }).map(([n]) => n);

test('each kind of secret is found by its own pattern', () => {
  assert.deepEqual(nameOf(`ghp_${'a'.repeat(36)}`), ['a GitHub token']);
  assert.deepEqual(nameOf(`sk-ant-${'x'.repeat(30)}`), ['an Anthropic key']);
  assert.deepEqual(nameOf(`AKIA${'A'.repeat(16)}`), ['an AWS access key']);
  assert.deepEqual(nameOf(`xoxb-${'1'.repeat(12)}`), ['a Slack token']);
  assert.deepEqual(nameOf(`mongodb+srv://user:${'hunter'}22@host/db`), ['a connection string with its password']);
});

test('a placeholder password and a long identifier are not secrets', () => {
  assert.deepEqual(nameOf('mongodb://user:$MONGO_PASSWORD@host/db'), []);
  assert.deepEqual(nameOf('postgres://user:yourpassword@host/db'), []);
  assert.deepEqual(nameOf('cap_Filter_Env_Attack_2_long_identifier_here'), []);
});

test('maskSecrets replaces a secret by its name, masks a password word, and takes any value', () => {
  const token = `ghp_${'b'.repeat(36)}`;
  assert.equal(maskSecrets(`push with ${token} now`), 'push with [a GitHub token] now');
  assert.equal(maskSecrets('password=hunter2x'), 'password=[masked]');
  assert.equal(maskSecrets(undefined), 'undefined', 'a planted non-string is read as text, never thrown on');
});

test('secret files are found by name; an example list of names is not one', () => {
  for (const f of ['.env', 'a/.env.local', 'k.pem', 'id_rsa', 'credentials.json', 'x/server.key']) assert.equal(isSecretFile(f), true, f);
  for (const f of ['.env.example', '.env.sample', 'README.md', 'envfile']) assert.equal(isSecretFile(f), false, f);
  assert.equal(isEnvFile('.env'), true);
  assert.equal(isEnvFile('id_rsa'), false);
});
