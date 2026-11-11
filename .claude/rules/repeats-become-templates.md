---
# concepts: cpp, python, js, rust, shell
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "packs/**/*.cpp"
  - "packs/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**/*.{js,mjs,cjs,ts,tsx}"
---

# Anything repeated becomes a template: pick the form that fits the repeat

Measured on real repos, repeats are rarely whole classes. They are blocks with other names, descriptors filled field by field, helpers copied from file to file, set-up copied at the top of every script, and tables written out as calls.

<constraints>
Always do:
- Match the repeat to its form, in any language:
  - A block with the same statements and other names: one function, with what differs as its parameters. `template-law` and `scan` list what differs.
  - One call repeated with other arguments: a table of rows and one loop.
  - The same wrapping around many functions (auth, retry, timing, logging): one wrapper.
- Keep the data in the table and the code in the template: a new instance is a new row, with no new code.
- Put the template where every user already imports or includes from, so nobody needs a copy to reach it. Search before writing a helper, and export it from the module its users already import.
- Name the template for what it builds, never for where it was first used.
- In JS and TS:
  - Markup used twice: one component, with what differs as props.
  - Handlers alike but for a few lines: one factory that returns the handler, each kind passing what is its own.
  - The same wrapping around many functions: one higher-order function.
  - One call repeated with other arguments: an array of rows and one loop, typed with `satisfies`.
  - Stateful logic shared between components: one hook.
- In Python:
  - The same set-up and tear-down around different work: a context manager.
  - The same wrapping around many functions: a decorator.
  - The same fields passed around together: a `dataclass`.
  - Classes alike except for a few values: class attributes on one base class. Except for a few methods: a base class or a `Protocol`, each kind holding only what is its own.
  - A script copied to start the next one: one module both import, with `if __name__ == "__main__":` in each.
  - Shared code in a package the scripts import, not beside them.
- In C++:
  - An object filled field by field (`bd.label = ...; bd.size = ...;`): one factory, `makeBuffer (device, label, size, usage)`, that returns it built.
  - A lambda or helper in more than one file: one free function in the header those files already share, or a new one named for what it does.
  - One call repeated with other arguments: a `constexpr std::array` of rows and one loop.
  - Near-identical classes: one class template over a traits struct, or one base class holding what they share. The class keeps only what is its own.
  - Near-identical pages or views: one builder that reads a table of rows.
- In Rust (the `rust-extract-template` skill has each with an example):
  - The same code over several types: a generic with a trait bound.
  - The same method on many types: a trait with a default method.
  - The same `impl` for many types, where a generic cannot do it: one `macro_rules!`.
  - The same code in two crates: the crate both depend on.
  - What varies by variant of an enum: a method in the enum's impl (`state.label()`), with a table of values on an enum kept with the enum.
  - Every variant matched by name, so a new variant is a compile error in each place that must decide (`clippy::wildcard_enum_match_arm` holds this).
  - `#[derive(...)]` and `thiserror`'s `#[from]` in place of hand-written impls.
- In shell:
  - What scripts share (logging, waiting, cleanup, argument checks) in one file they source: `. "$(dirname "$0")/lib.sh"`.
  - A new script started from the shared file, so it holds only what this script does.

Never do:
- Copy a block, a file, a script, a route, a handler or a page and change a few lines or its names: `template-law` compares shapes with names, numbers and strings stripped.
- Define `sleep`, `escapeHtml`, `formatDate` or the like again in a new file (JS and TS).
- Keep a package and a loose copy of the same module side by side (Python).
- Paste the same `if` or `trap` block at the top of each script (shell).
- Use a macro where a function, a `constexpr` table, a generic or a template does the job; a C++ macro is right only to stamp out rows a table cannot express, and a Rust trait with one implementor is no template.
- Put a `std::function` or a virtual call in a hot inner loop to share code: use a template parameter there (C++).
- Write `_ =>` on your own enum: it hides the next variant from the compiler (Rust).
- Treat a trait method as a copy: `from_str` on two types is the trait doing its job (Rust).
- Add a flag parameter to merge two things that are different. Two kinds with different behaviour are two kinds (`behaviour-lives-with-its-kind`).
</constraints>

## Check
`template-law` refuses a new copy, a near copy, a table written as calls and a function made again, with the copies and what differs. `scan` lists what a project already repeats, and the template each one becomes. `dispatch-once` refuses a second lookup table on one enum outside the enum's own file, `once-only` refuses a copy as written, and `rust-if-chain-is-a-match` refuses three `==` branches on one value. The forms of each language are walked by `make-it-a-template` and by `cpp-extract-template`, `python-extract-template`, `rust-extract-template` and `shell-extract-template`.
