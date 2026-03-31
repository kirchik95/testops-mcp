# Plan: TestOps MCP Server

## Context

MCP-сервер на TypeScript для взаимодействия AI-агента (Claude) с платформой TestOps (Allure TestOps). Сервер позволит агенту управлять тест-кейсами, тест-планами, запусками, результатами и другими сущностями через API платформы.

Документация платформы: https://docs.qatools.ru/

## Структура проекта

```
testops-mcp/
  package.json
  tsconfig.json
  .gitignore
  .env.example
  src/
    index.ts                    # Entry point: сервер + транспорт
    config.ts                   # Чтение env: TESTOPS_URL, TESTOPS_TOKEN
    client/
      auth.ts                   # OAuth: POST /api/uaa/oauth/token → JWT
      http-client.ts            # HTTP-клиент с auto-refresh токена
    api/
      projects.ts               # CRUD проектов
      test-cases.ts             # CRUD тест-кейсов, сценарии, шаги
      test-plans.ts             # CRUD тест-планов
      launches.ts               # Запуски
      test-results.ts           # Результаты тестов
      defects.ts                # Дефекты
      analytics.ts              # Аналитика
    tools/
      projects.ts               # MCP tools для проектов
      test-cases.ts             # MCP tools для тест-кейсов
      test-plans.ts             # MCP tools для тест-планов
      launches.ts               # MCP tools для запусков
      test-results.ts           # MCP tools для результатов
      defects.ts                # MCP tools для дефектов
      analytics.ts              # MCP tools для аналитики
      register-all.ts           # Регистрация всех tools на сервере
    types/
      api-types.ts              # DTO интерфейсы (TestCase, TestPlan, Launch, etc.)
      common.ts                 # PageResponse<T>, PaginationParams
    utils/
      formatting.ts             # Форматирование ответов API в читаемый текст для LLM
```

## Архитектура: 3 слоя

1. **client/** — HTTP-клиент + аутентификация. `AuthManager` получает JWT через `POST /api/uaa/oauth/token` (grant_type=apitoken, scope=openid, token={USER_TOKEN}), кеширует на ~55 мин, автообновление при 401.
2. **api/** — Типизированные методы API. Не знают про MCP. Принимают параметры, возвращают DTO.
3. **tools/** — Регистрация MCP-инструментов с Zod-схемами. Вызывают api/, форматируют ответ в текст.

## Аутентификация

```
POST {TESTOPS_URL}/api/uaa/oauth/token
Content-Type: application/x-www-form-urlencoded
Body: grant_type=apitoken&scope=openid&token={TESTOPS_TOKEN}
→ { access_token: "jwt..." }
→ Authorization: Bearer {jwt}
```

JWT валиден 1 час. Обновляем проактивно через 55 мин или по 401.

## Инструменты MCP (~30 tools)

### Приоритет 1 — Проекты и тест-кейсы (реализуем первыми)

| Tool | API | Описание |
|------|-----|----------|
| `list-projects` | GET /api/project | Список проектов |
| `get-project` | GET /api/project/{id} | Детали проекта |
| `list-test-cases` | GET /api/testcase | Список тест-кейсов (search, AQL filter) |
| `search-test-cases` | GET /api/testcase/search | Расширенный поиск с AQL |
| `get-test-case` | GET /api/testcase/{id} | Детали тест-кейса |
| `create-test-case` | POST /api/testcase | Создание тест-кейса |
| `update-test-case` | PATCH /api/testcase/{id} | Обновление тест-кейса |
| `delete-test-case` | DELETE /api/testcase/{id} | Удаление тест-кейса |
| `get-test-case-scenario` | GET /api/testcase/{id}/scenario + GET /api/testcase/{id}/step | Сценарий/шаги (Gherkin + ручные) |
| `update-test-case-scenario` | POST /api/testcase/{id}/scenario | Обновить сценарий |

### Приоритет 2 — Тест-планы и запуски

| Tool | API | Описание |
|------|-----|----------|
| `list-test-plans` | GET /api/testplan | Список тест-планов |
| `get-test-plan` | GET /api/testplan/{id} | Детали тест-плана |
| `create-test-plan` | POST /api/testplan | Создание тест-плана |
| `update-test-plan` | PATCH /api/testplan/{id} | Обновление |
| `get-test-plan-test-cases` | GET /api/testplan/{id}/testcase | Тест-кейсы в плане |
| `list-launches` | GET /api/launch | Список запусков |
| `get-launch` | GET /api/launch/{id} | Детали запуска |
| `get-launch-test-results` | GET /api/launch/{id}/testresult | Результаты запуска |

### Приоритет 3 — Результаты и дефекты

| Tool | API | Описание |
|------|-----|----------|
| `list-test-results` | GET /api/testresult | Результаты тестов |
| `get-test-result` | GET /api/testresult/{id} | Детали результата |
| `update-test-result` | PATCH /api/testresult/{id} | Обновить результат |
| `list-defects` | GET /api/defect | Список дефектов |
| `get-defect` | GET /api/defect/{id} | Детали дефекта |
| `create-defect` | POST /api/defect | Создать дефект |
| `update-defect` | PATCH /api/defect/{id} | Обновить дефект |

### Приоритет 4 — Аналитика

| Tool | API | Описание |
|------|-----|----------|
| `get-automation-trend` | GET /api/analytic/{id}/automation_chart | Тренд автоматизации |
| `get-status-distribution` | GET /api/analytic/{id}/group_by_status | Распределение по статусам |
| `get-success-rate` | GET /api/analytic/{id}/tc_success_rate | Тренд успешности |

## AQL (Allure Query Language) в описаниях tools

Описания tools `list-test-cases` и `search-test-cases` будут включать примеры AQL:
- `name ~= "login"` — поиск по имени
- `tag = "smoke"` — по тегу
- `automation = true` — автоматизированные
- `status = "Active"` — по статусу
- `cf["Epic"] = "Auth"` — по custom field
- `createdBy = "Ivan" and tag in ["smoke", "regression"]` — комбинации

## Технический стек

```json
{
  "dependencies": {
    "@modelcontextprotocol/server": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/node": "^22",
    "typescript": "^5"
  }
}
```

- `"type": "module"` в package.json
- Target: ES2022, module: Node16
- Нативный `fetch` (Node 18+)
- Без dotenv — env передаются через конфигурацию MCP-клиента

## Форматирование ответов

Ответы API форматируются в читаемый текст (не сырой JSON):
```
Found 23 test cases (page 1 of 3):

1. [#1042] Login with valid credentials
   Status: Active | Layer: UI | Automated: Yes | Tags: smoke, regression

2. [#1043] Login with invalid password
   Status: Active | Layer: UI | Automated: No | Tags: smoke
```

## Порядок реализации

**Фаза 1 — Скелет (работающий сервер с 1 tool)**
1. package.json, tsconfig.json, .gitignore
2. src/config.ts
3. src/client/auth.ts + src/client/http-client.ts
4. src/types/common.ts + src/types/api-types.ts (минимум — проекты)
5. src/api/projects.ts
6. src/tools/projects.ts (`list-projects`)
7. src/tools/register-all.ts + src/index.ts
8. Build & test

**Фаза 2 — Тест-кейсы (10 tools)**
1. Расширить api-types.ts (TestCase DTOs)
2. src/api/test-cases.ts
3. src/utils/formatting.ts
4. src/tools/test-cases.ts
5. Test

**Фаза 3 — Тест-планы и запуски (8 tools)**
1. src/api/test-plans.ts + src/api/launches.ts
2. src/tools/test-plans.ts + src/tools/launches.ts
3. Test

**Фаза 4 — Результаты, дефекты, аналитика (~10 tools)**
1. src/api/test-results.ts + src/api/defects.ts + src/api/analytics.ts
2. src/tools/test-results.ts + src/tools/defects.ts + src/tools/analytics.ts
3. Test

## Конфигурация MCP-клиента

```json
{
  "mcpServers": {
    "testops": {
      "command": "node",
      "args": ["/path/to/testops-mcp/build/index.js"],
      "env": {
        "TESTOPS_URL": "https://your-testops-instance.example.com",
        "TESTOPS_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Верификация

1. `npm run build` — компиляция без ошибок
2. Запуск через MCP Inspector или Claude Desktop
3. Вызов `list-projects` — проверка аутентификации и получения данных
4. Вызов `list-test-cases` с projectId — проверка пагинации и форматирования
5. Вызов `create-test-case` + `get-test-case` — проверка записи
6. Вызов `search-test-cases` с AQL-фильтром — проверка фильтрации

## Ключевые решения

- **~30 tools**, не больше — слишком много tools путает агента
- **Без bulk-операций** — опасны, агент может вызывать поштучно
- **Без upload/export** — бинарные данные неудобны в MCP
- **Пагинация явная** — page/size параметры, не auto-fetch всех страниц
- **projectId обязателен** — почти все endpoints требуют его, в описаниях tools упоминается "use list-projects first"
