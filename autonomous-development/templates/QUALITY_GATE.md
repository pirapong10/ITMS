# QUALITY GATE SPECIFICATION

Every dynamic phase MUST pass this multi-stage gate before committing and updating `PROJECT_STATE.md`.

---

## Stage 1: Static Code Quality & Type Safety
```bash
# Must return exit code 0 with zero warnings/errors
npm run lint
npm run type-check
```
- [x] No `any` type overrides or linter disable comments introduced without approval.
- [x] Formatting conforms to codebase standard (Prettier/Biome/Black).

## Stage 2: Build & Compilation Integrity
```bash
npm run build
```
- [x] Clean compilation without warnings treated as errors.
- [x] Server and Client bundles generated within memory/size budgets.

## Stage 3: Automated Test Execution
```bash
npm run test:unit
npm run test:integration
npm run test:regression
```
- [x] 100% of newly authored tests pass.
- [x] 100% of regression/historical tests pass.
- [x] Code coverage >= 80% for new business logic paths.

## Stage 4: Security, Safety & Dependency Audit
```bash
npm audit --production
# or poetry run safety check / snyk test
```
- [x] Zero High or Critical CVEs.
- [x] No secrets or API keys present in diff (`git diff`).

## Stage 5: Acceptance & Contract Verification
- [x] All Acceptance Criteria listed in `PHASE_SPECIFICATION.md` verified.
- [x] API schemas and database migrations verified against contracts.
