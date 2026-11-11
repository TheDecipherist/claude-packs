# Integration tests

The flows that install on purpose, `test/integration/FLOW.test.mts`, each on a fixture built once per run (the typescript order's
d-6): install from the tarball, update, noop against the per-version manifest, doctor, new, scan, workorder, global, release,
worktrees, hook-proof, hook timing, configurations, custom packs, kit-lock and test-changed. The order's W5 fills this folder.
