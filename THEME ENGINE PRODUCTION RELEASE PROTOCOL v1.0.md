# THEME ENGINE PRODUCTION RELEASE PROTOCOL v1.0

## OBJECTIVE

Release the already validated Theme Engine implementation to Production.

The Theme Engine has already passed:

- 27/27 Test Suites
- 302/302 Unit Tests
- 70/70 Next.js Routes
- WCAG 2.1 Level AA validation
- Local Production Build

Confirmed Root Cause:

The Theme Engine implementation was not committed and pushed to `origin/master`.

Production is currently running:

```text
Commit: e5d383eb
```

Do NOT modify the Theme Engine implementation unless a release-blocking issue is discovered.

---

# PHASE 1 — GIT STATUS

Run:

```bash
git status
```

Identify:

- Modified files
- Untracked files
- Deleted files
- Theme Engine files
- Unrelated changes

Do not stage files yet.

---

# PHASE 2 — REVIEW DIFF

Run:

```bash
git diff
```

and:

```bash
git diff --stat
```

Review all changes.

Verify that changes belong to the Theme Engine implementation or its required tests.

---

# PHASE 3 — SECURITY CHECK

Before staging files, verify that the release does NOT include:

```text
.env
.env.local
Secrets
API Keys
Passwords
Private Credentials
Local Machine Configuration
Temporary Files
Debug Dumps
Generated Local Artifacts
```

If sensitive files are detected:

STOP.

Do not commit or push.

Report the files requiring exclusion.

---

# PHASE 4 — VERIFY REQUIRED FILES

Confirm the expected Theme Engine implementation exists.

Examples:

```text
globals.css
layout.tsx
ThemeContext.tsx
ThemeToggle.tsx
Theme-related UI components
Theme-related tests
```

Do not assume these exact paths.

Use the actual project structure.

---

# PHASE 5 — FINAL VALIDATION

Before committing, run the project's existing quality gates.

Required:

```text
Unit Tests
Build
Type Checking
Lint
```

Expected:

```text
27/27 Test Suites
302/302 Tests
70/70 Routes
```

If any existing quality gate fails:

STOP.

Do not commit as a Production Release.

---

# PHASE 6 — STAGE

Stage ONLY the verified Theme Engine changes.

Example:

```bash
git add <verified-files>
```

Then verify:

```bash
git status
git diff --cached
```

The staged diff must be reviewed before commit.

---

# PHASE 7 — COMMIT

Create a clear release commit.

Recommended commit message:

```text
feat(theme): implement production-ready theme engine
```

Do not use vague messages such as:

```text
update
fix
changes
test
```

---

# PHASE 8 — VERIFY COMMIT

After commit:

```bash
git status
git log -1 --oneline
```

Confirm:

```text
Working Tree:
CLEAN

Commit:
NEW RELEASE COMMIT
```

---

# PHASE 9 — PUSH

Push ONLY after all previous phases pass.

```bash
git push origin master
```

Confirm the push succeeded.

Record:

```text
New Commit SHA:
Remote:
Branch:
Push Status:
```

---

# PHASE 10 — CI/CD MONITORING

Monitor the deployment pipeline.

Verify:

```text
Build
Tests
Artifact Creation
Deployment
Production Release
```

If CI/CD fails:

STOP.

Report the exact failure.

Do not bypass failed quality gates.

---

# PHASE 11 — PRODUCTION VERIFICATION

After deployment, verify the actual Production environment.

Confirm that Production is no longer running:

```text
e5d383eb
```

Verify the new commit/release identifier.

Then test:

```text
Light Mode
Dark Mode
System Mode
Theme Persistence
Theme Toggle
Page Reload
FOUC Protection
```

---

# PHASE 12 — PRODUCTION SMOKE TEST

Minimum smoke test:

```text
1. Open Production
2. Open DevTools
3. Check <html> class
4. Switch Light → Dark
5. Switch Dark → Light
6. Select System
7. Reload page
8. Open another route
9. Return to previous route
10. Verify theme remains correct
```

Check:

```javascript
document.documentElement.classList
```

and:

```javascript
localStorage
```

where applicable.

---

# REQUIRED FINAL REPORT

Return exactly:

```text
THEME ENGINE PRODUCTION RELEASE RESULT

Pre-Release Validation:
27/27 Test Suites
302/302 Tests
70/70 Routes

Git:
Previous Commit: e5d383eb
Release Commit:
Branch: master
Push: PASS / FAIL

CI/CD:
Build:
Test:
Deploy:

Production:
Previous Version: e5d383eb
Current Version:

Light Mode:
PASS / FAIL

Dark Mode:
PASS / FAIL

System Mode:
PASS / FAIL

Persistence:
PASS / FAIL

FOUC Protection:
PASS / FAIL

Production Status:
LIVE / FAILED / PENDING

Final Result:
RELEASED / BLOCKED / PENDING
```

## CRITICAL RULES

1. Do not modify unrelated code.
2. Do not commit secrets.
3. Review `git diff` before staging.
4. Review `git diff --cached` before committing.
5. Do not bypass failed tests.
6. Do not force push.
7. Do not rewrite Git history.
8. Do not claim Production is updated until the deployed version is actually verified.
9. Treat `e5d383eb` as the known previous Production baseline.
10. The final authority is the actual Production deployment, not the local build.