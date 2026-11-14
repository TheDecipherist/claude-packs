---
name: read-a-plugin-preset
description: Use when another plugin's preset file or bank format is to be decoded as a source of patches, before any field is named.
---

# Read a plugin preset (one job: a plugin's preset format decoded)

A plugin's preset is a file the maker's code wrote, and a published parameter list is not its layout.

<constraints>
Always do:
1. Look for an open-source converter or reader of the format first, and run it as a separate tool.
2. Map every region of the file, padding included, and tie each to a field.
3. Let the corpus identify the sources (which presets came from which bank), and check each pack's count against the vendor's list.
4. Read "stored" as not "set": a stored value may never reach the engine.

Never do:
- Treat the published parameter list as the layout.
- Name a field from its position in that list.
</constraints>
