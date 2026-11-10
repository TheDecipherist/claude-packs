| name | latest stable | checked | source | used | decision |
|---|---|---|---|---|---|
| jscpd | 5.4.2 | 2026-11-01 | https://registry.npmjs.org/jscpd (`npm view jscpd version`: 5.4.2, published 2026-10-20) | 5.4.2 | optionalDependency: the once-only hook's copy-paste detector (a Rust binary; 0.3 s for a whole synth repo of 580 sources, measured) |
| yaml | 2.9.1 | 2026-11-09 | https://registry.npmjs.org/yaml (`npm view yaml version`: 2.9.1, latest; 3.0.0-2 is next, a pre-release) | 2.9.1 | dependency: parses a work order's install block (`lib/install-block.mjs`, `init --from`); no dependencies of its own, ISC; the kit had no YAML parser (planner W3) |
