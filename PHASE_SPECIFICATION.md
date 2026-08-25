# PHASE SPECIFICATION: PHASE-04A - Internationalization (i18n) & Multi-Currency

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-04A`
- **Parent Epic / Feature:** `Global Standards: i18n & Multi-Currency Engine`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Medium (10-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement complete Internationalization (i18n) Translation Dictionary Engine (`en`, `th`) with Fallback & Parameter Interpolation, Multi-Currency Exchange Rate Engine (`USD`, `THB`, `EUR`, `JPY`, `SGD`, `GBP`), and Tenant-level Localization Preference Settings (FR-GL-01, FR-GL-02).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787610000000_create_i18n_and_currencies_tables.js` (Create `exchange_rates`, `tenant_i18n_settings` with RLS & seed rates)
- [ ] New modules/files created:
  - `src/lib/i18n.ts` (i18n dictionary, translation engine, parameter interpolation, fallback)
  - `src/lib/currency.ts` (Currency converter, rate table, formatting)
  - `app/api/v1/i18n/translations/route.ts` (GET dictionary & supported locales)
  - `app/api/v1/i18n/settings/route.ts` (GET & PATCH tenant localization settings)
  - `app/api/v1/currencies/rates/route.ts` (GET exchange rates)
  - `app/api/v1/currencies/convert/route.ts` (POST currency conversion)
- [ ] Unit & integration test files:
  - `tests/unit/i18n.test.ts`
  - `tests/unit/currency.test.ts`
  - `tests/integration/i18n.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-04A-01` | Translation Fallback & Interpolation | Unit Test | Returns translated text; falls back to English when key missing; interpolates `{variables}`. |
| `AC-04A-02` | Multi-Currency Conversion | Unit/Integration Test | Converts amounts across USD, THB, EUR, JPY, SGD using live/stored rates with 2-4 decimal precision. |
| `AC-04A-03` | Currency Formatting | Unit Test | Formats currency with correct locale symbols (`$100.00`, `฿3,550.00`, `€92.00`). |
| `AC-04A-04` | Tenant Localization Settings | Integration Test | Retrieves and updates tenant default language (`th`/`en`) and default currency (`THB`/`USD`). |
