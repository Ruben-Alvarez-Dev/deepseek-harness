# Tasks: plan-reconciliation

Execute serially. Docs/config only except the explicitly-ordered code retraction (task 11).

- [x] 1. `.gitignore`: add `dist/`, `.omo/`, `.DS_Store` (additive only)
- [x] 2. `package.json` `verify:full`: pack destination `/tmp/pi-account-router-dist` → `mkdir -p dist && npm pack --pack-destination dist`
- [x] 3. `docs/project-status.md`: DOCS-HARNESS link rewritten as explicit external/unversioned provenance note (external tree never read or moved from here)
- [x] 4. `docs/adr/0004-policy-catalog.md`: both dead `docs/policy-study.md` references rewritten — retirement recorded, successor identified as ADR 0004 itself
- [x] 5. Restore `openspec/changes/provider-catalog/` and `model-catalog/` from `ab1ac19` with amendment (LiteLLM primary source, `catalog-sources.json`, `npm run catalog:update`, zero hand-written JSON; prefixed UUIDv7 + ISO 8601) — reconciled to the single-extension rule (ADR 0005): catalog ships inside `src/` + root data dirs, never sibling `pi-*/` packages
- [x] 6. Restore `openspec/changes/zod-config-schema/` from `350ccfb`
- [x] 7. ~~Reconcile `pi-secrets-depot` change files~~ — SUPERSEDED by owner retraction order (task 10): the change itself was deleted; the locality patch it documented survives nowhere; ADR 0005 is the sole retraction record (ADR 0003 deleted along with its features)
- [x] 8. Gate after reconciliation: typecheck (0), lint 36 files (0), root suite 16 files green, `openspec validate --all --strict` 10/10 — captured this pass 2026-10-13
- [x] 9. (superseded old archive step — this change archives at task 14)
- [x] 10. Owner order 2026-10-13: delete `openspec/changes/pi-secrets-depot/`, `pi-profiles-system/`, `secrets-depot-wiring/` — executed by retraction surgery, verified absent
- [x] 11. Purge `pi-profiles/`, `pi-secrets/`, `examples/profiles/` and all profile/secretRef wiring from src/tests/scripts/docs/package/vitest/biome; flat config + `env`/`piProvider` credentials only; `src/ports.ts` SecretsPort removed — executed, zero residual references in active code (verified by grep this pass)
- [x] 12. Single-version governance: `docs/adr/0005-version-unica-y-sin-subpaquetes.md` written, ADR 0001 → SUPERSEDED, `docs/repository-layout.md` + `AGENTS.md` updated (one extension, one folder, root-only copy)
- [x] 13. Owner order: deleted `versions/` (v1/v2); dropped tags `v1-baseline`, `v2-work-in-progress`, `legacy-versions-layout`; canonical commit `5dd82b8` (pre-rewrite `0586fe5`) with 303 files / −29,300 lines
- [x] 14. `git filter-repo --invert-paths` expelled `versions/`, `pi-profiles/`, `pi-secrets/`, `examples/profiles/`, `src/adapters/profiles.ts`, the retracted change dirs, and the retracted research docs from ALL history; reflog expire + gc --prune=now; `git rev-list --objects --all` = 0 matches; `.git` 1.4M→476K; temporary snapshots (containing the retracted content) deleted; gates re-run post-rewrite green
