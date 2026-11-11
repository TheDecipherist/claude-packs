// What a secret looks like: secrets-guard refuses these in a write, and the logs mask them, so a log can be read and shared.
//   SECRETS: [[name, regex]]     maskSecrets(text) -> text with each one replaced by its name

/** A kind of secret: its name as the refusal says it, and the pattern that finds it (global). */
export type SecretPattern = readonly [name: string, pattern: RegExp];

export const SECRETS: readonly SecretPattern[] = [
  ['a GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ['an Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['an OpenAI key', /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ['an AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['a Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['a Stripe secret key', /\b[rs]k_live_[A-Za-z0-9]{20,}/g],
  ['a private key', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{64,}/g],
  // A key's random part runs unbroken; a long identifier (`cap_Filter_Env_Attack_2`) is short words between underscores.
  ['a prefixed API key', /\b(?!price_|prod_|pk_|[rs]k_live_|github_pat_|gh[pousr]_)(?=[a-z]{2,8}_)(?=[\w-]*[A-Z])(?=[\w-]*\d)(?=[a-z]{2,8}_[\w-]*?[A-Za-z0-9]{20})[a-z]{2,8}_[A-Za-z0-9_-]{24,}\b/g],
  ['a connection string with its password', /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^\s:@/'"`]+:(?!\$\{|\$[A-Za-z_]|<|\*+@|[^\s@]*(?:[Pp]ass(?:word|wd)?|[Cc]hange|[Ee]xample|[Yy]our|[Ss]ecret|[Pp]laceholder|xxx|XXX))[^\s@/'"`]{3,}@/g],
];

const WORDS = /\b(password|passwd|secret|token|api[_-]?key)(\s*[=:]\s*)(['"]?)[^\s'"&]{4,}/gi;

export const maskSecrets = (text: unknown): string => SECRETS.reduce((t, [name, re]) => t.replace(re, `[${name}]`), String(text)).replace(WORDS, '$1$2$3[masked]');
