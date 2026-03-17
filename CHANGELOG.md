# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-03-17

### Fixed

- **get-launch-test-results** returned 404 Not Found — used non-existent endpoint `/api/launch/{id}/testresult`. Replaced with `/api/testresult?launchId={id}` (BUG-1)
- **list-test-results / get-test-result** displayed `Status: undefined` for tests in manual launches where the API omits the `status` field. Added `"pending"` fallback (BUG-2)
- **get-success-rate** crashed with `Cannot read properties of undefined (reading 'toFixed')` — `successRate`, `passed`, `total` fields may be absent in API response. Added defensive checks and support for alternative field name `success_rate` (BUG-3)
- **get-status-distribution** showed all status names as `undefined` — API returns status as an object or under a different field name. Added resolution via `d.status.name`, `d.name`, `d.statusName` (BUG-4)
- **get-launch / list-launches** never showed statistics (P/F/B/S) — API does not include `statistic` in base response. Added separate `/api/launch/{id}/statistic` request with graceful fallback for `get-launch` (BUG-5)
- **list-test-results** declared `launchId` as optional, but the API requires it (`400 Bad Request`). Made the parameter required (BUG-6)

### Changed

- `TestResult.status` type is now optional (`status?: string`) — reflects actual API behavior for unexecuted tests
- `StatusDistribution.status` type extended — supports both string and `{ name?: string }` object
- `SuccessRatePoint` — `successRate`, `total`, `passed` fields are now optional, added `success_rate` alias

## [1.1.0] - Initial tracked release

### Added

- MCP server for TestOps with support for test cases, launches, results, defects, and analytics
- Tools: list/get/create/update for test cases, test plans, launches, test results, defects
- Analytics: automation trend, status distribution, success rate
- API token authentication
- Configuration via environment variables
