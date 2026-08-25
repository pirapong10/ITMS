# PHASE SPECIFICATION: PHASE-07B - Open API & Webhooks Engine

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-07B`
- **Parent Epic / Feature:** `Global Standards: OpenAPI 3.0, API Keys, Rate Limiting & Event Webhooks`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Medium (12-14 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`, `PHASE-05A`, `PHASE-05B`, `PHASE-06A`, `PHASE-06B`, `PHASE-06C`, `PHASE-07A`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement OpenAPI 3.0 specification export, Scoped Tenant API Key management with sliding-window rate limiting (FR-GL-14), and an Event-Driven Outbound Webhook engine with HMAC-SHA256 signature verification and delivery log tracking (FR-GL-15).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787690000000_create_api_keys_and_webhooks_tables.js` (Create `tenant_api_keys`, `webhook_subscriptions`, `webhook_delivery_logs` with RLS)
- [ ] New modules/files created:
  - `src/lib/api-keys.ts` (API key generator `ak_live_...`, scope verification, rate limiter)
  - `src/lib/webhooks.ts` (Webhook subscription, HMAC-SHA256 signature generator, event dispatcher, delivery logger)
  - `app/api/v1/openapi.json/route.ts` (GET OpenAPI 3.0 document)
  - `app/api/v1/api-keys/route.ts` (GET & POST API keys)
  - `app/api/v1/api-keys/[id]/route.ts` (DELETE API key)
  - `app/api/v1/webhooks/route.ts` (GET & POST subscriptions)
  - `app/api/v1/webhooks/[id]/route.ts` (DELETE subscription)
  - `app/api/v1/webhooks/[id]/deliveries/route.ts` (GET delivery logs)
  - `app/api/v1/webhooks/test-dispatch/route.ts` (POST trigger test webhook event)
- [ ] Unit & integration test files:
  - `tests/unit/api-keys.test.ts`
  - `tests/unit/webhooks.test.ts`
  - `tests/integration/webhooks.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-07B-01` | OpenAPI 3.0 Spec Endpoint | Integration Test | Returns valid OpenAPI 3.0 JSON specification describing ITSM endpoints. |
| `AC-07B-02` | Scoped API Keys & Rate Limiting | Integration Test | Generates `ak_live_...` keys, validates scopes, and applies rate limit checks. |
| `AC-07B-03` | Event-Driven Webhooks | Integration Test | Subscribes to events, signs payload with HMAC-SHA256 `X-ITSM-Signature`, and records delivery log. |
| `AC-07B-04` | Multi-Tenant Data Isolation | Integration Test | Enforces tenant boundary on API keys, webhooks, and delivery logs. |
