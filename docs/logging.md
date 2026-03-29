# Logging

## Purpose

`testops-mcp` writes runtime diagnostics to **stderr** only. This keeps MCP protocol traffic on stdout untouched while still making auth, transport, and tool execution debuggable.

## Enable Logging

Use these environment variables:

- `TESTOPS_LOG_LEVEL=error|info|debug`
- `TESTOPS_LOG_FORMAT=json|pretty`

Recommended combinations:

- local debugging in a terminal: `TESTOPS_LOG_LEVEL=debug` + `TESTOPS_LOG_FORMAT=pretty`
- CI or machine parsing: `TESTOPS_LOG_LEVEL=info` + `TESTOPS_LOG_FORMAT=json`
- normal user operation: default `error` + `json`

## Where Logs Appear

### Direct terminal / `npx`

If the server is started directly in a shell, stderr is visible in that same shell.

Examples:

```bash
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty npx -y testops-mcp
TESTOPS_LOG_LEVEL=info TESTOPS_LOG_FORMAT=json testops-mcp
```

To capture stderr separately:

```bash
TESTOPS_LOG_LEVEL=debug TESTOPS_LOG_FORMAT=pretty testops-mcp 2>testops-mcp.log
```

### Claude Desktop / Cursor / other MCP clients

The server still writes to stderr, but whether you see those logs directly depends on how the client surfaces subprocess diagnostics.

Practical rule:

- if the client exposes MCP server logs or diagnostics, the stderr stream will appear there
- if the client hides subprocess stderr, reproduce the same config in a terminal with `npx` or `testops-mcp` to inspect logs directly

Because client UX and log paths vary by version and OS, the terminal path is the most reliable debugging method.

### GitHub Actions

In CI, stderr becomes part of the job log automatically. That means auth/transport/tool diagnostics are visible directly inside the failed workflow step.

## What You Should See

Expected event families:

- `server.starting`, `server.ready`, `server.fatal`
- `tool.start`, `tool.success`, `tool.error`
- `http.request.start`, `http.request.success`, `http.request.retry`, `http.request.timeout`, `http.request.rejected`, `http.request.invalid_json`, `http.auth.refresh`
- `auth.fetch.start`, `auth.fetch.success`, `auth.fetch.failed`, `auth.fetch.timeout`, `auth.fetch.rejected`

## Safety Rules

- stdout must remain MCP-only
- logs must never contain raw API tokens, bearer tokens, or authorization headers
- if you need to debug a user issue, prefer reproducing with the same env vars in a terminal first
