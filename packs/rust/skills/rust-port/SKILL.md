---
name: rust-port
description: Use when porting code to Rust from another language, or rewriting a module in Rust.
---

# Port to Rust (one job: the same behaviour, in Rust's own shapes)

<constraints>
Always do:
1. Pin the behaviour first: tests or recorded input and output from the old code, kept as the proof.
2. Write down who owns each piece of state. A shared mutable object becomes one owner that lends, or a message to the task that owns it.
3. Map each failure the old code can have to a variant of an error type. An exception becomes a `Result`; a null becomes an `Option`.
4. Map an inheritance tree to an enum when the set of kinds is closed, and to a trait when it is open.
5. Port one module at a time behind the same interface, and run the pinned tests after each.
6. Keep a behaviour the old code has even if it looks wrong, and list it. Change it in its own step.
7. Compare speed only after it is correct, on a release build.

Never do:
- Translate line by line: a class with getters and shared pointers everywhere is the old language in Rust's syntax.
- Reach for `Rc<RefCell<T>>` or `unsafe` to keep the old shape.
- Change behaviour and language in the same step.
</constraints>
