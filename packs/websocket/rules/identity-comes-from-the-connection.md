---
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.go"
---

# Identity comes from the connection, and every message is authorised

<constraints>
Always do:
- Take who is speaking from the authenticated connection.
- Check a role per message type, as a route would.
- Bind a session to its owner, and send its output only to that owner.
- Re-check at token expiry and when a user is disabled.
- Delete a connection entry only if it is still this socket: `if (map.get(id)?.ws === ws) map.delete(id)`.

Never do:
- Trust an id, a hostname or a role inside a message.
- Send a token in the URL.
</constraints>

## Check
`ws-identity-from-message`, `stale-socket-deletes-new-entry`, `no-token-in-query`.
