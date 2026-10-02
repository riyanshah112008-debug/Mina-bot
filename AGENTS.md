# Collaborative Development Protocol for Manager-bot

1. **Roles**: Antigravity is the primary builder and architect. OpenAI Codex is the auditor and code optimizer.
2. **Review Requirement**: After writing or updating any scripts, run `codex-audit` via your shell tool.
3. **Application Loop**:
   - Inspect the feedback inside `.codex-audit.md`.
   - Implement every valid fix, edge-case hardening, and optimization suggested by Codex.
   - Verify syntax and run tests to confirm the bot runs cleanly.
