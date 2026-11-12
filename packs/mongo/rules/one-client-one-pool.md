---
# concepts: db-gateway, db-scripts
paths:
  - "placeholder"
---

# One MongoClient per process: it IS the pool

The client owns the connection pool (`maxPoolSize`, default 100 per server). A second client is a second pool. Five clients at defaults can claim a free Atlas cluster's whole 500-connection budget before one query runs, and `client.close()` per request does not help: it adds a full TCP/TLS/auth handshake per request and pools still overlap under load.

<constraints>
Always do:
- Create the client **once, in the gateway**, cached on `globalThis`, because hot reload (Next.js dev, tsx watch) re-runs module scope and a plain module-level client stacks a new pool per save:
  ```ts
  const g = globalThis as { __mongoClient?: MongoClient };
  export function mongoClient(): MongoClient {
    g.__mongoClient ??= new MongoClient(env.MONGODB_URI, { appName: env.APP_NAME, maxPoolSize: env.MONGO_POOL_SIZE, ignoreUndefined: true });
    return g.__mongoClient;
  }
  ```
- Set `appName`: it tags every connection in the Atlas dashboard, so "who is eating our connections" becomes a lookup.
- Set `maxPoolSize` on purpose. The real ceiling is pool size × running instances, and that product must fit under the cluster's connection limit. Serverless and Next.js route handlers: 5–10.
- URI from the config module only (`env-through-config`). **Never log, print or paste it.**
- Export `closeDb()` from the gateway and call it from the process lifecycle **after** the HTTP server has closed (`process-lifecycle` in js-ts). Nowhere else closes the client.
- One-off scripts, seeds and migrations: connect, work, `close()`, exit. That is the one place connect-work-close is right, because the process ends.

Never do:
- `new MongoClient` outside the gateway or a script. The `mongoclient-outside-gateway` check refuses it.
- `new MongoClient` in the gateway without `globalThis` and `appName`. The `mongoclient-cached-and-named` check refuses it.
- `client.close()` after a query, in a route, or in a `finally` of request code.
- `connect()` lazily inside a request handler: connect at startup so the first request is not the one that discovers a bad URI.
</constraints>

## Check
Lesson checks for this rule: `mongoclient-cached-and-named`, `mongoclient-outside-gateway`.
