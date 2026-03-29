# Architecture

## Overview

The repository follows a three-layer structure:

1. `client/`: authentication and HTTP transport
2. `api/`: typed TestOps endpoint wrappers
3. `tools/`: MCP tool registration, parameter schemas, and formatting

Formatting and cross-cutting helpers live in `utils/`. Shared contracts live in `types/`.

## Dependency Direction

Allowed dependency flow:

`tools -> api -> client`

Supporting dependencies:

- `tools -> utils`, `tools -> config`, `tools -> types`
- `api -> types`
- `client -> config`

Disallowed dependency flow:

- `tools` must not call `fetch` directly
- `api` must not know about MCP server primitives
- `client` must not format user-facing tool output
- `tools` must not bypass the API layer for TestOps calls

## Ownership Boundaries

`src/client/auth.ts`
- owns API-token exchange and token caching

`src/client/http-client.ts`
- owns request construction, auth injection, timeout handling, retries, and HTTP error translation

`src/api/*.ts`
- own endpoint paths and request/response wiring
- should stay thin and deterministic

`src/tools/*.ts`
- own MCP tool names, descriptions, input schemas, read-only gating, and formatting

## Tool Registration Rules

- Public MCP tool names are part of the compatibility surface
- Write tools must only be registered inside `if (!readOnly)`
- Shared registration lives in `src/tools/register-all.ts`

## Docs And Checks

The repo is intentionally small, so the architecture should stay explainable from local files alone. If a structural rule matters repeatedly, encode it in `docs/` and enforce it in local checks.
