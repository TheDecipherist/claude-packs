---
name: design-a-definition
description: Use when designing an entity, a field, a screen or a generic admin in a definition-driven system, or when a CMS needs a new kind of thing.
---

# Design a definition (one job: the new thing is data, and every surface comes from it)

<constraints>
Always do:
1. Write the entity as one definition: its collection, its tenant chain, and each field once with key, label, type, owner and access.
2. Add overlays only for what a surface needs. Layout belongs in pages.
3. Name each field's owner: a user, the system, or an integration. Decide what the `touched` latch protects.
4. Write lifecycle guards as data: "cannot enable until these are filled".
5. Write conditions in the one expression language. Reach for a named predicate only when the language cannot say it.
6. Attach behaviour as named hooks on the one write path, and declare whether each observes or changes the patch.
7. Validate it against the meta-schema, and check what references it, both ways.
8. Prove it on the hardest real entity you have, not a sample. Then check the cost of a new tenant is still one document.

Never do:
- Add code for something a definition can say.
- Add a per-entity branch to a generic screen.
- Add a config language.
- Let a page grant access: it can only show what the engine allows.
</constraints>
