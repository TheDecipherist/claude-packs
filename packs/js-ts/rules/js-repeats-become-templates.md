---
# concepts: js
paths:
  - "placeholder"
---

# Anything repeated in JS or TS becomes a template: pick the form that fits the repeat

<constraints>
Always do:
- Match the repeat to its form:
  - Markup used twice: one component, with what differs as props.
  - A block with the same statements and other names: one function, with what differs as its parameters. `template-law` and `scan` list what differs.
  - Handlers alike but for a few lines: one factory that returns the handler, each kind passing what is its own.
  - The same wrapping around many functions (auth, retry, timing): one higher-order function.
  - One call repeated with other arguments: an array of rows and one loop, typed with `satisfies`.
  - Stateful logic shared between components: one hook.
- Export a helper from the module its users already import, and import it. Search before writing one.

Never do:
- Define `sleep`, `escapeHtml`, `formatDate` or the like again in a new file.
- Copy a route, a handler or a page to change a few lines.
</constraints>

## Check
`template-law` refuses a new copy, a near copy or a function the repo already has. `make-it-a-template` walks the change.
