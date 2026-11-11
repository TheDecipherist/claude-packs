// version-pin-guard: a dependency pin with no checked row in docs/versions.md is refused. A global hook (`global add` installs it into
// ~/.claude), so it is fired by its own path with the project in the environment, not from a project's `.claude/hooks`.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { git } from '../../fixtures/installs.mts';
import { assert, test } from '../../kit-cli.mts';
import { ROUTES, unrefused } from '../routes.mts';

const PIN_GUARD: string = fileURLToPath(new URL('../../../global/hooks/version-pin-guard.mjs', import.meta.url));

// version-pin-guard (global) judges dependency files; NotebookEdit cannot write one, so it has no route there.
test('version-pin-guard refuses an unchecked pin by every route that can write a dependency file', () => {
  const dir = scratchDir('cpr-pin-');
  put(join(dir, 'docs/versions.md'), '| name | latest | checked | source | used | decision |\n|---|---|---|---|---|---|\n');
  git(dir, 'init', '-q');
  const missed = unrefused(dir, null, 'requirements.txt', 'numpy==2.3.1\nPLACEHOLDER\n', 'requests==2.32.5', {
    routes: ROUTES.filter((r) => r !== 'NotebookEdit'), run: PIN_GUARD,
  });
  assert.deepEqual(missed, []);
  // the Edit gap: a new_string is taken literally ($& and $1 are text, not a replacement pattern)
  put(join(dir, 'package.json'), '{"dependencies":{"a":"1"}}\n');
  const edit = { tool_name: 'Edit', tool_input: { file_path: join(dir, 'package.json'), old_string: '"a":"1"', new_string: '"a":"1","b$&":"2"' } };
  const r = spawnSync('node', [PIN_GUARD], { input: JSON.stringify(edit), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.match(r.stderr, /b\$& 2: no row/);
});
