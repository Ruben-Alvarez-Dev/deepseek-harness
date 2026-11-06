# Real four-credential verification

Verified **2026-10-09 (UTC)** with Pi **1.1.0** and `agnes-3.0-flash`, following explicit user authorization to enroll the supplied keys.

## Inventory and private enrollment

- The user supplied **four distinct keys**. Existing `agnes-ai` exactly matches the first supplied key; it is **not a fifth**.
- Targeted Agnes model configuration, environment references and 61 previous Pi sessions yielded no additional distinct credential. This does not rule out an account stored elsewhere; no fifth identity is invented.
- Three new credential references were persisted through public Pi `ModelRuntime.login()` and its locked credential store: `agnes-msb`, `agnes-planetary`, `agnes-dianez`.
- The original `agnes-ai` credential and all other pre-existing auth entries remain unchanged. `models.json` and default `settings.json` remain unchanged.
- Reference-only profile: `~/.pi/agent/account-router.json`. Private email attribution: `~/.pi/agent/account-router-accounts.json`. Email/key associations are user-declared, not verified by a provider identity endpoint.
- All four accounts were enrolled under the then-assumed shared `agnes-free`: **10 RPM aggregate, concurrency one**. Existing quota history was preserved during enrollment, not deleted or moved to a new namespace.

> **Corrected 2026-10-10.** A bounded probe showed the free limit is enforced **per key**: one key returned 429 after ~10 requests in a rolling minute while a second key was accepted immediately and the first stayed rejected. The profile was corrected to one 10 RPM group per key. The evidence below was collected under the earlier shared-group configuration; the inference results and rotation still stand, but the aggregate-RPM assumption does not.
- Auth, profile, attribution and sanitized verification files have mode **0600**. No credential literals are stored in project source or package artifacts.

## Actual native Pi results

Executed `PI_ROUTER_LIVE=1 npm run test:live:accounts` with six sequential inference requests and no transport retries. Outer tests start at least seven seconds apart; dependent tool continuation remains sequential inside Pi. Thinking is off and output is bounded to 128 tokens. Context files, MCP, session persistence and operational tools are disabled.

| Inference | Selected account ID | HTTP | Outcome | Input / output / total tokens |
| --- | --- | --- | --- | --- |
| 1 | `agnes-msb` | 200 | `ROUTER_OK` | 118 / 4 / 122 |
| 2 | `agnes-planetary` | 200 | `ROUTER_OK` | 118 / 4 / 122 |
| 3 | `agnes-dianez` | 200 | `ROUTER_OK` | 118 / 4 / 122 |
| 4 | `agnes-local` → existing `agnes-ai` | 200 | `ROUTER_OK` | 118 / 4 / 122 |
| 5 | `agnes-msb` | 200 | Valid `router_probe({"value":"ok"})` tool call | 345 / 26 / 371 |
| 6 | `agnes-planetary` | 200 | Tool result present; final `ROUTER_TOOL_OK` | 176 / 5 / 181 |

**Total reported usage: 1,040 tokens.** All four distinct configured credentials were exercised. The real Pi agent executed the inert probe exactly once and sent its `AGNES_TOOL_OK` result to the next account. The probe performs no network, filesystem or operational action.

The opt-in observer uses only standard Pi extension APIs. Its native payload hook reads the active reservation while the lease still pins account selection; it rejects ambiguous ownership instead of guessing from stale post-request state. Response hooks record HTTP status. Observations are emitted after the agent ends as a standard Pi custom message, never raw stdout. Pi's outer header hook can expose managed authentication rather than the subsequently selected key, so it is **not** treated as proof of account selection. No header/credential/prompt/provider-body values are logged.

Sanitized persistent evidence: `~/.pi/agent/account-router-accounts-verification.json`.

## Acceptance checks

- `npm run check`: strict TypeScript, recommended Biome rules with warnings fatal, **100 deterministic tests in 8 files**.
- The added local-endpoint CLI test verifies the observer, actual inert tool execution and continuation before live use.
- `npm run check:specs`: canonical capability specifications and the operational change validate strictly. The operational change declares `skip_specs: true` because it changes no production capability behavior.
- `npm pack`: source package remains standard; the opt-in helper scripts are development tooling, not shipped extension entrypoints.
- Existing real credential values are checked in memory against source/package file contents without printing values or fingerprints.

## What this proves—and does not

**Proven:** four distinct configured credentials work for the chosen Flash model; proactive native routing works across real requests; a real tool continuation survives the credential switch; no replay or fallback was required in this run.

**Not proven:** independently additive quotas across *account types* (free/enterprise/TokenPlan), permission to aggregate capacity, actual provider account-email ownership, daily allowances, sustained throughput, billing, large-context/image behavior or failure recovery under real provider pressure. All testing respected a conservative budget; the single per-key 429 observed on 2026-10-10 was incidental to the independence check, not a load test. Billing was not inspected, and model cost metadata is not an invoice.

No fifth distinct key was found. No new accounts were created, no API keys were reproduced in this report, and no global model/default settings were changed.
