---
# concepts: cpp
paths:
  - "placeholder"
---

# Anything repeated in C++ becomes a template: pick the form that fits the repeat

Tim: anything found repeated should have something that makes it reusable and template-like. Measured on a real C++ repo: 950 copies in 302 repeats, almost none of them whole classes. They were descriptors filled field by field, helpers copied from file to file, and tables written as calls.

<constraints>
Always do:
- Match the repeat to its form:
  - An object filled field by field (`bd.label = ...; bd.size = ...; bd.usage = ...;`): one factory, `makeBuffer (device, label, size, usage)`, that returns it built.
  - A lambda or helper in more than one file: one free function in the header those files already share, or a new one named for what it does.
  - A block with the same statements and other names: one function, with what differs as its parameters. `template-law` and `scan` list what differs.
  - One call repeated with other arguments: a `constexpr std::array` of rows and one loop.
  - Near-identical classes: one class template over a traits struct, or one base class holding what they share. The class keeps only what is its own.
  - Near-identical pages, panels or views: one builder that reads a table of rows.
- Keep the data in the table and the code in the template: a new instance is a new row, with no new code.
- Put the template where every user already includes from, so nobody needs a copy to reach it.
- Name the template for what it builds, never for where it was first used.

Never do:
- Copy a block and change its names. `template-law` compares shapes with names, numbers and strings stripped.
- Use a macro where a function, a `constexpr` table or a template does the job. A macro is right only to stamp out rows a table cannot express.
- Add a flag parameter to merge two things that are different. Two kinds with different behaviour are two kinds (`behaviour-lives-with-its-kind`).
- Put a `std::function` or a virtual call in a hot inner loop to share code: use a template parameter there.
</constraints>

## Check
- `template-law` refuses a new copy, with the copies and what differs. The `cpp-extract-template` skill walks the change.
- `npx --no-install @thedecipherist/claude-packs scan` lists what a project already repeats, and the template each one becomes.
