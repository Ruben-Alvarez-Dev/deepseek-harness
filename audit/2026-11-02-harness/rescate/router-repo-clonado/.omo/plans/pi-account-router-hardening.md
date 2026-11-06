# pi-account-router-hardening - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** An immutable private v1 snapshot plus an isolated v2 package that builds, tests and packages reproducibly; describes provider quotas conservatively; has a reliable status footer; and is protected by local and GitHub quality gates.

**Why this approach:** It first restores the proven transport contract, then treats provider quota scope as an entitlement fact rather than an API-key inference. Each deliverable follows its own validated OpenSpec lifecycle, preventing a green command from being mistaken for a complete change.

**What it will NOT do:** It will not alter v1, your daily Pi configuration, credentials, usage history or provider account. It will not create accounts, bypass limits, add the separate memory/agent research initiatives, or claim extra capacity.

**Effort:** XL
**Risk:** High - the deployed quota policy conflicts with current provider guidance, and the tree has uncommitted transport behavior.
**Decisions to sanity-check:** Conservative shared-pool default; no live migration without separate authorization; strict TDD and GitHub Actions adoption.

Your next move: explicitly ask to start work when you want implementation; this plan is intentionally not implementation. Full execution detail follows below.

---

> TL;DR (machine): XL/high-risk; four serialized OpenSpec changes repair transport, quota policy, footer width and reproducible release gates without mutating external Pi state.

## Scope
### Must have
- Preserve v1 as the immutable `v1-baseline` tag and execute all changes only in the separate `v2-hardening` worktree.
- Restore a reproducible build, lint, complete test suite and npm package.
- Specify and test safe stream recovery precisely; no logical replay after public output.
- Make a quota group represent a provider-confirmed shared entitlement; unknown scope is conservative/shared.
- Repair terminal display width, documentation authority/freshness, traceability and deterministic CI.
- Create, validate, implement, verify and archive a separate OpenSpec change for each deliverable capability.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No mutation of `~/.pi`, `auth.json`, credentials, provider accounts, quota history or state files.
- No modification, rebase or forced update of `main` or `v1-baseline`.
- No quota circumvention, account creation, quota reset or assertion that distinct keys establish distinct capacity.
- No proxy rewrite, provider/model change, memory, EWMA, hedging, shadow agents or unrelated refactor.
- No retry/reacquire after public text, tool-call or other stream output.
- No archive based only on syntax validation, test counts or self-report.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD with Vitest 4.1.11 for all behavioral changes; tests-after only for documentation/CI artifacts with command-based validation.
- Evidence: `.omo/evidence/pi-account-router-hardening/task-<N>.md`, containing command, exit code, timestamp and sanitized result. Never record secrets, headers, prompts, account IDs or raw provider responses.
- Every OpenSpec change: focused failing test → minimal implementation → focused pass → `npm run check` → `npm run check:specs` → both npm audits → `npm pack --dry-run` where applicable.
- Provider guidance: retrieve the official Agnes Token Plan and Terms pages at execution date, record URL/title/date/minimal policy quote, and label it guidance rather than proof of this user's entitlement.
- Compiler output is authoritative when it conflicts with an editor/LSP diagnostic.
- Worktree gate: verify `main` resolves to `v1-baseline` and the active worktree is on `v2-hardening` before each implementation task.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

**Strict serial execution:** run tasks 1 through 20 in numeric order. Waves classify the work but grant no parallelism. A task cannot start until its predecessor has evidence and has not exposed a scope conflict. The next OpenSpec change cannot open until the preceding one is archived.

| Wave | Outcome | OpenSpec change |
| --- | --- | --- |
| 0 | Preserve evidence and restore transport | `repair-transport-contract` |
| 1 | Align provider quota semantics | `align-agnes-quota-scope` |
| 2 | Enforce terminal display width | `enforce-footer-visible-width` |
| 3 | Reproducible docs and release gates | `release-quality-gates` |

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1-6 | Immutable v1 + v2 worktree | 7-20 | None |
| 7-11 | Transport archive | 12-20 | None |
| 12-14 | Quota archive | 15-20 | None |
| 15-20 | Footer archive | Final verification | None |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 0 — repair transport contract

- [ ] 1. Verify immutable v1 snapshot and isolated v2 execution boundary.
  What to do / Must NOT do: Record the `v1-baseline` annotated tag, its commit and its clean private remote reference; record the absolute v2 worktree path and `v2-hardening` branch. Verify all implementation will occur only in v2. The v1 snapshot is an exact filesystem baseline, not a claim that it passed quality gates. MUST NOT amend, rebase, reset, force-push or modify `main`/`v1-baseline`.
  Parallelization: Wave 0 | Blocked by: none | Blocks: 2-20
  References: `v1-baseline` tag; `main`; `v2-hardening`; `git worktree list --porcelain`; `.omo/plans/pi-account-router-hardening.md:23-50`.
  Acceptance criteria: `git show-ref --verify refs/tags/v1-baseline`, `git ls-remote --tags origin v1-baseline`, and `git -C <v2-path> branch --show-current` confirm the intended boundary; `main` remains at the tag target.
  QA scenarios: happy—run reference/worktree checks; failure—any worktree on `main`, moved tag or unexpected remote reference is a hard stop. Evidence `.omo/evidence/pi-account-router-hardening/task-1.md`.
  Commit: N | evidence only.

- [ ] 2. Specify `repair-transport-contract` before source changes.
  What to do / Must NOT do: Create proposal, design, tasks and delta under `openspec/changes/repair-transport-contract/specs/provider-transport/spec.md`. Define each pre-output class—429, 400, 401/403, 5xx, network, timeout and abort—and prohibit replay after public output. MUST NOT change canonical specs or implementation yet.
  Parallelization: Wave 0 | Blocked by: 1 | Blocks: 3-6
  References: `openspec/config.yaml:3-26`; `openspec/specs/provider-transport/spec.md:1-50`; `README.md:80-88`; `docs/verification.md:63-76`; archived implementation design `openspec/changes/archive/2026-10-09-implement-account-router/design.md:21-27`.
  Acceptance criteria: every delta requirement has SHALL plus WHEN/THEN; proposal separates accidental duplicate declaration from policy; `npm run check:specs` exits 0.
  QA scenarios: happy—strict validation; failure—invalid local fixture is rejected by `openspec validate` and removed immediately. Evidence task-2.
  Commit: N | open change.

- [ ] 3. Add transport tests that fail on unsafe retry/replay.
  What to do / Must NOT do: Extend existing fixture tests for pre-output 429 recovery, 400, 401/403, 5xx, network error, timeout, abort and post-output/tool-call failure. Assert HTTP attempt count plus lease/group cleanup. MUST NOT call Agnes or use credentials.
  Parallelization: Wave 0 | Blocked by: 2 | Blocks: 4
  References: `tests/transport.test.ts`; `tests/extension.test.ts`; `tests/router.test.ts`; `src/adapters/routed-streams.ts:149-410`; Pi custom provider contract `node_modules/@earendil-works/pi-coding-agent/docs/custom-provider.md:120-154`.
  Acceptance criteria: focused suite has an intentional pre-implementation failure attributable to retry contract; negative cases prove counts/state, not just text.
  QA scenarios: happy—`npx vitest run tests/transport.test.ts tests/extension.test.ts`; failure—fixtures prove unsafe class would send a second request. Evidence task-3.
  Commit: N | test and implementation atomic.

- [ ] 4. Implement minimal transport repair against the approved delta.
  What to do / Must NOT do: Remove duplicate `fetchImpl`; retain only the exact safe recovery chosen in OpenSpec; remove `maxTransientRetries` and related types/config unless the approved delta explicitly retains an opt-in, narrowly classified policy. MUST NOT touch routing selection, credentials, models or external Pi config.
  Parallelization: Wave 0 | Blocked by: 3 | Blocks: 5
  References: `src/adapters/routed-streams.ts:149-410`; `src/application/router.ts:102-149`; `src/config.ts:30-257`; `src/domain/types.ts`; task-2 delta.
  Acceptance criteria: `npm run typecheck`, targeted Biome and focused tests pass; unsafe classes make at most one request; no retry after public output.
  QA scenarios: happy—pre-output 429 behaves as spec; failure—400/401/403/5xx/network/abort/partial stream obey the exact no-replay contract. Evidence task-4.
  Commit: N | deferred.

- [ ] 5. Update transport-facing public claims and archive the transport change.
  What to do / Must NOT do: Align `README.md`, `docs/verification.md` and `docs/project-status.md` with task-4 behavior; label fixture versus live evidence. Then run full local gates and archive only on green. MUST NOT report real provider failures that were not exercised.
  Parallelization: Wave 0 | Blocked by: 4 | Blocks: 6-20
  References: `README.md:72-88`; `docs/verification.md:45-76`; `docs/project-status.md:20-55`; `package.json:28-41`; task-2 OpenSpec tasks.
  Acceptance criteria: no stale retry claim; `npm run check`, `npm run check:specs`, both audits and `npm pack --dry-run` pass; change archived and canonical spec updated.
  QA scenarios: happy—complete command chain; failure—any failed command leaves the change unarchived. Evidence task-5.
  Commit: Y | `fix(transport): restore explicit safe stream recovery contract`.

### Wave 1 — align quota scope

- [ ] 6. Capture dated primary Agnes policy evidence, without provider activity.
  What to do / Must NOT do: Retrieve official Token Plan FAQ and Terms, record only URL/title/date/minimal passages on same-type key pools and rate-limit circumvention. MUST NOT use dashboard, keys, quota probes or account IDs.
  Parallelization: Wave 1 | Blocked by: 5 | Blocks: 7-11
  References: `https://wiki.agnes-ai.com/en/docs/tokenplan`; `https://wiki.agnes-ai.com/en/docs/terms-of-service`; `README.md:66,95`; `docs/agnes-research.md:44-51`.
  Acceptance criteria: evidence is sanitized and labels provider text as guidance, not individual entitlement proof.
  QA scenarios: happy—approved content retrieval; failure—unavailable/ambiguous source blocks progress rather than being replaced by local inference. Evidence task-6.
  Commit: N | evidence only.

- [ ] 7. Specify `align-agnes-quota-scope` in OpenSpec.
  What to do / Must NOT do: Add proposal/design/tasks and deltas for only affected capabilities. Define a quota group as a confirmed shared entitlement; unknown scope collapses to conservative sharing; distinct keys never prove distinct budgets. Preserve provider neutrality. MUST NOT state all providers use one global quota.
  Parallelization: Wave 1 | Blocked by: 6 | Blocks: 8-11
  References: `openspec/config.yaml:3-10`; `openspec/specs/account-routing/spec.md`; `openspec/specs/pi-extension/spec.md`; `openspec/specs/project-acceptance/spec.md`; task-6 evidence.
  Acceptance criteria: strict OpenSpec validation; every requirement has scenarios and permits separately documented entitlements without asserting them.
  QA scenarios: happy—`npm run check:specs`; failure—review rejects “per key”/“N × quota” as unqualified policy language. Evidence task-7.
  Commit: N | open change.

- [ ] 8. Correct examples, docs and research without erasing historical observations.
  What to do / Must NOT do: Make `examples/authorized-pool.json` shared-group by default or explicitly provider-neutral with confirmed-entitlement placeholders. Update all per-key claims in README, `docs/agnes-research.md`, status/performance/account verification docs and research line documents; retain dated local observation only as non-authoritative history. MUST NOT manufacture a new measurement.
  Parallelization: Wave 1 | Blocked by: 7 | Blocks: 9
  References: `examples/authorized-pool.json:1-15`; `README.md:42-66,95`; `docs/agnes-research.md:7,44-51,95`; `docs/accounts-verification.md:12-48`; `docs/performance.md:7,54-57`; `research/README.md:19-32`; task-6 evidence.
  Acceptance criteria: no public Agnes text or example says separate free keys establish independent capacity; provider-neutral independent-pool support remains explicit.
  QA scenarios: happy—parse JSON examples; failure—search and inspect every `per key`, `per-key`, `N ×`, `40 RPM` hit. Evidence task-8.
  Commit: N | docs/examples atomic with tests.

- [ ] 9. Test all distributed configuration examples and write the external migration runbook.
  What to do / Must NOT do: Extend config tests to parse each example and reject literal credentials, unsafe URLs and duplicate resolved keys across groups. Add a repository-only runbook with backup/validate/rollback/stop steps for an operator to make same-entitlement keys shared. MUST NOT infer entitlement in the parser or mutate an external file.
  Parallelization: Wave 1 | Blocked by: 8 | Blocks: 10
  References: `tests/config.test.ts`; `src/config.ts:30-257`; `examples/*.json`; `.gitignore:7-9`; `docs/verification.md:72-76`.
  Acceptance criteria: examples parse; invalid fixtures fail; runbook has no real paths/keys/destructive commands and says it does not prove authorization/independence.
  QA scenarios: happy—`npx vitest run tests/config.test.ts`; failure—literal key, unsafe remote HTTP and duplicate key/group fixture reject. Evidence task-9.
  Commit: N | deferred.

- [ ] 10. Verify and archive quota-scope change.
  What to do / Must NOT do: Run focused and complete deterministic gates; review docs/examples against provider evidence; archive only when green. MUST NOT execute the migration runbook or live tests.
  Parallelization: Wave 1 | Blocked by: 9 | Blocks: 11-20
  References: tasks 6-9; `package.json:28-41`; `openspec/config.yaml:12-26`.
  Acceptance criteria: config tests, `npm run check`, strict specs, audits and pack pass; change archived; README names evidence date and uncertainty boundary.
  QA scenarios: happy—full deterministic suite; failure—source change/unavailable or claim mismatch blocks archival. Evidence task-10.
  Commit: Y | `docs(quota): align Agnes pool guidance with provider policy`.

### Wave 2 — enforce footer width

- [ ] 11. Specify `enforce-footer-visible-width`.
  What to do / Must NOT do: Add proposal/design/tasks and `pi-extension` delta for display columns, ANSI exclusion, wide/combining emoji, ellipsis and suffix priority. Select exact installed-Pi or dependency-free width utility before coding. MUST NOT hide the defect by raising the cap or removing all suffixes.
  Parallelization: Wave 2 | Blocked by: 10 | Blocks: 12-14
  References: `openspec/specs/pi-extension/spec.md:52-57`; `src/adapters/footer-label.ts:1-53`; `tests/footer.test.ts`; installed Pi `docs/tui.md`.
  Acceptance criteria: each listed class has a WHEN/THEN scenario; `npm run check:specs` passes.
  QA scenarios: happy—strict validation; failure—code-point-only width logic is rejected by test design. Evidence task-11.
  Commit: N | open change.

- [ ] 12. Add failing footer display-column tests.
  What to do / Must NOT do: Test plain and ANSI output, ASCII, CJK/full width, emoji, combining marks, truncated model, undefined account and all suffixes using a display-column oracle. MUST NOT assert raw JavaScript string length.
  Parallelization: Wave 2 | Blocked by: 11 | Blocks: 13
  References: `tests/footer.test.ts`; `src/adapters/footer-label.ts:36-53`; task-11 delta.
  Acceptance criteria: pre-implementation suite fails specifically on an over-wide display case; ASCII labels/colors remain stable.
  QA scenarios: happy—`npx vitest run tests/footer.test.ts`; failure—show existing code-point behavior violates display width. Evidence task-12.
  Commit: N | implementation pair.

- [ ] 13. Implement width-aware truncation and archive footer change.
  What to do / Must NOT do: Add minimal selected width calculation; reserve suffix width; keep ANSI resets valid; update comments/docs. Run full gates and archive. MUST NOT change routing/accounting behavior or add a UI framework.
  Parallelization: Wave 2 | Blocked by: 12 | Blocks: 14-20
  References: `src/adapters/footer-label.ts:19-53`; `tests/footer.test.ts`; `README.md` footer/status text; task-11 delta.
  Acceptance criteria: every vector fits `FOOTER_MAX_WIDTH` display columns; exactly balanced color reset; `npm run check`, strict specs, audits and pack pass; change archived.
  QA scenarios: happy—focused and full gates; failure—CJK/emoji/tiny room/all suffix vectors block archive on regression. Evidence task-13.
  Commit: Y | `fix(ui): enforce footer display-width contract`.

### Wave 3 — durable docs and release gates

- [ ] 14. Specify `release-quality-gates`.
  What to do / Must NOT do: Create proposal/design/tasks and a new `release-verification` spec (or smallest suitable canonical update after convention check). It SHALL require deterministic CI without credentials/live calls, requirement-to-evidence separation and archive discipline. MUST NOT require `PI_ROUTER_LIVE=1` in CI.
  Parallelization: Wave 3 | Blocked by: 13 | Blocks: 15-20
  References: `package.json:28-41`; `openspec/specs/project-acceptance/spec.md`; `docs/verification.md:41-76`; `.github/` absent.
  Acceptance criteria: strict validation passes; no requirement treats fixture or local success as full live acceptance.
  QA scenarios: happy—`npm run check:specs`; failure—reject CI requirement with live variable or credential. Evidence task-14.
  Commit: N | open change.

- [ ] 15. Establish documentation authority and freshness.
  What to do / Must NOT do: Clearly designate README as operational entry point; provider constraints as dated primary-source guidance; verification as fixture/local/live ledger; project status as current status; research as unimplemented roadmap. Correct perpetual test-count claims. Keep history with context, not deletion. MUST NOT assert SLA, independent capacity or completed memory work.
  Parallelization: Wave 3 | Blocked by: 14 | Blocks: 16
  References: `README.md`; `docs/agnes-research.md`; `docs/verification.md`; `docs/project-status.md`; `docs/performance.md`; `docs/accounts-verification.md`; `research/README.md`; `openspec/changes/episode-memory-reuse/tasks.md:1-8`.
  Acceptance criteria: all local Markdown links resolve; each evidence doc has audience/date/authority boundary; current docs contain no unqualified historical green-count claim.
  QA scenarios: happy—link checker/Node script; failure—claims audit rejects unqualified quota/SLA/memory statements. Evidence task-15.
  Commit: N | grouped with gates.

- [ ] 16. Add local and GitHub Actions deterministic quality gates.
  What to do / Must NOT do: Add `.github/workflows/quality.yml` for push/PR with Node 22, `npm ci`, `npm run verify`, both audits and `npm pack --dry-run`; add a local helper only if it removes duplication. MUST NOT access secrets, run live tests, upload state or rewrite files.
  Parallelization: Wave 3 | Blocked by: 15 | Blocks: 17
  References: `package.json:28-41`; `.gitignore:1-9`; Pi package guidance `node_modules/@earendil-works/pi-coding-agent/docs/packages.md:42-92`; GitHub Actions official docs current at execution.
  Acceptance criteria: YAML/actionlint validation succeeds; clean install passes local equivalent; workflow contains no `PI_ROUTER_LIVE`, secrets or write-capable external command.
  QA scenarios: happy—`npm ci && npm run verify && npm audit --audit-level=low && npm audit --omit=dev && npm pack --dry-run`; failure—workflow scan rejects live variable/secret. Evidence task-16.
  Commit: N | deferred.

- [ ] 17. Test package contents and CI contract.
  What to do / Must NOT do: Add a small check that parses `npm pack --dry-run --json`, verifies only intended public resources and confirms CI invokes canonical local verification. MUST NOT commit generated tarballs or inspect external state.
  Parallelization: Wave 3 | Blocked by: 16 | Blocks: 18
  References: `package.json:16-45`; `.gitignore:1-9`; workflow from task 16.
  Acceptance criteria: package excludes `.env`, router state, `.pi`, `auth.json`, `.omo` and generated artifacts; check runs locally.
  QA scenarios: happy—parse pack JSON; failure—temporary ignored sentinel in isolated test fixture causes validation failure, then only sentinel is removed. Evidence task-17.
  Commit: N | grouped with gates.

- [ ] 18. Build requirement-to-evidence traceability and archive release gates.
  What to do / Must NOT do: Map every canonical SHALL in routing, transport, Pi extension, project acceptance, transcript integrity and release verification to focused test/command/evidence or an explicit live unknown. Run all deterministic gates from clean install and archive only on success. MUST NOT turn untested provider behavior into a pass.
  Parallelization: Wave 3 | Blocked by: 17 | Blocks: 19-20
  References: all `openspec/specs/*/spec.md`; `tests/*.test.ts`; `docs/verification.md`; `docs/project-status.md`; evidence tasks 1-17.
  Acceptance criteria: no canonical SHALL lacks verification or explicit unknown classification; all gates pass; `release-quality-gates` archived.
  QA scenarios: happy—clean `npm ci`, verify, audits, pack, workflow lint and strict OpenSpec; failure—any unmatched requirement blocks archive. Evidence task-18.
  Commit: Y | `ci: enforce reproducible router quality gates`.

- [ ] 19. Write readiness handoff with exact remaining boundaries.
  What to do / Must NOT do: Document completed changes, command evidence, provider-policy uncertainty, migration runbook, rollback and optional live-test prerequisites. MUST NOT call the package production-proven or run the migration.
  Parallelization: Wave 3 | Blocked by: 18 | Blocks: 20
  References: task-9 runbook; task-18 matrix; `docs/project-status.md`; `docs/verification.md`; archived changes.
  Acceptance criteria: every claim links to evidence; no credential/account data; every unresolved live boundary is explicit.
  QA scenarios: happy—claims checklist review; failure—reject “production proven”, “independent quota” or equivalent unsupported phrase. Evidence task-19.
  Commit: Y | `docs: record router hardening readiness and limits`.

- [ ] 20. Stop before optional live verification and require separate authorization.
  What to do / Must NOT do: Present deterministic evidence and operator runbook, then request explicit permission before `PI_ROUTER_LIVE=1` or any external config operation. MUST NOT perform either because local/CI checks are green.
  Parallelization: Wave 3 | Blocked by: 19 | Blocks: Final verification
  References: `package.json:33-41`; `docs/verification.md:41-76`; task-9 runbook.
  Acceptance criteria: no live invocation or external file change occurred; final report scopes readiness correctly.
  QA scenarios: happy—`git status --short` lists only intended repository artifacts; failure—any live/external action is a stop condition. Evidence task-20.
  Commit: N | explicit stop gate.

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — trace each completed todo to OpenSpec task/delta and evidence; reject missing serialization, missing archive or unproven completion.
- [ ] F2. Code quality review — inspect type safety, error classification, replay safety, secret handling, width computation, dependency drift and CI safety; rerun `npm run verify`, audits and pack.
- [ ] F3. Deterministic integration QA — run fixture transport matrix, config/example parsing, state/lock tests, footer matrix, pack validator and workflow lint. Live Agnes calls remain excluded.
- [ ] F4. Scope fidelity — compare final paths to this plan and task-1 dirty-diff evidence; reject external mutations, memory/hedging/proxy work, quota-circumvention language and unrequested refactors.

## Commit strategy
- Before each commit inspect `git status --short`, `git diff`, `git diff --cached` and `git log --oneline -10`; stage only current OpenSpec-change files.
- Never stage `.omo/evidence/`, credentials, `.env`, router state, `.pi`, generated tarballs or pre-existing unrelated edits.
- One conventional commit after each archived change: task 5 transport, task 10 quota, task 13 footer, task 18 release gates; task 19 is a final docs commit only if not included in task 18.
- Never amend, force-push or commit while a required gate is red.

## Success criteria
- A clean installation passes `npm run verify`, both audits and `npm pack --dry-run`.
- Transport has no redeclaration and proves no replay for unsafe failures or post-output conditions.
- No public repository artifact says same-type Agnes keys are independent capacity without provider-confirmed entitlement evidence.
- Footer meets visible terminal width for ASCII, CJK, emoji, combining marks and all suffixes.
- CI executes deterministic gates with no secrets or live provider calls; package excludes secrets/state/control artifacts.
- Every completed OpenSpec change is strict-valid and archived only with requirement-to-evidence proof.
- Daily external configuration remains unchanged until separately authorized.
