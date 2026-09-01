# PRODUCTION THEME DEPLOYMENT DIAGNOSTIC PROTOCOL v1.0

## OBJECTIVE

The Theme Engine passes all local validation:

- Theme Provider: PASS
- Light Mode: PASS
- Dark Mode: PASS
- System Mode: PASS
- Persistence: PASS
- FOUC Protection: PASS
- Accessibility: PASS
- Regression: 27 Test Suites / 302 Tests Passed
- Build: 70/70 Routes Clean

However, the Production website still displays the previous UI behavior.

Your task is to diagnose the Production deployment issue.

DO NOT assume the Theme Engine itself is broken.

---

# PHASE 1 — VERIFY DEPLOYMENT VERSION

Determine:

1. Current Git commit in Production
2. Latest Git commit containing Theme Engine
3. Deployment timestamp
4. Build timestamp
5. Whether Production is using the latest artifact

Compare:

```text
Local Source
        ↓
Git Commit
        ↓
CI/CD Build
        ↓
Deployment Artifact
        ↓
Production Server
```

Identify exactly where version mismatch occurs.

---

# PHASE 2 — VERIFY PRODUCTION THEME PROVIDER

Confirm that Production renders:

```text
ThemeProvider
```

inside the actual Root Layout.

Verify:

```text
Production Root Layout
        ↓
Theme Provider Mounted
        ↓
Theme State Initialized
        ↓
HTML Class Updated
```

Do not rely on source code alone.

Verify actual Production behavior.

---

# PHASE 3 — HTML CLASS DIAGNOSTIC

Test on Production:

```javascript
document.documentElement.className
```

Switch to Dark Mode.

Expected:

```html
<html class="dark">
```

Report:

```text
Before Toggle:
After Toggle:
After Reload:
```

---

# PHASE 4 — LOCAL STORAGE DIAGNOSTIC

Inspect Production browser storage.

Verify:

```javascript
localStorage.getItem("theme")
```

Test:

```text
light
dark
system
```

Verify persistence after:

```text
Theme Change
Browser Reload
New Tab
Browser Restart
```

---

# PHASE 5 — CSS VARIABLE DIAGNOSTIC

Verify actual computed values in Production.

Test:

```javascript
getComputedStyle(document.documentElement)
.getPropertyValue("--color-background")
```

Compare:

```text
Light Mode Value:
Dark Mode Value:
```

Verify all critical tokens:

```text
--color-background
--color-surface
--color-text-primary
--color-text-secondary
--color-border
```

---

# PHASE 6 — PRODUCTION CSS BUILD

Verify that Production CSS includes:

```text
Dark Theme Selectors
CSS Variables
Semantic Tokens
Tailwind Theme Utilities
```

Check for:

```text
Purge Issues
Content Path Errors
Missing Global CSS
Incorrect Build Configuration
CSS Asset Caching
```

---

# PHASE 7 — CACHE DIAGNOSTIC

Check:

```text
Browser Cache
CDN Cache
Reverse Proxy Cache
Service Worker Cache
Static Asset Cache
```

Determine whether Production serves an old:

```text
JavaScript Bundle
CSS Bundle
HTML Document
```

Verify asset hashes and deployment timestamps.

---

# PHASE 8 — NETWORK DIAGNOSTIC

Inspect Production Network tab.

Verify:

```text
HTML
JavaScript Bundles
CSS Bundles
```

Check:

```text
Status Code
Cache-Control
ETag
Last-Modified
Asset Hash
Response Source
```

Determine whether stale assets are being served.

---

# PHASE 9 — ENVIRONMENT DIFFERENCE

Compare:

```text
Development
Preview / Staging
Production
```

Check:

```text
Environment Variables
Build Commands
Node Version
Framework Version
Tailwind Version
Deployment Configuration
```

Identify differences affecting Theme Engine.

---

# REQUIRED OUTPUT

## ROOT CAUSE ANALYSIS

```text
Confirmed Root Cause:

Evidence:

Affected Layer:

Severity:
```

Possible layers:

```text
Source Code
Git
CI/CD
Build
Deployment
Server
CDN
Cache
Browser
Theme Runtime
CSS
```

---

## DIAGNOSTIC MATRIX

| Layer | Status | Evidence | Result |
|---|---|---|---|
| Source | | | |
| Git | | | |
| Build | | | |
| Deployment | | | |
| HTML | | | |
| ThemeProvider | | | |
| localStorage | | | |
| CSS | | | |
| CDN | | | |
| Browser | | | |

---

# CRITICAL RULES

1. Do not guess.
2. Do not declare the Theme Engine broken without Production evidence.
3. Trace the exact deployed artifact.
4. Compare Local → Git → Build → Production.
5. Identify one confirmed root cause where possible.
6. Separate confirmed findings from hypotheses.
7. Do not modify unrelated frontend code.

---

# FINAL OUTPUT

```text
PRODUCTION THEME DIAGNOSTIC RESULT

Root Cause:
[Confirmed cause]

Fix Required:
[Exact action]

Verification:
[How the fix was confirmed]

Production Status:
FIXED / NOT FIXED
```