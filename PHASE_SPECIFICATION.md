# PHASE SPECIFICATION: PHASE-05B - SCIM 2.0 User Lifecycle Provisioning

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-05B`
- **Parent Epic / Feature:** `Global Standards: SCIM 2.0 User Lifecycle Provisioning`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Medium (12-14 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`, `PHASE-05A`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement RFC 7643 / RFC 7644 compliant SCIM 2.0 Protocol Server for real-time user and group provisioning, attribute synchronization, and deprovisioning directly from Identity Providers such as Okta and Microsoft Entra ID (FR-GL-05).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787640000000_create_scim_tables.js` (Create `tenant_scim_tokens`, `groups`, `group_memberships`, add `is_active`, `external_id` to `users`)
- [ ] New modules/files created:
  - `src/lib/scim.ts` (SCIM 2.0 engine, token authentication, user/group resource serializer, filter parsing)
  - `app/api/scim/v2/ServiceProviderConfig/route.ts` (GET SCIM metadata)
  - `app/api/scim/v2/ResourceTypes/route.ts` (GET ResourceTypes)
  - `app/api/scim/v2/Schemas/route.ts` (GET Schemas)
  - `app/api/scim/v2/Users/route.ts` (GET & POST SCIM Users)
  - `app/api/scim/v2/Users/[id]/route.ts` (GET, PUT, PATCH, DELETE SCIM User)
  - `app/api/scim/v2/Groups/route.ts` (GET & POST SCIM Groups)
  - `app/api/v1/scim/token/route.ts` (GET & POST Tenant SCIM Bearer Token generation)
- [ ] Unit & integration test files:
  - `tests/unit/scim.test.ts`
  - `tests/integration/scim.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-05B-01` | SCIM 2.0 Metadata Endpoints | Integration Test | Returns valid RFC 7643 `ServiceProviderConfig`, `ResourceTypes`, and `Schemas`. |
| `AC-05B-02` | SCIM User Provisioning (CRUD) | Integration Test | Creates, reads, updates (PUT/PATCH), and deletes users via standard SCIM 2.0 payloads. |
| `AC-05B-03` | Real-Time Deprovisioning | Integration Test | Handles PATCH `active: false` or DELETE to instantly deprovision/suspend user access. |
| `AC-05B-04` | SCIM Bearer Token Auth | Integration Test | Authenticates IdP requests via tenant-scoped SCIM bearer token and enforces tenant isolation. |
