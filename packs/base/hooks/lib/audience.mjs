// A document that says it is addressed outside the project (KWB-127): a page of instructions for a person at the real
// machine, who sets the machine's own printed controls ("LFO 1", "VCO1 FREQ"), not the project's instances. One explicit
// marker, in a document's first lines, decided once per document and visible to every reader:
//     <!-- audience: outside -->
// It works only in documents (.md, .txt), never in source: a marker in a .cpp or .py exempts nothing.
// shape-law and brief-guard skip such a document. A spec, a brief, a recipe or code never carries it.
export const AUDIENCE_MARKER = '<!-- audience: outside -->';
const DOCUMENT = /\.(md|txt)$/i;
const HEAD_LINES = 5;
const MARKER = /^\s*<!--\s*audience:\s*outside\s*-->\s*$/i;

export function addressedOutside(rel, text) {
  if (!DOCUMENT.test(rel) || typeof text !== 'string') return false;
  return text.split('\n', HEAD_LINES).some((l) => MARKER.test(l));
}
