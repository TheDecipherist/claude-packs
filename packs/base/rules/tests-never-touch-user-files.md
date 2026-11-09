---
# concepts: tests
paths:
  - "placeholder"
---

# A test never reads or writes a user's files: it gets copies in a fresh temporary folder

A gate built the real processor, which reads its data from a path named by an environment variable (or one compiled in at configure) that pointed at the user's own bank, and keeps the user's additions in a file beside it. The gate read what the user had done in the app, so its checks went red, and its processor could write into that file.

<constraints>
Always do:
- Treat anything the app reads or writes at run time as the user's: documents, an archive, a settings or data folder, a bank, a preset or session file, and the file beside it that holds what the user added.
- Give each test's process copies of what it needs, in a fresh temporary folder, and name that folder in place of the user's paths (the environment variable, the setting, the constructor argument) before the code under test starts. Make that folder through one helper the project's test harness owns (`cpp-gates-share-one-reader`), and have every test use it.
- Prove it with the project's own check: the paths the code under test resolves are inside the temporary folder and are not the user's, and the user's files are byte for byte the same after a run (a hash before and after). Plant the fault, a test that is left to read the user's path, and see the check go red.
- Run a test's environment from the helper, so a path under the user's home never sits in a build file's test properties.

Never do:
- Let a test read a path that names the user's own files, through an environment variable, a compiled-in default or a setting the app saved.
- Write to the user's folder from a test, or give it a path under the user's home that is not a temporary or build folder; `tests-run-in-a-temp-folder` refuses a test target whose environment names one.
- Count a test green because it passed on this machine: it may have read what only this user has.
</constraints>

## Check
`tests-run-in-a-temp-folder` (lesson check) and the project's before-and-after hash of the user's files.
