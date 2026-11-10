---
# concepts: tsconfig
paths:
  - "placeholder"
---

# tsconfig is strict and stays strict

## The law
Every tsconfig keeps:
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```
Never loosen these to make an error go away. Fix the code instead.

## Check
Resolve the effective config (this handles `extends` and comments) and assert it in the hook:
```bash
npx tsc --showConfig -p tsconfig.json | node -e '
  const c = JSON.parse(require("fs").readFileSync(0)).compilerOptions;
  const need = ["strict","noUncheckedIndexedAccess","exactOptionalPropertyTypes","noImplicitOverride"];
  const off = need.filter(k => c[k] !== true);
  if (off.length) { console.error("tsconfig not strict:", off.join(", ")); process.exit(2); }'
```
Exit code 2 makes a Claude Code PostToolUse hook block and report it.
