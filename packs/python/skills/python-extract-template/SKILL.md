---
name: python-extract-template
description: Use when template-law refuses Python code, when scan lists repeated Python, or when copying a Python file, class or block to change it.
---

# Extract a Python repeat into one template (one job: pick the Python form, and move every copy to it)

Follow `make-it-a-template`. This skill is its Python forms.

<constraints>
Always do:
1. A repeated block: one function, what differs as parameters, keyword-only where a call would read badly.
2. The same set-up and tear-down: a context manager.
   ```python
   @contextmanager
   def timed(label):
       start = perf_counter()
       yield
       log.info("%s took %.2fs", label, perf_counter() - start)
   ```
3. The same wrapping around many functions: a decorator, with `functools.wraps`.
4. One call with other arguments: rows and one loop.
   ```python
   ROWS = [("--host", "localhost"), ("--port", 8080)]
   for flag, default in ROWS:
       parser.add_argument(flag, default=default)
   ```
5. Fields that travel together: a `dataclass(frozen=True)`.
6. A whole file duplicated (a script beside a package): keep the package, and make the script import it.
7. Run what the change reaches. Then search for the old names: none is left.

Never do:
- Share through a module-level mutable value.
- Hide two different behaviours behind one flag.
</constraints>
