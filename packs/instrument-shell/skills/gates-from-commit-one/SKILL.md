---
name: gates-from-commit-one
description: Use when starting a new instrument, or when asked what gates a unit needs.
---

# Gates from the first commit (one job: a unit is proved from the day it exists)

<constraints>
Always do:
1. Start from the skeleton, with its gates wired into ctest.
2. Give each gate an in-process fault injection, and see it red.
3. Write to the state you inject: an injection that passes means dead code or a missing check.
4. Gate: clock, render reproduces, byte-exact round trip, spread, panel hit test.
5. Gate the plugin as a host sees it: pluginval at strictness 10 on every format the build makes, and `auval -v` on macOS, finishing in under 30 s. These are what `host-parameters-at-scale` demands at release; here they hold from commit one.
6. Audit for dead bindings, and for fields decoded but never read.
7. Test the gate itself, against a known-good unit and a known-bad one.
8. Name in a verdict which half of an AND failed.

Never do:
- Add gates after the bugs: nine units shipped deaf that way.
- Skip a host gate because its tool is missing: a gate that does not run passes nothing.
</constraints>

## The host gates in ctest

The kit describes the skeleton; it ships none. Put these lines in the plugin's `CMakeLists.txt`, after `juce_add_plugin`, with `enable_testing()` once at the top. `<Target>` is the plugin target, and the AU line takes the codes from its `PLUGIN_CODE` and `PLUGIN_MANUFACTURER_CODE` (`aumu` for an instrument, `aufx` for an effect):

```cmake
find_program (PLUGINVAL pluginval REQUIRED)
get_target_property (VST3_BUNDLE <Target>_VST3 JUCE_PLUGIN_ARTEFACT_FILE)
add_test (NAME pluginval COMMAND ${PLUGINVAL} --strictness-level 10 ${VST3_BUNDLE})

if (APPLE)
    add_test (NAME auval COMMAND auval -v aumu <Plug> <Manu>)
    set_tests_properties (auval PROPERTIES TIMEOUT 30)
endif()
```

- pluginval exits 1 when any test fails, so ctest reads it as is. `REQUIRED` stops the configure where pluginval is not installed, rather than leaving a gate out.
- `auval` finds only an installed component: build the AU with `COPY_PLUGIN_AFTER_BUILD TRUE`. The `TIMEOUT 30` is the 30 s the release law asks for.
- Each format the build makes gets its own pluginval line (`<Target>_AU` too, on macOS).
- See each one red once: a parameter whose state does not restore fails pluginval at 10, and a wrong subtype code fails `auval`.
</content>
</invoke>
