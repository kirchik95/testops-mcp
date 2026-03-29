# TestOps MCP Server

An [MCP](https://modelcontextprotocol.io/) server that connects AI agents (Claude, Cursor, etc.) to [TestOps](https://qatools.ru/) — enabling test case management, launches, defects, and analytics through natural language.

## Features

- **Projects** — list and inspect projects
- **Test Cases** — create, read, update, delete, search, and manage scenarios (steps)
- **Test Plans** — create, edit, view associated test cases
- **Launches** — browse launches and their test results
- **Test Results** — view and update statuses
- **Defects** — create, edit, browse
- **Analytics** — automation trend, status distribution, success rate
- **Read-only mode** — disable all write operations for safe environments

## Quick Start

### Prerequisites

- Node.js 18+
- Access to a [TestOps](https://qatools.ru/) instance
- TestOps API token

### Installation

```bash
npm install -g testops-mcp
```

### MCP Client Configuration

Add to your MCP client config (Claude Desktop, Cursor, Claude Code, etc.):

```json
{
  "mcpServers": {
    "testops": {
      "command": "testops-mcp",
      "env": {
        "TESTOPS_URL": "https://your-testops-instance.example.com",
        "TESTOPS_TOKEN": "your-api-token"
      }
    }
  }
}
```

Or with `npx` (no global install required):

```json
{
  "mcpServers": {
    "testops": {
      "command": "npx",
      "args": ["-y", "testops-mcp"],
      "env": {
        "TESTOPS_URL": "https://your-testops-instance.example.com",
        "TESTOPS_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TESTOPS_URL` | Yes | TestOps instance URL (e.g. `https://testops.example.com`) |
| `TESTOPS_TOKEN` | Yes | API token for authentication |
| `TESTOPS_PROJECT_ID` | No | Default project ID (so you don't have to specify it in every request) |
| `TESTOPS_PAGE_SIZE` | No | Pagination page size (server default if not set) |
| `TESTOPS_READ_ONLY` | No | Set to `true` to disable all write operations |
| `TESTOPS_TIMEOUT_MS` | No | Request timeout in milliseconds for auth and API calls (default: `30000`) |
| `TESTOPS_RETRY_MAX` | No | Retry count for transient read-request failures (default: `2`) |
| `TESTOPS_RETRY_BASE_MS` | No | Base backoff delay in milliseconds for transient read-request retries (default: `250`) |

## Available Tools

### Projects
| Tool | Description |
|---|---|
| `list-projects` | List all projects |
| `get-project` | Get project details by ID |

### Test Cases
| Tool | Description |
|---|---|
| `list-test-cases` | List test cases in a project |
| `search-test-cases` | Search test cases by query |
| `get-test-case` | Get test case basic details |
| `get-test-case-overview` | Get full test case details (members, issues, custom fields, requirements, test keys) |
| `create-test-case` | Create a test case (with tags, links, members) |
| `update-test-case` | Update a test case (with tags, links, members, duration) |
| `delete-test-case` | Delete a test case |
| `get-test-case-scenario` | Get test case scenario (steps) |
| `update-test-case-scenario` | Update test case scenario |

### Test Case Sub-Resources
| Tool | Description |
|---|---|
| `get-test-case-issues` | Get issue links (Jira, YouTrack, etc.) |
| `set-test-case-issues` | Set issue links for a test case |
| `get-test-case-members` | Get members (owner, reviewers) |
| `set-test-case-members` | Set members for a test case |
| `get-test-case-custom-fields` | Get custom field values (Component, Priority, Team, etc.) |
| `set-test-case-custom-fields` | Update custom field values |
| `get-test-case-relations` | Get relations (related to, clones, duplicates, etc.) |
| `set-test-case-relations` | Set relations for a test case |
| `get-test-case-requirements` | Get linked requirements |
| `set-test-case-requirements` | Set requirements for a test case |
| `get-test-case-test-keys` | Get test keys |
| `set-test-case-test-keys` | Set test keys for a test case |

### Test Plans
| Tool | Description |
|---|---|
| `list-test-plans` | List test plans |
| `get-test-plan` | Get test plan details |
| `create-test-plan` | Create a test plan |
| `update-test-plan` | Update a test plan |
| `get-test-plan-test-cases` | Get test cases in a test plan |

### Launches
| Tool | Description |
|---|---|
| `list-launches` | List launches |
| `get-launch` | Get launch details |
| `get-launch-test-results` | Get test results for a launch |

### Test Results
| Tool | Description |
|---|---|
| `list-test-results` | List test results |
| `get-test-result` | Get test result details |
| `update-test-result` | Update a test result |

### Defects
| Tool | Description |
|---|---|
| `list-defects` | List defects |
| `get-defect` | Get defect details |
| `create-defect` | Create a defect |
| `update-defect` | Update a defect |

### Analytics
| Tool | Description |
|---|---|
| `get-automation-trend` | Test automation trend over time |
| `get-status-distribution` | Test status distribution |
| `get-success-rate` | Test success rate |

### Reference Data
| Tool | Description |
|---|---|
| `list-test-layers` | List available test layers (UI, API, Unit, etc.) with IDs |
| `list-workflows` | List workflows with their statuses and IDs |

## Architecture

```
src/
├── index.ts                 # Entry point: MCP server initialization
├── config.ts                # Environment variable configuration
├── client/
│   ├── auth.ts              # OAuth authentication with JWT token caching
│   └── http-client.ts       # HTTP client with automatic token injection
├── api/                     # Typed API clients
│   ├── projects.ts
│   ├── test-cases.ts
│   ├── test-plans.ts
│   ├── launches.ts
│   ├── test-results.ts
│   ├── defects.ts
│   ├── analytics.ts
│   └── reference-data.ts
├── tools/                   # MCP tool registration
│   ├── register-all.ts
│   ├── projects.ts
│   ├── test-cases.ts
│   ├── test-plans.ts
│   ├── launches.ts
│   ├── test-results.ts
│   ├── defects.ts
│   ├── analytics.ts
│   └── reference-data.ts
├── types/                   # TypeScript interfaces
│   ├── common.ts
│   └── api-types.ts
└── utils/
    ├── formatting.ts        # API response formatting for LLM readability
    └── error-handler.ts     # Tool error handling wrapper
```

Three-layer design:

1. **Client** — HTTP transport with OAuth authentication and automatic token refresh
2. **API** — typed methods for each TestOps entity
3. **Tools** — MCP tools with Zod parameter validation and response formatting

## Development

```bash
git clone <repo-url>
cd testops-mcp
npm install        # also installs pre-commit hook via "prepare" script
npm run build
npm start
```

### Testing

The project has 220 unit tests covering all layers (utils, config, client, API, tools).

```bash
npm test           # run all tests once
npm run test:watch # run in watch mode
npm run check      # lint + unit tests + build + docs/guardrail checks
npm run eval:smoke # run end-to-end smoke eval against a fake local TestOps backend
```

A pre-commit hook automatically runs the test suite before every commit. If any test fails, the commit is blocked.

### Repo Knowledge Base

Agent-facing repository guidance lives in:

- `AGENTS.md`
- `docs/index.md`
- `docs/architecture.md`
- `docs/reliability.md`
- `docs/security.md`
- `docs/evals.md`

## License

MIT
