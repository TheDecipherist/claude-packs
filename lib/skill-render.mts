// skill-render: a skill as this project installs it. With layout.json "skillInvocation": "user", every skill is installed user-invocable
// only: `disable-model-invocation: true` and `user-invocable: true` in its frontmatter, so the model never has to choose it. The user,
// 2026-11-14: skills were loaded and never invoked; a work order's tasks carry their skills' constraints compiled in instead
// (`workorder compile`), and the skills stay for a person to call by name. Without the key a skill installs exactly as the pack ships it.
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';

const FRONT = /^---\n([\s\S]*?)\n---\n/;
const KEYS = /^(?:disable-model-invocation|user-invocable):.*(?:\n|$)/gm;

/** True when `rel` is a skill's main file. */
export const isSkillFile = (rel: string): boolean => /(^|[\\/])skills[\\/][^\\/]+[\\/]SKILL\.md$/.test(rel);

/** The skill's text as this layout installs it, or null when the layout leaves it as shipped (or the file has no frontmatter). */
export function renderSkill(text: string, layout: Pick<Layout, 'skillInvocation' | 'modelSkills'>): string | null {
  if (layout.skillInvocation !== 'user') return null;
  const m = FRONT.exec(text);
  if (!m) return null;
  // a skill the layout lets the model load itself installs as shipped: one a hook makes a precondition of work the session does
  // itself (analyse-reference-look before a reference picture, for a supervisor who draws pages; KWB-253)
  const name = /^name:\s*(.+)$/m.exec(m[1] ?? '')?.[1]?.trim();
  if (name !== undefined && (layout.modelSkills ?? []).includes(name)) return null;
  const front = (m[1] ?? '').replace(KEYS, '').replace(/\n+$/, '');
  return `---\n${front}\ndisable-model-invocation: true\nuser-invocable: true\n---\n${text.slice(m[0].length)}`;
}
