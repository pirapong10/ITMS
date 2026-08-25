# PHASE SPECIFICATION: PHASE-06C - Knowledge Management (KCS)

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-06C`
- **Parent Epic / Feature:** `Global Standards: Knowledge-Centered Service (KCS) & Self-Service Portal`
- **Risk Level:** `LOW`
- **Estimated Scope:** `Medium (10-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`, `PHASE-05A`, `PHASE-05B`, `PHASE-06A`, `PHASE-06B`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement Knowledge-Centered Service (KCS) repository with running ID `KB-YYYY-XXXX`, Markdown article editing, categorized Self-Service portal search, helpfulness feedback scoring, and one-click Ticket / Problem resolution to draft KB article conversion (FR-GL-12).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787670000000_create_knowledge_articles_and_feedback_tables.js` (Extend `knowledge_articles`, create `knowledge_feedback` with RLS)
- [ ] New modules/files created:
  - `src/lib/knowledge.ts` (Article lifecycle, running ID `KB-YYYY-XXXX`, KCS converters, portal search, feedback metrics)
  - `app/api/v1/kb/route.ts` (GET & POST articles)
  - `app/api/v1/kb/[id]/route.ts` (GET, PATCH, DELETE article)
  - `app/api/v1/kb/[id]/feedback/route.ts` (POST vote helpful / unhelpful)
  - `app/api/v1/kb/from-ticket/route.ts` (POST convert ticket resolution to article)
  - `app/api/v1/kb/from-problem/route.ts` (POST convert problem solution to article)
  - `app/api/v1/kb/portal/route.ts` (GET self-service public portal search)
- [ ] Unit & integration test files:
  - `tests/unit/knowledge.test.ts`
  - `tests/integration/knowledge.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-06C-01` | Knowledge Article Lifecycle | Unit/Integration Test | Generates `KB-YYYY-XXXX` and tracks states (`Draft`, `Under Review`, `Published`, `Archived`). |
| `AC-06C-02` | One-Click KCS Conversion | Integration Test | Automatically converts ticket resolution notes or problem RCA solutions into structured draft KB articles. |
| `AC-06C-03` | Self-Service Portal Search | Integration Test | Fast keyword search filtering by published status and public visibility. |
| `AC-06C-04` | Article Helpfulness Scoring | Integration Test | Captures user helpfulness ratings (`is_helpful`) and maintains accurate feedback counts. |
| `AC-06C-05` | Tenant Isolation | Integration Test | Enforces strict multi-tenant boundary on articles and feedback data. |
