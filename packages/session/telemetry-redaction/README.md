---
description: "Default secret redaction for outbound session telemetry: mounts audited rules on session-telemetry/record so every exported record body and attribute is scrubbed without deployment-written listeners."
kind: "package-reference"
---

# @deepseek-ai/dsh-telemetry-redaction

English | [中文](README.zh.md)

## Summary

`dsh-telemetry-redaction` fills the session-telemetry redaction slot with audited rules. Mounted beside a telemetry backend, it transforms every record on the `session-telemetry/record` waterfall: strings anywhere in `body`, `attributes`, nested arrays and nested objects pass through [`@deepseek-ai/dsh-redaction`](../../util/redaction/README.md), so private keys, API keys, bearer tokens, JWTs, GitHub and AWS keys, and secret assignments never reach the exporter. The canonical session log is never rewritten, and the input record is not mutated. A payload that cannot be copied losslessly (a cycle) withholds that record fail-closed.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Mount exactly one telemetry backend as usual, then mount the redaction plugin in the same composition:

```yaml
- name: '@deepseek-ai/dsh-session-telemetry-otel'
  config: { mode: full }
- name: '@deepseek-ai/dsh-telemetry-redaction'
```

The plugin has no configuration: the rules are security invariants. A deployment that mounts it needs no hand-written `session-telemetry/record` listener, which is the point of the default.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

The seam is a waterfall: each listener receives the recorded copy and may transform what `next()` returns before the backend emits it. This plugin calls `next()` first, then returns a copy whose `body` and `attributes` have every reachable string redacted by the shared rule set. Numbers, booleans, and `null` pass through unchanged. Cycle detection walks the copy stack; a cycle throws, and the seam's documented fail-closed behavior withholds that one record instead of exporting a partially redacted payload.

### Source map

- `src/index.ts` — the waterfall listener and the recursive, cycle-aware scrub.
- [`@deepseek-ai/dsh-redaction`](../../util/redaction/README.md) — the ordered rule set and its counts.

<a id="further-exploration"></a>
## Further Exploration

- [Session telemetry](../session-telemetry/README.md) — the seam, the record vocabulary, and the redaction waterfall.
- [OpenTelemetry backend](../session-telemetry-otel/README.md) — the shipped backend this plugin typically accompanies.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because the transform is pure over one record and owns no relation between independent observations. The leak gate in `tests/telemetry-redaction.spec.ts` exports 20 records with six secret families across body, nested values, and attributes and asserts zero leaks.

<a id="model-experience"></a>
## Model Experience

None, as the plugin transforms outbound telemetry copies and registers nothing model-facing; the canonical session log and every model request stay unchanged.

#### KV Cache effect

None; the package never assembles or alters a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Opt-in mount** — the default applies when the plugin is mounted; compositions that skip it keep the seam's unredacted outbound copy.
- **Rule based** — a credential format outside the six families passes through; extending coverage changes the shared rule module.
- **Fail-closed withholding** — a cyclic payload loses its telemetry record rather than exporting a partial redaction.
- **No field-level exemptions** — the whole record is scrubbed; a deployment that must preserve a specific field shape needs its own rule.
