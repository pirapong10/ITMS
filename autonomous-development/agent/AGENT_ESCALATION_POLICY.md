# AGENT ESCALATION & HUMAN-IN-THE-LOOP (HITL) POLICY

## 1. Escalation Triggers
An autonomous agent must immediately halt execution and generate a `BLOCKER_REPORT.md` when:
1. Auto-fix retry counter reaches 3 without passing Quality Gates.
2. A requested feature requires production API secrets or external credentials not found in `.env.example`.
3. An architectural decision conflicts with the root requirements.
4. Autonomy Level constraints require human approval:
   - **Level 0:** Escalates after every step.
   - **Level 1:** Escalates after every phase.
   - **Level 2:** Escalates only on High Risk phases or Gate Failures.
   - **Level 3 & 4:** Escalates strictly on unrecoverable blockers.

## 2. Human Resume Commands
Upon resolving the blocker, the human supervisor provides a structured prompt:
- `agent resume --resolved`: Re-triggers Quality Gate verification on the current phase.
- `agent skip-phase --override`: Overrides with manual checkpoint.
- `agent split-phase`: Instructs agent to decompose the current phase into smaller dynamic slices.
