---
# concepts: build, shaders, painter
paths:
  - "placeholder"
---

# Dawn is pinned and built by us; shaders are embedded and validated at build time

<constraints>
Always do:
- Pin one Dawn commit, built from source with CMake (`DAWN_BUILD_MONOLITHIC_LIBRARY`, `find_package(Dawn)`, link `dawn::webgpu_dawn`), and sign it with the plugin. Dawn has no semver, its API changes often, and its GitHub nightlies are unsigned.
- Build only the backends we ship: Metal on macOS, Direct3D 12 on Windows. Turn off Vulkan, D3D11, the null backend, desktop GL, protobuf, and Tint's tests and command-line tools.
- Measure what Dawn adds to the plugin binary after dead-stripping, and record it in the build notes.
- Embed WGSL into the binary at build time, and validate every shader offline in CI with the `tint` command-line tool.
- Wire Dawn's blob cache (a `DawnCacheDeviceDescriptor` with load/store callbacks) with an isolation key that includes the plugin version, so the second launch skips shader compilation.
- Ship Dawn's BSD-3-Clause notice and its dependencies' licence notices (Abseil, Apache-2.0) in the credits.
- Debug builds: Full backend validation, `dump_shaders_on_failure`, `use_user_defined_labels_in_backend`, and labels on every pipeline and pass.

Never do:
- Use the `skip_validation` toggle, even in release builds.
- Build shader source from strings at runtime.
- Update the pinned Dawn commit without running the golden-image and frame-bench gates.
</constraints>

## Check
- `.claude/checks/dawn-backends-and-validation.json` blocks extra backends and `skip_validation`.
- CI: `tint` validates every `.wgsl`; the bench shows second-launch pipeline creation under 10% of the first.
Lesson check for this rule: `dawn-backends-and-validation`.
