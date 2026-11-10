---
# concepts: params
paths:
  - "placeholder"
---

# Loading state is versioned and can never crash

<constraints>
Always do:
- Write a `version` attribute on the root of every saved state and patch.
- In `setStateInformation` and patch loading: null-check the XML or JSON, check the root tag, read the version, migrate older versions forward step by step, then apply.
- Ignore unknown IDs (from a newer build), and keep defaults for IDs missing in old data.
- Load on the message thread, then hand values to the engine through the parameter system.

Never do:
- Dereference the result of `getXmlFromBinary()` or a JSON parse without checking it.
- Assume the saved data was written by the current build.
</constraints>

## Check
Test: load an empty block, random bytes, a v1 patch and a patch with an unknown extra ID, and assert no crash, sane defaults, and the known values restored.
