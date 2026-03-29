# Runbooks

## Purpose

This document is the operator playbook for `testops-mcp`. Use it when local runs, CI, or user reports indicate that the server is unhealthy.

## Default Triage Order

1. Run `npm run check`
2. Run `npm run eval:smoke`
3. Run `npm run eval:matrix`
4. If the issue is runtime-specific, reproduce in a terminal with:

```bash
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp
```

5. If the issue looks like fake-backend drift, run:

```bash
npm run contract:drift
```

## Symptom: CI Is Red

Likely causes:
- lint or unit-test regression
- fake backend drift
- stricter eval assertion now catching a real contract mismatch
- Node-version mismatch between local and CI

Commands:

```bash
npm run check
npm run eval:smoke
npm run eval:matrix
```

Expected signals:
- `check` isolates lint/test/build/docs/guardrails/contract drift
- `eval:smoke` isolates startup/auth/transport health
- `eval:matrix` isolates tool-group, logging, and representative negative-path coverage

## Symptom: Repeated 401 / Auth Refresh Loop

Likely causes:
- upstream token exchange is failing
- bearer token is rejected repeatedly
- fake backend or real TestOps instance rejects the refreshed token

What to look for in logs:
- `auth.fetch.start`
- `auth.fetch.success` or `auth.fetch.rejected`
- `http.auth.refresh`
- repeated `http.request.rejected` with `status=401`

Commands:

```bash
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp
npm run eval:smoke
```

Interpretation:
- if `auth.fetch.success` is absent, auth exchange itself is broken
- if `auth.fetch.success` exists but requests still 401, investigate upstream auth acceptance

## Symptom: 503 / Retry Storm

Likely causes:
- upstream instability
- retry policy is too aggressive for a scenario
- fake backend failure scenario uncovered a transport regression

What to look for in logs:
- `http.request.retry`
- `http.request.rejected`
- `tool.error`

Commands:

```bash
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp
npm run eval:smoke
```

Interpretation:
- retries should appear only on safe read requests
- write requests should not loop through transient retries

## Symptom: Timeout

Likely causes:
- upstream latency
- timeout too low for the environment
- request deadlock or stalled response body

What to look for in logs:
- `http.request.start`
- `http.request.timeout`
- `tool.error`

Commands:

```bash
TESTOPS_TIMEOUT_MS=50 npm run eval:smoke
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp
```

Interpretation:
- if `http.request.timeout` appears without a matching success/rejection, the timeout path is working as designed

## Symptom: Invalid JSON

Likely causes:
- upstream returned malformed JSON
- proxy or gateway injected HTML/text
- fake backend drifted into a non-JSON response path

What to look for in logs:
- `http.request.invalid_json`
- `tool.error`

Commands:

```bash
npm run eval:matrix
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp
```

## Symptom: Tool Returns Error But Logs Look Healthy

Likely causes:
- tool-level validation failure before transport
- fake backend rejected malformed payload with a correct 400
- formatter or tool wiring issue

What to look for:
- `tool.start`
- missing transport events means failure happened before HTTP
- `tool.error` with no `http.request.start` usually means schema or tool-boundary rejection

Commands:

```bash
npm run eval:matrix
```

## Symptom: Fake Backend Drift

Likely causes:
- `src/api/*` changed but the fake contract registry was not updated
- route path or method changed
- a new endpoint was added without fake-backend support

Commands:

```bash
npm run contract:drift
npm run eval:matrix
```

Interpretation:
- `contract:drift` failure means the registry in `scripts/eval-support/contracts.mjs` is out of sync with `src/api/*`
- `eval:matrix` failure with green `contract:drift` usually means behavior drift, not route drift
