# BLOCKER INCIDENT REPORT

- **Incident ID:** `BLK-[YYYYMMDD]-[PHASE_ID]`
- **Active Phase:** `PHASE-[XX]`
- **Triggered Time:** `[YYYY-MM-DD HH:MM:SS]`
- **Autonomy Status:** `HALTED / ESCALATED TO HUMAN`

---

## 1. Blocker Summary
- **Primary Failure Category:** `[Build Failure | Test Regression | Security Vulnerability | Auto-Fix Exhaustion | Missing Secrets]`
- **Auto-Fix Attempts Reached:** `3 / 3` (Maximum threshold exceeded)

---

## 2. Root Cause Analysis (RCA)
### 2.1 Error Trace / Log
```text
[Insert CLI / Compiler / Test Error Output Here]
```

### 2.2 Agent Diagnosis
[Describe why the error occurred and why automated remediation failed without destabilizing other components.]

---

## 3. Attempted Fix History
1. **Attempt 1:** `[Action taken]` -> `Result: [Failed / Regressed]`
2. **Attempt 2:** `[Action taken]` -> `Result: [Failed / Regressed]`
3. **Attempt 3:** `[Action taken]` -> `Result: [Failed / Regressed]`

---

## 4. Current State & Rollback Status
- **Current Git Head:** `[Commit Hash]`
- **Safe Rollback Target:** `[LAST_CLEAN_CHECKPOINT]`
- **State Reverted:** `[YES | NO (Preserved for inspection)]`

---

## 5. Human Intervention Required
- [ ] Provide missing credentials / environment secret
- [ ] Clarify architectural conflict or business rule ambiguity
- [ ] Approve manual code patch and trigger resume command:
  ```bash
  agent resume --from-checkpoint [hash] --resolve-blocker
  ```
