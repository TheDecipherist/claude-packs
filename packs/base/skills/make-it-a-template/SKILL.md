---
name: make-it-a-template
description: Use when template-law refuses a write, when scan lists repeated code, or when about to write something the project already has in another shape.
---

# Make a repeat one template (one job: the thing exists once, and its instances are data)

<constraints>
Always do:
1. List the copies. The refusal names them; `npx --no-install @thedecipherist/claude-packs scan` lists them all, with what each becomes.
2. Read what differs. The refusal's "differs only in" list is the template's parameters. No differences: it moves as it is.
3. Pick the form the refusal names: a component (markup), a factory (an object filled in), a function (a run of statements), a table and a loop (one call repeated). In C++, `cpp-extract-template` has the forms.
4. Find the place every copy can already reach. Name the template for what it builds.
5. Take the copies out first, each replaced by a call to the template, then write the template. `template-law` refuses the template while a copy stands, and `once-only` judges a command before it runs.
6. Test the template once, with an instance as a parameter (`test-the-template-once`), and prove the instances with one read of the table.
7. Run the tests the change reaches (`pick-tests`), then search for the copies by name: none is left.

Never do:
- Mark a repeat `one-off:` to get past the refusal. It is for something that truly differs, with its reason.
- Rename things so a copy passes. The law strips names.
- Leave some copies behind "for later": half a template is one more copy.
- Add a flag to merge two things with different behaviour: they are two kinds (`behaviour-lives-with-its-kind`).
</constraints>
