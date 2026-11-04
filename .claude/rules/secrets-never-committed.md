---
# hook: secrets-guard.mjs
---
# A secret never lands in git: it lives in an ignored .env and is read by name

<constraints>
Always do:
- Keep every secret (a token, a key, a password, a connection string with its password) in an ignored `.env` or the machine's own store, and read it at run time by name (`process.env.X`, `os.environ["X"]`).
- Commit a `.env.example` with the names and no values, and add `.env` to `.gitignore` before the first `.env` is written.
- Shape the environment in one place (an `env.ts`, or the language's equal): the names, their types and which are required, never a value.
- Name a token on the command that uses it (`$PERSONAL_GITHUB_TOKEN`), never its value.

Never do:
- Stage or commit a `.env`, a key file (`*.pem`, `*.key`, `id_rsa`) or `credentials.json`; `secrets-guard` refuses it, and `git add -A` while one is not ignored.
- Write a literal token, key, private key block or connection-string password into source, tests, docs or config; `secrets-guard` refuses the write.
</constraints>
