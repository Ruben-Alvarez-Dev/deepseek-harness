# Operational design

## Context

Four email/key pairs are available in the current Pi user message. Existing `agnes-ai` resolves to the first supplied key, not an additional distinct credential. Targeted configuration/environment and 61 previous Pi sessions yielded no further distinct Agnes credential.

## Decisions

1. Read the already-persisted user message in memory, avoiding secret literals in shell commands, source files, tool output or new logs.
2. Use public Pi `ModelRuntime.login()` for enrollment backed by its locked credential store; preserve all existing entries and preflight destination aliases for conflicts. `AuthStorage` itself is not a public root export in Pi 1.1.0.
3. Keep `agnes-local` / `agnes-free` identity and policy for the existing credential. Put additional accounts in the same 10 RPM, concurrency-one group; never reset history to create capacity.
4. Store account-email attribution only in private local metadata. It reflects user declarations, not a verified provider identity endpoint.
5. Observe the selected active reservation from the standard `before_provider_request` payload hook, after acquisition while the lease still pins selection. Require exactly one matching lease for this child PID, then emit only account IDs and HTTP statuses after the agent ends. Pi's outer header hook can contain managed authentication rather than the selected credential, so it is not used to identify accounts. No secret/header/payload values are logged.
6. Use native Pi CLI requests with no contextual files, session persistence or operational tools. An optional inert `router_probe` tool checks actual agent continuation; payload hooks force one probe call followed by no tool calls.
7. Limit work to a rotation cycle and a two-inference tool continuation, serialize requests and space starts conservatively. Stop on a failure rather than use another key to overcome rejection/rate limiting.

## Security and limitations

Only the official Agnes endpoint and free Flash model are used. The private credential/config files use mode 0600. No quota independence, identity ownership, sustained capacity, daily allowance or billing claims follow from success. Unknown fifth-account identity cannot be invented. Opt-in test instrumentation is a development helper, not a production extension entrypoint.
