# PHASE SPECIFICATION: PHASE-01B - Tenant Onboarding & Identity

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-01B`
- **Parent Epic / Feature:** `Tenant Onboarding & Identity`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Medium (4-8 files)`
- **Prerequisites / Dependencies:** `PHASE-01A (Database Schema & RLS Implementation)`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement a self-service registration system for onboarding new tenants, set up basic identity verification (authentication), establish subdomain routing, and enforce AES-256 encryption for sensitive data (FR-SA-01, NFR-SC-02).

### 2.2 Expected Deliverables
- [ ] New modules/files created:
  - `src/lib/auth.ts` (Authentication and JWT logic)
  - `src/lib/encryption.ts` (AES-256 encryption logic)
  - `src/pages/api/auth/register.ts` (Tenant and initial admin user registration API)
  - `src/pages/api/auth/login.ts` (Basic login API)
  - `src/middleware.ts` (Subdomain routing and authentication middleware)
- [ ] Modified modules:
  - `src/lib/db.ts` (Adjustments if needed for auth)
- [ ] Unit & integration test files:
  - `tests/integration/auth.test.ts`
  - `tests/unit/encryption.test.ts`
- [ ] Documentation updates: N/A

---

## 3. Implementation Task Breakdown
1. **Task 1: Encryption & Security Utility:** Implement AES-256 encryption in `src/lib/encryption.ts` for sensitive fields and robust password hashing (Argon2id/Bcrypt) for user passwords.
2. **Task 2: JWT & Auth Service:** Implement JWT generation and verification in `src/lib/auth.ts`.
3. **Task 3: Registration API:** Create `POST /api/auth/register` to register a new tenant (Company) and its first Super Admin user, ensuring atomic transaction creation.
4. **Task 4: Login API:** Create `POST /api/auth/login` to authenticate users, verify passwords, and return a JWT containing `tenant_id` and user claims.
5. **Task 5: Middleware & Routing:** Implement Next.js `middleware.ts` to inspect incoming requests, extract subdomain information, and validate JWTs.
6. **Task 6: Automated Tests:** Write integration tests to ensure registration creates accurate RLS-compliant data, and unit tests for AES-256 logic.

---

## 4. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-01` | Tenant Registration | Integration Test | Returns 201 Created and successfully creates both `tenants` and `users` records atomically. |
| `AC-02` | Secure Passwords | Automated Unit Test | Passwords in DB are hashed (Argon2id/Bcrypt) and cannot be stored in plaintext. |
| `AC-03` | Authentication | Integration Test | Valid login returns JWT token; Invalid returns 401 Unauthorized. |
| `AC-04` | Middleware Subdomain | Automated Unit Test | Requests with subdomains are correctly intercepted and routed/parsed. |

---

## 5. Security & Constraint Checklist
- [x] No hardcoded secrets or environment variables committed.
- [x] Input validation applied at API boundary (Zod / Joi / Pydantic).
- [x] All database queries parameterized / ORM protected against SQLi.
- [x] No destructive schema operations without explicit migration down-scripts.
