# PHASE SPECIFICATION: PHASE-05A - Enterprise SSO (SAML/OIDC) & MFA

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-05A`
- **Parent Epic / Feature:** `Global Standards: Enterprise SSO (SAML/OIDC) & Multi-Factor Authentication`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Medium (10-14 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement Enterprise Single Sign-On (SSO) with Okta / Microsoft Entra ID / Google Workspace support, Just-In-Time (JIT) user auto-provisioning, and Multi-Factor Authentication (MFA) via RFC 6238 TOTP Authenticator and Backup Recovery Codes (FR-GL-04, FR-GL-06).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787630000000_create_sso_and_mfa_tables.js` (Create `tenant_sso_configs`, `user_mfa_credentials` with RLS)
- [ ] New modules/files created:
  - `src/lib/sso.ts` (Tenant SSO config, SAML/OIDC payload validation, JIT provisioning engine)
  - `src/lib/mfa.ts` (RFC 6238 TOTP generator & validator, backup codes generator & redemption)
  - `app/api/v1/sso/config/route.ts` (GET & POST SSO configuration)
  - `app/api/v1/sso/callback/route.ts` (POST SSO login callback & JIT)
  - `app/api/v1/mfa/setup/route.ts` (POST generate TOTP secret & QR code uri)
  - `app/api/v1/mfa/verify/route.ts` (POST verify and enable MFA)
  - `app/api/v1/mfa/challenge/route.ts` (POST exchange MFA challenge code for session JWT)
  - `app/api/v1/mfa/disable/route.ts` (POST disable MFA)
- [ ] Unit & integration test files:
  - `tests/unit/sso.test.ts`
  - `tests/unit/mfa.test.ts`
  - `tests/integration/sso.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-05A-01` | Enterprise SSO Configuration | Integration Test | Configures SAML / OIDC provider metadata with encryption of client secrets and certificates. |
| `AC-05A-02` | JIT User Auto-Provisioning | Integration Test | Automatically provisions a new user record upon first valid SSO login if JIT is enabled. |
| `AC-05A-03` | RFC 6238 TOTP & Backup Codes | Unit Test | Generates and verifies 6-digit TOTP codes against time-step window; generates 10 single-use recovery codes. |
| `AC-05A-04` | MFA Login Challenge Flow | Integration Test | Enforces MFA verification challenge before granting final authenticated session JWT. |
