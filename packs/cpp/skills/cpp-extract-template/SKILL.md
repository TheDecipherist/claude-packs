---
name: cpp-extract-template
description: Use when template-law refuses C++ code, when scan lists repeated C++, or when copying a C++ class, lambda or block to change it.
---

# Extract a C++ repeat into one template (one job: pick the C++ form, and move every copy to it)

Follow `make-it-a-template`. This skill is its C++ forms.

<constraints>
Always do:
1. A struct filled field by field, the same fields each time: a factory.
   ```cpp
   wgpu::Buffer makeBuffer (const wgpu::Device& device, const char* label, uint64_t size, wgpu::BufferUsage usage) {
       wgpu::BufferDescriptor d; d.label = label; d.size = size; d.usage = usage;
       return device.CreateBuffer (&d);
   }
   ```
2. A lambda repeated across files: a free function in a shared header. Pass what it captured as arguments, or make it a member of the class every copy sits in.
3. One call with other arguments: rows and one loop.
   ```cpp
   struct Row { const char* id; float value; };
   constexpr std::array kRows { Row { "kind", 0.0f }, Row { "key_hi", 87.0f } };
   for (const Row& r : kRows) set (e, r.id, r.value);
   ```
4. Classes alike except for a few values: one class template over a traits struct. Except for a few methods: one base class, each kind overriding only what is its own.
   ```cpp
   template <typename Traits> class Pass { /* the shared body reads Traits::kLabel, Traits::kFormat */ };
   ```
5. Builders alike (pages, panels, views): one builder over a table of rows, one row per control.
6. A hot inner loop: share through a template parameter, never a `std::function` or a virtual call, and null-test the change where the project does.
7. Build, then run what the change reaches. A header change reaches everything that includes it, so read the include list before choosing the header.

Never do:
- Move code into a header the copies do not already reach, adding an include that crosses a layer.
- Use a macro where a function or a template works.
- Share code between a copy tree and the project: a copy tree stays as its source wrote it (`kind: copy`).
</constraints>
