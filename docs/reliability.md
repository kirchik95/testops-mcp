# Reliability

## Runtime Expectations

The server should fail fast on invalid configuration and surface transport errors clearly to the caller.

## Config Rules

- `TESTOPS_URL` and `TESTOPS_TOKEN` are required
- `TESTOPS_URL` must be a valid `http://` or `https://` URL
- numeric env vars must parse to integers within their allowed range
- boolean env vars must be explicit `true` or `false`

Optional runtime env vars:

- `TESTOPS_TIMEOUT_MS`
- `TESTOPS_RETRY_MAX`
- `TESTOPS_RETRY_BASE_MS`
- `TESTOPS_LOG_LEVEL`
- `TESTOPS_LOG_FORMAT`

## Transport Rules

`AuthManager`
- exchanges API token for bearer token
- caches the bearer token until shortly before expiry
- validates token response shape before caching
- must fail with readable errors on timeout, invalid JSON, or malformed auth payloads

`HttpClient`
- injects the bearer token into every request
- performs one auth-refresh retry on HTTP 401
- applies timeout protection to every request
- retries only safe read requests on transient network or 5xx-style failures
- caps error-body reads before including them in thrown errors
- must throw readable errors for invalid JSON payloads

## Diagnostic Logging Rules

- runtime diagnostics must go to stderr only
- stdout remains reserved for MCP transport
- default logging stays quiet: `TESTOPS_LOG_LEVEL=error`, `TESTOPS_LOG_FORMAT=json`
- `info` should emit request/tool/server summaries
- `debug` should emit auth fetch, retry, timeout, and auth-refresh detail
- logs must include stable fields such as `event`, `toolName`, `toolRequestId`, `requestId`, `method`, `path`, `status`, `attempt`, and `durationMs` when relevant
- logs must never include raw API tokens, bearer tokens, or authorization headers

## API Layer Rules

- API wrappers should not silently swallow transport failures
- lossy fallback behavior is only acceptable if it is intentional, documented, and explicitly marked in code
- endpoint-specific quirks belong in the API layer, not in tools

## Tool Layer Rules

- all tool handlers must be wrapped with the shared error handler
- tool errors should return `isError: true` and readable text content
- tool handlers should not re-implement transport retry or auth logic

## Verification

Use:
- `npm run check` for unit + structural validation
- `npm run eval:smoke` for end-to-end startup/auth/tool wiring checks against the fake backend
- `npm run eval:matrix` for broad tool-group and logging verification against the fake backend

## Fake Backend Contract Rules

- the fake backend is expected to reject malformed request payloads with readable `400` errors
- missing entities should return readable `404` errors
- the route registry in `scripts/eval-support/contracts.mjs` is the contract source for fake-backend coverage
- `npm run contract:drift` must stay green whenever `src/api/*` changes
