---
# concepts: cpp
paths:
  - "placeholder"
---

# A name that several units share is prefixed with its unit

Two units in one build tree that share a test, target or resource name collide: a CTest property lookup finds the other unit's test, a shared resource name is overwritten, and both pass.

<constraints>
Always do:
- Prefix every test, target, resource and output name with its unit's name.
- Give each test its own working directory.
- Refuse a duplicate test or target name across the tree, in the configure step.

Never do:
- Name a test, target or output with a bare word another unit could also use.
</constraints>
