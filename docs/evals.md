# Evals

## Purpose

The smoke harness validates the built MCP server end-to-end against a local fake TestOps backend.

## Commands

- `npm run check`
- `npm run eval:smoke`

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

## How It Works

`scripts/fake-testops-server.mjs`
- starts a local HTTP server with deterministic auth and minimal TestOps endpoints

`scripts/eval-smoke.mjs`
- builds a real MCP client/server loop over stdio
- points the server at the fake backend through env vars
- runs assertions on tool registration and tool results

## When To Run

Run smoke eval whenever a change touches:
- startup/config behavior
- auth/token handling
- HTTP transport
- tool registration
- read-only gating

Pure formatting or documentation-only changes normally only need `npm run check`.
