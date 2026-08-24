# AUTONOMOUS WEB APP DEVELOPMENT PROTOCOL (v1.0)
*Operational Framework for Autonomous & Semi-Autonomous Software Engineering Agents*

---

## 1. Protocol Purpose
The purpose of this protocol is to define a dynamic, deterministic, and verifiable operational framework for AI coding agents developing full-stack web applications. It replaces arbitrary static phase counts with scope-driven dynamic slicing and strict Quality Gates.

## 2. Core Principles
1. **Dynamic Slicing Over Fixed Steps:** Phases are derived from requirements and split/merged based on complexity and risk thresholds.
2. **Never Trust Completion — Verify Completion:** Code generation is not completion. A phase is complete only after passing build, unit, integration, regression, acceptance, security, and documentation verification.
3. **State Persistence & Re-entrancy:** Agent state is persisted externally in `PROJECT_STATE.md` to ensure zero context drift across sessions.
4. **Graduated Autonomy:** Support for execution autonomy levels (Level 0 through Level 4), defaulting to Level 2 (Semi-Autonomous) or Level 3 (Autonomous).
5. **Fail-Fast with Bounded Auto-Fix:** Strict retry limits (`MAX_AUTO_FIX_ATTEMPTS = 3`) prevent degenerative modification loops.
6. **Atomic Checkpointing:** Every phase must produce a clean, verifiable Git checkpoint.

## 3. Project Lifecycle
```
PROJECT INITIATION -> SCOPE ANALYSIS -> WORK DECOMPOSITION -> DYNAMIC PHASE PLANNING 
                   -> EXECUTION LOOP (Phases 01..N) -> FINAL VERIFICATION GATE -> PROJECT COMPLETION
```

## 4. Phase Management System
- **Dynamic Phase ID:** `PHASE-01`, `PHASE-02`, etc.
- **Split Rule:** If a phase exceeds 5 distinct architectural tasks or High Risk Threshold, decompose into `PHASE-07A`, `PHASE-07B`, etc.
- **Merge Rule:** Low-complexity sub-tasks (< 1 hour equivalent) are combined into single atomic phases.

## 5. Agent Roles & Responsibilities
- **Orchestrator:** Manages state transitions, triggers phases, validates checkpoints.
- **Analyst:** Breaks requirements into specifications and dynamic phase graphs.
- **Coder:** Implements functionality conforming to phase contracts.
- **QA:** Executes test suites, regression verification, and security scans.
- **Reviewer:** Conducts static analysis, architecture validation, and quality gate sign-off.

## 6. Execution State Machine
`IDLE` -> `ANALYZING` -> `PLANNING` -> `IMPLEMENTING` -> `TESTING` -> `VERIFYING` -> `CHECKPOINTING` -> `COMPLETE` (or `AUTO_FIXING` / `BLOCKED`)

## 7. Phase Contract
Every phase must adhere to `templates/PHASE_SPECIFICATION.md` defining inputs, outputs, exact deliverables, and strict acceptance criteria.

## 8. Definition of Done (DoD)
A phase is considered Done when all quality gate checks in `templates/QUALITY_GATE.md` pass with zero blocker defects.

## 9. Quality Gates
Mandatory verification pipeline:
1. Static Analysis / Linting (0 errors)
2. Type Checking (0 errors)
3. Build Verification (Exit code 0)
4. Unit Testing (Target coverage >= 80%)
5. Integration & API Contract Testing
6. Regression Protection
7. Automated Security Scan (0 Critical / High vulnerabilities)

## 10. Automated Testing
Test suites must run in an isolated deterministic environment. Flaky tests are treated as failures.

## 11. Regression Protection
All legacy tests from completed phases must pass without regression before advancing to subsequent phases.

## 12. Auto-Fix Policy
- Agent may autonomously attempt bug fixing up to `MAX_AUTO_FIX_ATTEMPTS = 3`.
- Auto-fix must target root causes, not disable assertions or bypass tests.

## 13. Retry & Failure Handling
Upon reaching retry ceiling, agent immediately halts, records incident in `templates/BLOCKER_REPORT.md`, and transitions state to `BLOCKED`.

## 14. Git & Checkpoint Policy
- Conventional commits with phase metadata: `feat(phase-07): description [quality-gate: passed]`
- Clean git working tree required prior to phase sign-off.

## 15. Rollback & Recovery
If an auto-fix corrupts project state or causes irreversible drift, agent rolls back working directory to `LAST_CLEAN_CHECKPOINT`.

## 16. Human Escalation
Triggered upon: Blocker limit exceeded, destructive operational requirements, critical architecture divergence, or external credentials required.

## 17. Context & Project Memory
Context pruning is mandatory: Scratchpad memory is flushed between phases, maintaining only `PROJECT_STATE.md`, active phase spec, and architecture map.

## 18. Documentation Synchronization
All schema changes, API routes, and environment variables must update living documentation in real-time.

## 19. Security & Safety Rules
Destructive commands (`rm -rf`, `DROP DATABASE`, `git push --force`, credential hardcoding) are strictly forbidden.

## 20. Project Completion Criteria
Evaluated against `templates/PROJECT_COMPLETION_REPORT.md`.

## 21. Autonomous Execution Loop
Governed by `agent/AGENT_EXECUTION_LOOP.md`.

## 22. Agent Command Protocol
Standardized command format for orchestrator, CLI, and LLM agent prompts.
