# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-03-19

### Added

- **`list-test-layers`** — list available test layers (UI, API, Unit, etc.) with their IDs for use in `testLayerId`
- **`list-workflows`** — list available workflows with statuses and IDs for use in `statusId`

## [1.3.0] - 2026-03-19

### Added

- **Test case sub-resource tools** — 12 new tools for managing all test case fields via dedicated API endpoints:
  - `get/set-test-case-issues` — issue links (Jira, YouTrack, etc.)
  - `get/set-test-case-members` — members with roles (owner, reviewer, etc.)
  - `get/set-test-case-custom-fields` — custom field values (Component, Priority, Team, Section, etc.)
  - `get/set-test-case-relations` — relations (related to, clones, duplicates, automates, etc.)
  - `get/set-test-case-requirements` — linked requirements
  - `get/set-test-case-test-keys` — test keys
- **`get-test-case-overview`** — new tool returning full test case details including members, issues, custom fields, requirements, and test keys in one call
- `links` and `members` parameters in `create-test-case` and `update-test-case`
- `duration` parameter in `update-test-case`

### Changed

- **Types aligned with Swagger spec** for test case DTOs:
  - `TestCase.status` and `TestCase.testLayer` are now `StatusRef` objects (with `id` and `name`) instead of plain strings
  - Added `TestCaseOverview` interface extending `TestCase` with sub-resource fields
  - Added proper DTOs: `MemberDto`, `RoleDto`, `IssueDto`, `ExternalLink`, `CustomFieldDto`, `CustomFieldValueDto`, `CustomFieldValueWithCf`, `CustomFieldWithValues`, `RequirementDto`, `TestKeyDto`, `TestCaseRelationDto`
  - `CreateTestCaseRequest` / `UpdateTestCaseRequest` aligned with `TestCaseCreateV2Dto` / `TestCasePatchV2Dto` — use `statusId`/`testLayerId` (numbers) instead of string names
- **Formatting** — `formatTestCase` now displays links; added formatters for all sub-resource types
- `get-test-case` description updated to mention `get-test-case-overview` for full details

## [1.2.0] - 2026-03-17

### Changed

- **All types aligned with real Swagger spec** (`https://<host>/api-docs/`). Previous types were guessed and didn't match the actual API DTOs:
  - `Launch` — removed non-existent `status`, `closedDate` fields; added `closed` (boolean), `external`, `autoclose`, `tags`, `issues`, `links`, `releaseId`
  - `Launch.statistic` — changed from flat `LaunchStatistic` object to `TestStatusCount[]` array (`[{status, count}]`) matching the real API format
  - `TestResult` — `status` is now `TestStatus` enum type; added `manual`, `assignee`, `flaky`, `muted`, `known`, `lastModifiedDate` fields
  - `AutomationTrendPoint` — renamed fields to match `AnalyticAutomationTrendDto`: `automatedCount`/`manualCount` (not `automated`/`manual`/`total`), `date` is string (not number)
  - `StatusDistribution` — aligned with `AnalyticTcStatusCountDto`: uses `statusName`/`statusId`/`statusColor` (not `status` string)
  - `SuccessRatePoint` — aligned with `AnalyticDto`: uses `avgSuccessRate`/`testResultsCount`/`testCasesCount` (not `successRate`/`passed`/`total`)
  - Added `TestStatus` type and `TestStatusCount` interface
- **Launch formatters** — `formatLaunches` and `formatLaunch` now display `Open`/`Closed` state instead of non-existent `status` field; statistics rendered from `TestStatusCount[]` array
- **Analytics formatters** — all three rewritten to use correct field names from the real API DTOs
- `formatDate` now handles both timestamp (number) and ISO date (string) inputs — analytics endpoints return dates as strings

### Fixed

- **get-launch-test-results** returned 404 — used non-existent endpoint `/api/launch/{id}/testresult`, replaced with `/api/testresult?launchId={id}` (BUG-1)
- **list-test-results / get-test-result** displayed `Status: undefined` for manual launches — added `"pending"` fallback (BUG-2)
- **get-success-rate** crashed with `.toFixed()` on undefined — fields had wrong names (BUG-3)
- **get-status-distribution** showed all names as `undefined` — field is `statusName`, not `status` (BUG-4)
- **get-launch** never showed statistics — `LaunchDto` doesn't include `statistic`; now fetches via `/api/launch/{id}/statistic` endpoint (BUG-5)
- **list-test-results** declared `launchId` as optional, but API requires it (BUG-6)

## [1.1.0] - Initial tracked release

### Added

- MCP server for TestOps with support for test cases, launches, results, defects, and analytics
- Tools: list/get/create/update for test cases, test plans, launches, test results, defects
- Analytics: automation trend, status distribution, success rate
- API token authentication
- Configuration via environment variables
