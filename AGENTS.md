# AGENTS.md

This repository is optimized for agent-assisted work. Keep this file short; use it as a map, not an encyclopedia.

## What This Repo Is

`testops-mcp` is an MCP server that exposes TestOps project, test-case, plan, launch, result, defect, analytics, and reference-data operations through typed tools.

## Source Of Truth

Start in [docs/index.md](docs/index.md). Repo-local docs are the source of truth for architecture, reliability, safety, and evaluation behavior.

Key documents:
- [docs/architecture.md](docs/architecture.md)
- [docs/reliability.md](docs/reliability.md)
- [docs/security.md](docs/security.md)
- [docs/logging.md](docs/logging.md)
- [docs/runbooks.md](docs/runbooks.md)
- [docs/evals.md](docs/evals.md)
- [docs/plans/agent-first-foundation.md](docs/plans/agent-first-foundation.md)

## Operating Rules

- Preserve public MCP tool names and top-level behavior unless the task explicitly changes them.
- Route all network access through `src/client/auth.ts` and `src/client/http-client.ts`.
- Keep write-tool registration behind `if (!readOnly)`.
- Treat repo docs as the durable record; if behavior changes, update docs and checks together.
- Prefer `npm run check` for local validation, `npm run eval:smoke` for fast end-to-end health, and `npm run eval:matrix` for broad tool coverage.
- Use `TESTOPS_LOG_LEVEL` and `TESTOPS_LOG_FORMAT` when you need runtime diagnostics; logs must stay on stderr only.
- GitHub Actions must call the same repo scripts; do not create a separate CI-only validation path.

## Fast Path

1. Read [docs/index.md](docs/index.md).
2. Read the relevant domain or runtime doc.
3. Make changes.
4. Run `npm run check`.
5. Run `npm run eval:smoke` when behavior touches startup, auth, transport, or tool wiring.
6. Run `npm run eval:matrix` when behavior touches fake backend coverage, logging, or any tool-group contract.
