---
name: prove-tenant-isolation
description: Use when a route, a query or a role in a multi-tenant system is added or changed, or when asked whether one customer can reach another's data.
---

# Prove tenant isolation (one job: tenant B's id gets nothing from tenant A's session)

<constraints>
Always do:
1. Make two tenants in the test, against a real data store, each with its own records.
2. List every route that takes an id, and every message type that names one.
3. For each, call it as tenant A with tenant B's id, and expect 404 or an empty list, for reads, updates and deletes.
4. Read tenant B's record afterwards: it must be unchanged.
5. Do the same with every role a sign-up can reach.

Never do:
- Mock the data layer here: the filter is what is under test.
- Accept 403 where 404 hides that the record exists.
</constraints>
