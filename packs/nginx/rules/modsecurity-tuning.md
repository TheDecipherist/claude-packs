---
# concepts: modsec
paths:
  - "placeholder"
---

# ModSecurity + CRS: detect first, tune to the stack, exclude narrowly

<constraints>
Always do:
- `SecRuleEngine DetectionOnly` for the first 2 to 4 weeks; flip to `On` only after the audit log has been tuned. Shipping blocking mode on day one is how a team rips the WAF back out.
- Start at paranoia level 1; raise only after real exclusion work. Tuning is about the anomaly score, not one rule.
- Tune to the stack. Node + MongoDB: the real threat is NoSQL injection, which the SQLi rules miss: add rules that block MongoDB operators in parameters and JSON bodies (`$gt`, `$ne`, `$where`, `$regex`), prototype pollution (`__proto__`, `constructor.prototype`) and server-side JS; drop the PHP, Java and IIS rule files; keep SQLi only if SQL exists anywhere in the architecture.
- Exclusions are targeted: one rule, one URI or parameter, `ctl:ruleRemoveById=…` scoped with `SecRule REQUEST_URI "@beginsWith /api/orders"`. JSON APIs are the usual false-positive source; scope to the API paths.
- Skip static assets and health endpoints from inspection; cap scanned body sizes; keep response-body inspection on for data-leakage rules; update the CRS regularly; ship the audit log to the SIEM.
- Test every rule change two ways: known attack payloads must be detected, replayed real traffic must still pass.

Never do:
- `ctl:ruleEngine=Off` for a whole path, or a blanket allowlist (`modsec-no-blanket-off`): it turns the WAF off exactly where it is needed.
- Paranoia 3 or 4 as a default.
- Let the WAF stand in for input validation, safe query construction and CSP in the app; it is the layer on top.
</constraints>

## Check
Lesson check for this rule: `modsec-no-blanket-off`.
