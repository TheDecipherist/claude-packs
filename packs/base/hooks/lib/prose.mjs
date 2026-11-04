// What a reader reads as prose in a markdown file (0.15.0): frontmatter, fenced code, inline code, HTML comments, link targets and URLs
// are blanked, line for line, so a check on public text never reads `npm test -- x` as a double dash. The same length and lines stay.
const blank = (s) => s.replace(/[^\n]/g, ' ');

export const blankProse = (text) => text
  .replace(/^---\n[\s\S]*?\n---\n/, blank)
  .replace(/^(```+|~~~+)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank)
  .replace(/<!--[\s\S]*?-->/g, blank)
  .replace(/`[^`\n]*`/g, blank)
  .replace(/\]\([^)\n]*\)/g, blank)
  .replace(/https?:\/\/\S+/g, blank);
