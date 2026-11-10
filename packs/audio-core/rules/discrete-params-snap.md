---
# concepts: params
paths:
  - "placeholder"
---

# Stepped parameters store the step, never the raw host value

<constraints>
Always do:
- Make bool, choice and integer parameters snap any incoming normalised value to the nearest step, and store and report the snapped value. A host may send 0.37 to an on/off switch.
- Restore exactly the stepped value from saved state.

Never do:
- Rely on `juce::AudioParameterBool` keeping the snapped value. pluginval 2.0's strict discrete-parameter test fails it because it keeps the raw value. Wrap or replace it.
</constraints>

## Check
Unit test per stepped parameter: set normalised 0.37, save state, restore it. Pass: the value equals the stepped value both before and after the round trip.
