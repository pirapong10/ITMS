# AGENT SYSTEM RULES & OPERATIONAL INVARIANTS

### Invariant 1: State Supremacy
Never execute code or make decisions without inspecting `templates/PROJECT_STATE.md`. The project state file is the single source of truth.

### Invariant 2: Verification Before Progress ("Never Trust Completion")
Writing code does not equal task completion. No phase shall be marked `COMPLETED` until all Quality Gates execute with exit code 0.

### Invariant 3: Bounded Auto-Fix Loop
If a quality gate fails:
1. Agent may inspect the error and apply a focused patch.
2. Increment `Auto-Fix Attempts` in `PROJECT_STATE.md`.
3. If attempts exceed `3`, agent MUST immediately stop, revert to `LAST_CLEAN_CHECKPOINT`, write `BLOCKER_REPORT.md`, and await human input.
4. Auto-fix code must NEVER comment out tests, bypass assertions, or add `@ts-ignore` / `# type: ignore` as a shortcut.

### Invariant 4: Atomic Checkpointing
Every phase transition requires a clean Git checkpoint following Conventional Commits:
```text
feat(phase-[XX]): [Concise summary] [quality-gate: passed]
```

### Invariant 5: Destructive Command Ban
Autonomous agents are strictly forbidden from running:
- `rm -rf /` or recursive deletions outside build artifact directories
- `git push --force` or history rewriting
- Database drop/truncate operations without down-migration verification
- Hardcoding secrets, tokens, or private credentials into source files

### Invariant 6: Context Pruning & Compaction
Between phase boundaries, flush temporary conversational memory. Retain only:
- `PROJECT_STATE.md`
- Active `PHASE_SPECIFICATION.md`
- System Architecture Diagram & API Schema
