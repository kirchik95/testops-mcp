# Security

## Secrets

- `TESTOPS_TOKEN` is sensitive and must never be logged or written into docs
- bearer tokens fetched from TestOps are runtime-only credentials and must not be persisted
- error messages should describe failures without echoing secrets back to the user

## Network Boundary

- direct `fetch()` is only allowed inside `src/client/auth.ts` and `src/client/http-client.ts`
- all TestOps HTTP access must flow through the client layer so timeout, retry, and auth rules stay centralized

## Read-Only Safety

- `TESTOPS_READ_ONLY=true` disables all write-tool registration
- read-only mode is a server capability boundary, not a soft UI hint
- write flows must remain unavailable when read-only is enabled

## Unsafe Operations

- do not add bulk-write tools without explicit review
- do not add destructive write behavior outside clearly named tools
- do not bypass `resolveProjectId` or tool-level validation in write paths

## Local Evaluation

The fake backend used by smoke eval is intentionally local and deterministic. It should never require real TestOps credentials.
