---
# concepts: python
paths:
  - "placeholder"
---

# Anything repeated in Python becomes a template: pick the form that fits the repeat

<constraints>
Always do:
- Match the repeat to its form:
  - A block with the same statements and other names: one function, with what differs as its parameters. `template-law` and `scan` list what differs.
  - The same set-up and tear-down around different work: a context manager.
  - The same wrapping around many functions (retry, timing, logging): a decorator.
  - The same fields passed around together: a `dataclass`.
  - One call repeated with other arguments: a list of rows and one loop.
  - Classes alike except for a few values: class attributes on one base class. Except for a few methods: a base class or a `Protocol`, each kind holding only what is its own.
  - A script copied to start the next one: one module both import, with `if __name__ == "__main__":` in each.
- Keep shared code in a package the scripts import, not beside them.

Never do:
- Copy a file to change a few lines, or keep a package and a loose copy of the same module side by side.
- Add a flag parameter to merge two things that are different.
</constraints>

## Check
`template-law` refuses a new copy, a near copy, or a function the repo already has. The `python-extract-template` skill walks the change.
