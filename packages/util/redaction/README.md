---
description: "Fixed, audited secret-redaction rules for untrusted text, shared by captures and outbound telemetry: private keys, API keys, bearer tokens, JWTs, GitHub and AWS keys, and secret assignments."
kind: "package-reference"
---

# @deepseek-ai/dsh-redaction

English | [中文](README.zh.md)

## Summary

`dsh-redaction` is the single home for the harness's fixed secret-redaction rules. `redactSecrets(text)` replaces private key blocks, `sk-` API keys, bearer tokens, JWTs, GitHub tokens, AWS access keys, and `API_KEY=`/`password=` style assignments with stable placeholders, and returns per-rule counts so a caller can record what it removed. The rules are security invariants, not configuration: they are ordered, deterministic, pure, and never mutate the input. Captures and outbound telemetry share this module instead of growing their own rule lists.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

```ts
import { redactSecrets } from '@deepseek-ai/dsh-redaction'

const { text, summary } = redactSecrets('API_KEY=super-secret-value')
// text === 'API_KEY=[REDACTED]'
// summary === { count: 1, kinds: { 'secret-assignment': 1 } }
```

The package has no configuration and no services. `REDACTION_RULE_NAMES` lists the rules in application order for audit surfaces.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Rule order and placeholders

Rules apply in a fixed order so a broad rule cannot split a secret a narrower rule would have recognized: PEM private key blocks first, then `sk-` keys, bearer tokens, JWTs, GitHub tokens, AWS access keys, and finally key/value assignments. Each replacement uses a stable placeholder (`[REDACTED_API_KEY]`, `[REDACTED_JWT]`, …) except assignments, which keep the variable name (`API_KEY=[REDACTED]`) so the structure of the surrounding record stays readable. Counts are aggregated per rule name.

### Source map

- `src/index.ts` — the ordered rules, `redactSecrets`, `REDACTION_RULE_NAMES`, and the result types.

<a id="further-exploration"></a>
## Further Exploration

- [Telemetry redaction](../../session/telemetry-redaction/README.md) — the outbound-telemetry consumer of these rules.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because the package is a pure text filter with no relation between independent observations; a rule change is a security change and must update the rule-order test and the telemetry leak gate together.

## Known Limitations and Deferred Work

- **Pattern based** — a credential format these rules do not name passes through; extending the list updates this single home.
- **False positives possible** — a string shaped like a secret is redacted even when it is not one; placeholders keep the surrounding structure readable.
- **No semantic classification** — the rules cannot prove that a value is or is not a credential; they are a fixed, auditable filter, not a classifier.
- **Text only** — callers redact fields they choose; the module does not walk arbitrary structures (the telemetry plugin does that around it).
