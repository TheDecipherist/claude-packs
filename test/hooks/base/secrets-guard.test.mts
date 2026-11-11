// secrets-guard: a secret is never written into source, and a .env git does not ignore is never staged. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { SECRETS, maskSecrets } from '../../../packs/base/hooks/lib/secret-patterns.mts';
import { addedSecret, isSecretFile } from '../../../packs/base/hooks/secrets-guard.mts';
import { assert, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'secrets-guard.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'src/app.ts'), `const t = '${'gh' + 'p'}_${'a1B2'.repeat(9)}';\n`), status: 2 }),
});

test('a key under a custom prefix is a secret, and a private key file by its name', () => {
  const key = ['zz', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4'].join('_');
  assert.ok(addedSecret('', `const k = '${key}';`));
  assert.equal(addedSecret('', 'const snake_case_long_identifier_name_here = 1;'), null);
  assert.ok(isSecretFile('conf/keys/mail.private'));
});

// 0.27.0: a tutorial sample is not a secret.
test('a placeholder password is no secret; a real-looking one is', () => {
  for (const p of ['password', 'yourpassword', 'changeme', 'example123', 'xxxxxxxx', 'YourSecret1']) assert.equal(addedSecret('', `mongodb://admin:${p}@db:27017`), null, p);
  assert.ok(addedSecret('', `mongodb://admin:${['Tr0ub', 'adour9'].join('')}@db:27017`));
});

// 0.32.0: control names were reported as 11,410 secrets.
test('a long identifier is no secret, and a real key still is', () => {
  const found = (text: string): boolean => SECRETS.some(([, re]) => { re.lastIndex = 0; return re.test(text); });
  const control = (...parts: string[]): string => parts.join('_');
  for (const name of [control('cap', 'Filter', 'Env', 'Attack', '2', 'Lower', 'Panel'), control('knob', 'Osc1', 'Fine', 'Tune', 'Upper', 'Row', '3')]) assert.equal(found(`"name": "${name}"`), false, name);
  const key = ['whsec', 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cF0'].join('_');
  assert.equal(found(`const k = "${key}";`), true);
  assert.doesNotMatch(maskSecrets(`const k = "${key}";`), new RegExp(key));
});
