# PHASE SPECIFICATION: PHASE-04B - Multi-Timezone Engine

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-04B`
- **Parent Epic / Feature:** `Global Standards: Multi-Timezone Engine & Business Hours`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Medium (10-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement Enterprise Multi-Timezone Engine with canonical UTC storage, IANA timezone conversions (`Asia/Bangkok`, `America/New_York`, `Europe/London`, `Asia/Tokyo`), Daylight Saving Time (DST) handling, and Timezone-aware Business Hours SLA deadline calculation (FR-GL-03).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787620000000_add_timezone_support.js` (Add `timezone` and `business_hours` columns)
- [ ] New modules/files created:
  - `src/lib/timezone.ts` (Timezone conversion engine, DST calculator, business hours SLA schedule)
  - `app/api/v1/timezones/route.ts` (GET supported timezones)
  - `app/api/v1/timezones/convert/route.ts` (POST timestamp conversion)
  - `app/api/v1/timezones/business-hours/route.ts` (GET & PATCH business hours & timezone config)
- [ ] Unit & integration test files:
  - `tests/unit/timezone.test.ts`
  - `tests/integration/timezone.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-04B-01` | Canonical UTC Normalization | Unit Test | All stored and computed timestamps parse from and serialize to UTC ISO-8601 strings. |
| `AC-04B-02` | Timezone & DST Conversion | Unit/Integration Test | Accurately converts between UTC and target IANA timezones factoring in Daylight Saving Time. |
| `AC-04B-03` | Business Hours SLA Engine | Unit Test | Computes SLA deadlines strictly within tenant operating hours (skipping weekends & after-hours). |
| `AC-04B-04` | Tenant Business Hours Config | Integration Test | Retrieves and updates tenant timezone and business hours schedule with RLS isolation. |
