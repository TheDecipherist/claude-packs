---
# concepts: nginx-conf
paths:
  - "placeholder"
---

# NGINX in front of containers resolves by name with a TTL, logs to stdout, and sends headers always

<constraints>
Always do:
- `resolver 127.0.0.11 ipv6=off valid=10s;` in `http {}` and upstreams by **service name** in a variable (`set $api http://api:3000; proxy_pass $api;`): NGINX otherwise resolves once at startup and keeps sending traffic to a replaced container's dead IP (`nginx-resolver-ttl`).
- `keepalive` in the upstream with `proxy_http_version 1.1;` and `proxy_set_header Connection "";` (`nginx-keepalive-http11`).
- `access_log /dev/stdout json;` and `error_log /dev/stderr;` with a JSON log format; never a file inside the container (`nginx-logs-to-stdout`).
- `/health` and `stub_status` on an internal-only port with `access_log off` and `allow`/`deny`, never on the public port.
- A non-HTTP upstream (MongoDB) goes in a top-level `stream {}` block, outside `http {}`.
- TLS: modern protocols and ciphers, session cache, OCSP stapling, certs from Docker secrets at `/run/secrets/`.
- Security headers with `always` so error responses carry them too (`nginx-headers-always`): `X-Content-Type-Options nosniff`, `X-Frame-Options DENY` or `frame-ancestors`, HSTS when TLS terminates here.
- A real `Content-Security-Policy` with explicit directives, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors`; rolled out as `Content-Security-Policy-Report-Only` first, then enforced.
- LF line endings (`nginx-no-crlf`): a CRLF config fails `nginx -t` with a nonsensical error.
- A WAF (ModSecurity + OWASP CRS) in front of anything public, DetectionOnly first (`waf-rollout` skill, `modsecurity-tuning` rule).

Never do:
- An IP address as an upstream (`compose-no-hardcoded-ip` applies here too).
- `'unsafe-inline'` or `'unsafe-eval'` in the CSP (`nginx-csp-no-unsafe`); use a nonce or a hash.
- Logs to `/var/log/nginx/*.log`.
</constraints>
