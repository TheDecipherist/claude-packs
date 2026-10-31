---
# concepts: audio
paths:
  - "placeholder"
---

# Parameter pointers are looked up once, never per block

<constraints>
Always do:
- In the processor constructor, cache `std::atomic<float>*` from `apvts.getRawParameterValue(id)` (or the typed `AudioParameterFloat*` etc.), and `jassert` that each one is non-null.
- In audio code, read with `->load()` once per block, then smooth (see smooth-continuous-parameters).

Never do:
- Call `getRawParameterValue()`, `getParameter()` or any lookup by string ID inside `processBlock` or anything it calls. Those are string compares and map lookups, every block, on the audio thread.
</constraints>

```cpp
// constructor
cutoff = apvts.getRawParameterValue (ids::cutoff.getParamID());
jassert (cutoff != nullptr);

// processBlock
const auto target = cutoff->load();
```

## Check
The realtime-guard hook flags `getRawParameterValue(` and `getParameter(` inside audio-thread bodies.
