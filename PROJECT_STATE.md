# PROJECT_STATE.md: ITSM Enterprise

## 1. Project Information
- **Project Name:** IT Service Management System (ITSM Enterprise - SaaS Edition)
- **Application Type:** Enterprise Helpdesk, B2B SaaS Platform & IT Operations Management System
- **Current Phase:** Phase 07B: Open API & Webhooks Engine
- **Overall Status:** INITIALIZED
- **Version:** v2.1.0 (Global Standards & Enterprise Compliance Enabled)

---

## 2. Dynamic Phase Slicing Table

| Phase | Phase Name | Scope & Key Modules | Complexity | Risk Level | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **01A** | **Database Schema & RLS Implementation** | SaaS Core Tables, Multi-Region Database Setup, Row-Level Security (RLS) for Tenant Isolation (FR-SA-02, NFR-SC-01) | High | High | **COMPLETED** |
| **01B** | **Tenant Onboarding & Identity** | Self-Service Registration, Subdomain Routing, Data Encryption (AES-256), Basic Authentication (FR-SA-01, NFR-SC-02) | High | Medium | **COMPLETED** |
| **02A** | **Helpdesk & SLA Engine** | Tickets Management, SLA Timer with UTC Normalization & Auto-Pause, MTTR Calculation (FR-TK-01, FR-GL-03) | High | High | **COMPLETED** |
| **02B** | **IT Asset & License Management** | Asset Inventory, Depreciation (20%/yr), License Seats Allocation, Quotas Alerts (FR-AS-01, FR-LC-01) | Medium | Medium | **COMPLETED** |
| **02C** | **Project, Task & Routine Management** | Project Gantt Chart, Kanban Board, Daily Routines, Preventive Maintenance, Borrow-Return Workflow (FR-PJ-01, FR-TS-01) | Medium | Low | **COMPLETED** |
| **03A** | **Billing Engine & Payment Gateway** | Stripe/PayPal Integration, Subscription Plans Management, Multi-Currency Invoicing (FR-BL-01) | High | Medium | **COMPLETED** |
| **03B** | **Super Admin Portal** | Cross-Region Tenants Management, Global Plans Configuration, Usage Monitoring | Medium | Low | **COMPLETED** |
| **04A** | **Internationalization (i18n) & Multi-Currency** | UI Translation Dictionary (JSON), Fallback Language Engine, Currency Exchange Rate API (FR-GL-01, FR-GL-02) | Medium | Medium | **COMPLETED** |
| **04B** | **Multi-Timezone Engine** | UTC Storage, User/Tenant Timezone Conversion, Daylight Saving Time (DST) Handling (FR-GL-03) | High | High | **COMPLETED** |
| **05A** | **Enterprise SSO (SAML/OIDC) & MFA** | Okta/Entra ID Integration, JIT Provisioning, TOTP, FIDO2/Passkey (FR-GL-04, FR-GL-06) | High | High | **COMPLETED** |
| **05B** | **SCIM 2.0 User Lifecycle Provisioning** | Real-time User Provisioning/Deprovisioning via IdP (FR-GL-05) | Medium | High | **COMPLETED** |
| **06A** | **Problem Management (RCA)** | Known Error Database (KEDB), Workarounds, Incident Clusters (FR-GL-10) | Medium | Medium | **COMPLETED** |
| **06B** | **Change Enablement & CAB Workflow** | Multi-stage CAB Approval, Risk & Impact Analysis, Rollback Plans (FR-GL-11) | High | High | **COMPLETED** |
| **06C** | **Knowledge Management (KCS)** | Self-Service KB, Resolution Notes to Draft Article conversion (FR-GL-12) | Low | Low | **COMPLETED** |
| **07A** | **Immutable Logs & Data Privacy** | Append-Only Audit Logs (SOC 2), GDPR Data Subject Access Request (DSAR), Data Anonymization (FR-GL-07, FR-GL-09) | High | High | **COMPLETED** |
| **07B** | **Open API & Webhooks Engine** | RESTful API (OpenAPI 3.0), API Keys, Rate Limiting, Event-Driven Webhooks (FR-GL-14, FR-GL-15) | High | High | **IN PROGRESS** |
| **08** | **Accessibility (WCAG 2.1) & UI Polish** | Screen Readers (ARIA), Keyboard Navigation, Color Contrast (4.5:1), Global Search (FR-GL-13) | Medium | Low | PENDING |

---

## 3. Phase Dependency Graph
```
Phase 01A (Database Schema & RLS Implementation)
   │
   └──► Phase 01B (Tenant Onboarding & Identity)
           │
           ├──► Phase 02A (Helpdesk & SLA Engine) ───────┐
           │       │                                     │
           │       ├──► Phase 02B (Asset & License)      │
           │       │                                     ├──► Phase 04A (i18n & Multi-Currency)
           │       └──► Phase 02C (Project & Routine)    ├──► Phase 04B (Multi-Timezone Engine)
           │                                             │
           ├──► Phase 03A (Billing Engine & Payment) ────┤
           │       │                                     │
           │       └──► Phase 03B (Super Admin Portal)   ├──► Phase 05A (Enterprise SSO & MFA)
           │                                             │       │
           ├──► Phase 06A (Problem Management RCA) ──────┤       └──► Phase 05B (SCIM Provisioning)
           │       │                                     │
           │       ├──► Phase 06B (Change Enablement)    ├──► Phase 07A (Immutable Logs & Privacy)
           │       │       │                             │       │
           │       └──► Phase 06C (Knowledge Mgmt)       └──► Phase 07B (Open API & Webhooks)
           │                                                     │
           └─────────────────────────────────────────────────────┴─► Phase 08 (Accessibility & UI Polish)
```

---

## 4. Current Blockers & Risks
- **Active Blockers:** None
- **Key Risks:**
  - **RLS & Data Isolation Leakage:** High risk in Multi-Tenant architecture if Row-Level Security bypasses occur.
  - **Timezone Anomalies:** Complex SLA calculations across User, Tenant, and Server UTC timezones.
  - **SSO Security:** Vulnerability to SAML Signature wrapping and token manipulation during Identity Provider integrations.
  - **Compliance Validation:** Immutable logs and Data Privacy (GDPR) handling require strict validation for SOC 2 Type II readiness.
