---
# concepts: python
paths:
  - "placeholder"
---

# Errors are handled where something can be done; every resource closes itself

<constraints>
Always do:
- Catch the exception you expect, by name, where something can be done about it. Otherwise let it rise.
- Open files, sockets and locks with `with`.
- Give every network call a timeout.
- Pass `subprocess` a list of arguments, with `check=True` or a read of its return code.
- Compare with `None` by `is`.
- Default a mutable argument to `None` and build it in the function.
- Load YAML with `yaml.safe_load`.

Never do:
- Write a bare `except:`, or `except ...: pass`.
- Use `shell=True`, `eval` or `exec` on text that came from outside.
- Import with `*`.
</constraints>

## Check
`py-no-bare-except`, `py-no-swallowed-exception`, `py-no-mutable-default`, `py-no-shell-true`, `py-open-with-with`, `py-none-by-is`, `py-no-eval`, `py-no-star-import`, `py-requests-timeout`, `py-yaml-safe-load`.
