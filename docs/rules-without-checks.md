# Rules with no check

A rule that a regex or a script can hold becomes a check or a hook (`skill-writing`). These rules have no lesson check naming them and
no `# hook:` line: what they ask for is judged by reading, by ear or in a rendered page, or a hook or a test holds it without
the rule saying so. A rule here is a candidate only if someone finds a pattern that does not misfire. This list is written by
`node scripts/counts.mts`.

- **audio-core:** `a-control-is-proved-through-its-input`, `audio-thread-realtime-safe`, `audio-ui-thread-handoff`, `boundary-tests-cross-the-boundary`, `cached-parameter-pointers`, `clang-tidy-core-guidelines`, `colour-by-role`, `column-names`, `control-reaches-every-surface`, `cpu-worst-case-per-block`, `dc-block-after-asymmetry`, `discrete-params-snap`, `display-echo`, `every-time-control-syncs`, `filters-stable-under-modulation`, `host-parameter-names`, `host-parameters-at-scale`, `house-control-behaviours`, `instance-grid`, `keys-belong-to-the-keyboard`, `knob-anatomy`, `knob-gestures`, `math-domain-guards`, `modulated-delay-interpolation`, `modulation-by-drag-and-drop`, `modulation-overview-page`, `module-kill-switch`, `multiband-phase-coherent`, `nonlinear-stages-antialiased`, `note-ledger-and-pedals`, `one-formula-per-value`, `oscillators-bandlimited`, `output-limiter`, `pan-and-mix-equal-power`, `panel-colour-safe`, `panel-sizes-by-kind`, `panel-surfaces`, `panel-tabs`, `parameter-ids-never-change`, `params-snapshot-per-block`, `patch-excludes-performance-controls`, `prepare-is-repeatable`, `presses-held-for-the-firmware`, `recursive-state-nan-guard`, `release-lock`, `reverb-loop-gain-bounded`, `sample-accurate-midi`, `sample-rate-and-block-size-from-host`, `section-header-and-lamp`, `settings-layer-owns-the-devices`, `signal-reads-left-to-right`, `smooth-continuous-parameters`, `state-load-versioned-and-safe`, `straight-on-and-aligned`, `undo-one-gesture-one-step`, `voice-steal-fades`, `voice-sum-headroom`
- **base:** `a-gate-measures-the-real-thing`, `behaviour-lives-with-its-kind`, `bug-fix-starts-red`, `debt-gates-fail-on-rise`, `instances-by-index-identities-by-id`, `open-items-tagged`, `plan-and-logs`, `references-use-anchors`, `refusals-are-judged`, `second-time-is-a-tool`, `skill-writing`, `subagent-dispatch`, `unattended-runs`
- **ci:** `generated-files-have-no-diff`
- **content-site:** `content-has-one-source`
- **cpp:** `cpp-builds-share-one-compiler-cache`, `cpp-gates-share-one-reader`, `cpp-static-analysis-runs`
- **docker:** `dockerfile-multistage`
- **dynamic-data:** `a-list-is-a-saved-query`, `definitions-are-validated-data`, `fields-have-owners`, `imports-drop-nothing`, `one-definition-many-surfaces`, `tenant-costs-one-document`
- **fastify:** `tests-use-inject`
- **gpu-painter:** `gpu-antialiasing`, `gpu-blend-order`, `gpu-bloom`, `gpu-frame-budget`, `gpu-frame-pacing-and-power`, `gpu-golden-images`, `gpu-hdr-and-tonemap`, `gpu-picking-on-cpu`, `gpu-text-atlas`, `gpu-travellers-from-snapshot`, `hover-every-pressable`
- **http-api:** `adapters-one-db-gateway`, `handlers-own-the-work`, `health-and-correlation`, `routes-are-thin`
- **instrument-shell:** `fold-keeps-every-route`, `hidden-under-a-layer-is-idle`, `menu-is-one-route-table`, `quiet-announces-itself`, `render-the-extremes`, `seams-are-declared`
- **js-ts:** `files-under-300-lines`, `guard-clauses-over-nesting`, `named-constants-not-magic-numbers`, `no-floating-promises`, `no-param-mutation`, `one-logger`, `parallel-independent-awaits`, `small-functions`, `typed-exports`, `zod-at-route-boundaries`
- **midi:** `imports-count-every-loss`, `nrpn-and-packed-values`, `sync-is-a-mode`
- **postgres:** `postgres-one-pool-per-process`
- **reverse-engineering:** `a-field-may-be-an-index`, `a-negative-names-what-was-scanned`, `addresses-name-their-space`, `decode-from-a-proven-boundary`, `findings-are-withdrawn-in-place`, `layout-closes-on-itself`, `names-before-code`, `reproduction-or-original`, `two-sources-before-naming`
- **rust:** `rust-borrow-before-you-clone`
- **sound-design:** `algorithms-are-data`, `counter-oscillators-quantise`, `full-matrix-first`, `gate-both-faults`, `model-the-mechanism`, `reference-presets-are-statistics-only`, `seeds-are-hashed`, `unreachable-is-said`, `waveforms-and-octaves`
- **stellix:** `stellix-reset-generated`, `world-continuous-collision`
- **synth-creator:** `copy-trees-read-only`, `debug-by-measurement`, `docs-are-current`, `done-means-fresh-evidence`, `hooks-and-gates`
- **ui-craft:** `page-holds-its-frame`, `page-proved-rendered`, `screen-answers-one-question`, `survives-real-data`, `type-space-colour`, `url-holds-the-state`
- **web:** `tailwind-v4`
- **writing:** `cut-the-padding`, `direct-voice`, `no-cargo-cult`, `no-scaffolding`, `write-from-your-own-corner`
- **zod:** `env-shapes-only`, `zod-4-schemas`
