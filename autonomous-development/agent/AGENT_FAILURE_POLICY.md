# AGENT FAILURE & RETRY POLICY

## 1. Failure Classification
- **Level 1 (Transient / Syntax):** Fixable typo, missing import, linter error.
- **Level 2 (Logic / Test Regression):** Broken unit or integration assertions.
- **Level 3 (Architectural / Dependency Conflict):** Incompatible libraries, circular dependencies, database schema mismatch.
- **Level 4 (Systemic / Environment Failure):** Missing system binary, invalid network access, lack of credentials.

## 2. Retry Budget
- Maximum Auto-Fix attempts per phase: **3 attempts**.
- Each auto-fix attempt must generate an explicit diff log explaining the reasoning behind the fix.

## 3. Rollback Mechanism
When attempt 3 fails:
```bash
git reset --hard LAST_CLEAN_CHECKPOINT
git clean -fd
```
The workspace returns to a pristine known-good state. No corrupted halfway code is allowed to persist into subsequent phases.
