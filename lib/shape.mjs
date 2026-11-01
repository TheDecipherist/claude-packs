// The shape law's one reader lives with the hooks (packs/base/hooks/lib/shape.mjs), because every project gets it
// installed beside them; the kit's own commands (doctor, `shape scan`, new) read it through this file.
export * from '../packs/base/hooks/lib/shape.mjs';
export { findSelectorDefs, findUnknownTypes } from '../packs/base/hooks/lib/shape-code.mjs';
