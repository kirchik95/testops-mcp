# Docs Index

This directory is the repository-local knowledge base for `testops-mcp`.

Read in this order:
1. [architecture.md](architecture.md) for structure and dependency boundaries
2. [reliability.md](reliability.md) for transport and failure-handling rules
3. [security.md](security.md) for token handling, read-only behavior, and safety constraints
4. [logging.md](logging.md) for stderr diagnostics and user-facing debugging guidance
5. [evals.md](evals.md) for smoke-eval and local verification workflows
6. [plans/agent-first-foundation.md](plans/agent-first-foundation.md) for the current harness-engineering migration

Temporary analysis artifacts:
- `ANALYSIS_REPORT.md`
- `ERROR_HANDLING_REVIEW.md`

Those reports are useful context, but they are not the long-term source of truth. Durable rules should live in this `docs/` tree.
