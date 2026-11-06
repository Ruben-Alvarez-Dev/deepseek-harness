# plan-reconciliation

## Why

The 2026-10-13 full-repo audit found drift between docs/specs and reality: `docs/policy-study.md` was referenced by the policy-catalog ADR after being deliberately retired (commit `1b8ba35`); `docs/project-status.md` linked into `DOCS-HARNESS`, outside the repository boundary; `verify:full` packed a tarball to `/tmp` (outside the root, against the physical-boundary rule); `.omo/` and `.DS_Store` were untracked with no ignore entry; and `pi-secrets-depot/tasks.md` still described the superseded keychain/sealing plan (0/8) while the shipped code and its ADR had moved on. The roadmap approved restoring the reduced-plan changes (`provider-catalog`, `model-catalog`, `zod-config-schema`) from git history instead of re-inventing them. After this reconciliation began, the owner retracted the entire profiles/secrets feature set and the physical version copies (ADR 0005, single-version rule): the retracted changes and folders were deleted — not reconciled — and only the catalog/zod restorations survive.

## What Changes

- Fix dead references in `docs/adr/0004` and the external `DOCS-HARNESS` link in `docs/project-status.md` (declared external, never read or moved from here).
- `.gitignore`: add `dist/`, `.omo/`, `.DS_Store` (additions only).
- `package.json` `verify:full`: pack destination `/tmp/pi-account-router-dist` → `dist/` (inside the root).
- Restore `openspec/changes/provider-catalog`, `model-catalog` (from `ab1ac19`) and `zod-config-schema` (from `350ccfb`) verbatim, each with an amendment section reconciling them to the reduced & audited plan (LiteLLM primary source, `catalog-sources.json`, `npm run catalog:update`, prefixed UUIDv7 + ISO 8601 serialization).
- Reconcile `pi-secrets-depot` change files to shipped reality (done in that change's own files, 2026-10-13).

## Capabilities

### New Capabilities

- `repository-hygiene`: all project working artifacts and scripts stay within the repository root; documentation contains no dead references.

## Impact

- Docs/config only; no runtime code changes (the code fixes from this reconciliation live in `pi-secrets-depot` locality patch and `error-classification-typing`).
