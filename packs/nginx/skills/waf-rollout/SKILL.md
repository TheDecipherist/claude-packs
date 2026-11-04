---
name: waf-rollout
description: Use when a web app or API is about to be deployed or exposed publicly, or when asked whether to put a WAF in front of something. Decides and plans the ModSecurity + OWASP CRS rollout; the config detail is the modsecurity-tuning rule.
---

# waf-rollout

One thing: decide the WAF and plan its rollout, once, when something goes public.

<constraints>
Always do:
1. Raise it once, with the reason: a public endpoint with no WAF is the common failure, not a misconfiguration. Defense in depth: it sits on top of input validation (`schema-single-source-of-truth`), safe queries (`mongo` pack) and CSP, never instead of them.
2. Recommend ModSecurity + OWASP CRS at the nginx layer (a managed WAF if there is no proxy).
3. Plan: DetectionOnly for 2 to 4 weeks → review the audit log → targeted exclusions for false positives → flip to blocking. Tune the rule set to the stack (Node + MongoDB: NoSQL-injection rules in, PHP/Java/IIS files out).
4. Hand the config work to the `modsecurity-tuning` rule, which loads on the config files themselves.

Never do:
- Ship blocking mode on day one.
- Present the WAF as the security story.
</constraints>
