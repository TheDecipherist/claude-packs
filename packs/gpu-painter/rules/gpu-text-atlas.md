---
# concepts: painter, shaders
paths:
  - "placeholder"
---

# Text is drawn from a glyph atlas the app builds from the shipped fonts

Spec rule 2 allows fonts as files and runtime caches; this is how text uses both.

<constraints>
Always do:
- Build an MTSDF atlas (multi-channel distance field plus a true distance channel) at runtime from the shipped TTF/OTF files with msdfgen and msdf-atlas-gen (MIT), with FreeType under its FTL licence for loading outlines.
- For small text (under about 12 px on screen), rasterise a hinted grey atlas per scale factor at runtime (FreeType, or JUCE drawing glyphs into an `Image`). Distance fields look soft at that size.
- Rebuild the atlas when the scale changes (100–200%), never ship one.
- Credit FreeType in the docs as its FTL licence requires.

Never do:
- Ship a pre-built atlas image (that's a pre-rendered image; the `no-shipped-images` hook refuses it).
- Rasterise text on the CPU every frame.
</constraints>

## Check
Golden text sheet at 9, 11, 14 and 24 pt × 100, 150 and 200%. Pass (house): FLIP mean below 0.02 against a hinted FreeType reference at small sizes, and no corner rounding visible at 24 pt. Upgrade path if MSDF artefacts show: Slug (patent now public domain, MIT/Apache reference shaders).
