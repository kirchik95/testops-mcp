# Evals

## Purpose

The local eval harness validates the built MCP server end-to-end against a fake TestOps backend.

## Commands

- `npm run check`
- `npm run eval:smoke`
- `npm run eval:matrix`

`npm run check` also includes `npm run contract:drift`, which verifies that the route contract registry used by the fake backend still matches `src/api/*`.

## CI Execution

GitHub Actions mirrors the local contract:

- `check` runs on Node 20 and Node 22
- `eval:smoke` runs on Node 20
- `eval:matrix` runs on Node 20

CI should not introduce separate validation logic. The workflow must call the same repo scripts that developers and agents use locally.

## What Smoke Eval Covers

- startup failure on invalid config
- auth token fetch
- 401 invalidate-and-refresh flow
- token reuse after refresh
- representative read flow through the real MCP server
- representative write flow through the real MCP server
- read-only mode removing write tools
- readable 5xx failure surfaces
- readable timeout failure surfaces

## What Matrix Eval Covers

- representative happy-path coverage for all tool groups
- representative write flows for test cases, test plans, test results, and defects
- negative request validation and missing-entity scenarios for representative write/read paths
- analytics and reference-data reads
- read-only mode removing write tools across all write-capable groups
- structured stderr logging scenarios for `error`, `info`, and `debug`

## How It Works

`scripts/fake-testops-server.mjs`
- re-exports the local fake backend used by eval scripts

`scripts/eval-smoke.mjs`
- runs the fast startup/auth/transport health checks

`scripts/eval-matrix.mjs`
- runs the broader tool-group matrix and logging assertions

`scripts/eval-support/`
- holds the shared fake backend handlers, fixtures, and MCP client/server harness helpers

## When To Run

Run smoke eval whenever a change touches:
- startup/config behavior
- auth/token handling
- HTTP transport
- tool registration
- read-only gating

Run matrix eval whenever a change touches:
- fake backend fixtures or route handlers
- tool contracts across any domain group
- structured logging or stderr diagnostics
- docs that describe eval coverage or runtime diagnostics

Pure formatting or documentation-only changes normally only need `npm run check`.
