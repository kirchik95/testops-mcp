# Agent-First Foundation

## Goal

Make `testops-mcp` legible and verifiable enough for reliable agent-assisted development without changing the public MCP interface.

## Deliverables In This Phase

- short `AGENTS.md` that routes into repo-local docs
- `docs/` tree for architecture, reliability, security, and eval behavior
- stricter runtime config parsing and transport hardening
- local structural checks for docs and guardrails
- fake-backend smoke eval that drives the real built server

## Explicit Non-Goals

- no CI workflow changes
- no public tool renames
- no browser automation
- no full observability stack
- no recurring cleanup agents yet

## Acceptance Bar

- `npm run check` passes
- `npm run eval:smoke` passes
- a new agent can navigate repo rules from local docs only
- runtime failures are surfaced clearly instead of being silently hidden
