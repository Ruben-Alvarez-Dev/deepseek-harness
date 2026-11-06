---
slug: pi-account-router-hardening
status: planned
intent: clear
pending-action: await explicit start-work instruction; do not implement from this planning session
approach: Restore a green transport baseline, align Agnes quota treatment to current primary documentation, correct UI/documentation contracts, and add deterministic release gates. Each change is its own serialized OpenSpec change and is implemented test-first only after its change validates.
---

# Draft: pi-account-router-hardening

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| transport-contract | A compilable one-attempt stream contract with only explicit safe recovery | active | src/adapters/routed-streams.ts:149-410; openspec/specs/provider-transport/spec.md:37-50 |
| quota-policy | Configuration, examples and docs treat a quota pool as a provider-confirmed entitlement, not an API key | active | README.md:66; docs/agnes-research.md:44-51; examples/authorized-pool.json:4-14 |
| extension-ui | Footer width contract measures terminal display columns, not JavaScript code points | active | src/adapters/footer-label.ts:39-53; openspec/specs/pi-extension/spec.md:52-57 |
| documentation | Operational docs, historical evidence and research have explicit authority, audience and freshness | active | README.md; docs/project-status.md; docs/verification.md; research/README.md |
| release-gates | Every change is reproducibly validated before package release or merge | active | package.json:28-41; .github/ absent |
| episodic-memory | Future product initiative remains deliberately unimplemented and isolated | deferred | openspec/changes/episode-memory-reuse/tasks.md:1-8 |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| Daily Pi configuration outside this repository | Change repository artifacts and write a backup/validate/rollback runbook; never mutate the daily profile automatically | Original audit scope is this repository; credentials and usage history are safety-sensitive | yes |
| Agnes free-key scope | Treat keys of the same officially documented type as one shared pool unless the account owner has provider-confirmed separate entitlement evidence | Current Token Plan FAQ says keys of the same type share a pool | yes |
| CI hosting | Add GitHub Actions quality workflow and retain equivalent local commands | User accepted the recommended CI option | yes |
| Test strategy | TDD for behavioral code; tests-after only for documentation/CI artifacts | User accepted strict TDD | yes |
| Execution sequencing | One todo at a time; no overlapping OpenSpec changes or commits | User explicitly requested granular serialized execution | yes |

## Findings (cited - path:lines)
1. The dirty transport diff declares `fetchImpl` twice and fails TS2451 (`src/adapters/routed-streams.ts:260-261`); this blocks typecheck, full test discovery and package creation.
2. The dirty transport diff adds retries that conflict with the canonical only-safe-429 recovery (`src/adapters/routed-streams.ts:164-186,384-409`; `openspec/specs/provider-transport/spec.md:37-50`; `README.md:80-83`).
3. Repository materials claim/recommend one 10-RPM group per Agnes free key (`README.md:66`; `docs/agnes-research.md:48-51`; `examples/authorized-pool.json:5-12`), while current primary provider guidance says multiple keys of the same type share one pool.
4. The footer uses code-point count while its contract requires visible terminal width (`src/adapters/footer-label.ts:47-50`; `openspec/specs/pi-extension/spec.md:52-57`).
5. There is no tracked CI workflow; local gates exist in `package.json:28-41` but are not automatically run remotely.

## Decisions (with rationale)
1. Preserve the provider-native architecture. Pi 1.1.0 supports complete providers, `pi.registerProvider()`, OpenAI-compatible stream reuse and the lifecycle pattern already used here.
2. Do not implement episodic memory, latency EWMA, hedging, shadow agents or a proxy. They are separate future initiatives and do not repair audited defects.
3. Tighten the canonical transport contract instead of silently retaining the dirty retry feature. A response classification policy must be explicit, tested and must not replay after public output.
4. Do not infer entitlement independence from credential names, keys or one observational probe. The general router remains provider-neutral; provider evidence is required for a distinct group.

## Scope IN
1. Transport build repair and explicit retry/error contract.
2. Agnes quota-policy correction across examples, documentation, research, OpenSpec context and migration runbook.
3. Footer visible-width correctness.
4. Documentation authority/freshness structure and reproducible release-quality gates.
5. Full OpenSpec proposal, design, delta, task, validation, test evidence and archival lifecycle for every implemented change.

## Scope OUT (Must NOT have)
1. Any mutation of `~/.pi`, credentials, live provider accounts, usage history or state files.
2. Creating accounts, resetting quotas, bypassing provider limits, or claiming multiplied capacity.
3. Replacing the native provider with a proxy, changing Agnes models/endpoints, or implementing unrelated research initiatives.
4. Overwriting the pre-existing dirty files without first preserving their diff and proving the replacement against the canonical contract.

## Open questions
None. The user accepted the recorded defaults by asking to continue after the presented approach.

## Approval gate
status: approved-by-user-to-write-plan
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
