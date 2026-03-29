# Анализ покрытия тестами testops-mcp

**Дата анализа:** 2026-03-26
**Тестовый фреймворк:** Vitest
**Всего тестовых файлов:** 21
**Основных исходных файлов:** 27

---

## 📊 Статус покрытия

### Покрытые модули (21 файл)
✅ **Инфраструктура:**
- `src/client/auth.ts` - AuthManager с кешированием и истечением токенов
- `src/client/http-client.ts` - HTTP клиент с retry на 401
- `src/config.ts` - валидация конфигурации
- `src/utils/error-handler.ts` - обработка ошибок

✅ **API слой (8 модулей):**
- `src/api/projects.ts` - ProjectsApi
- `src/api/defects.ts` - DefectsApi
- `src/api/test-plans.ts` - TestPlansApi
- `src/api/launches.ts` - LaunchesApi
- `src/api/test-results.ts` - TestResultsApi
- `src/api/test-cases.ts` - TestCasesApi (21+ методов)
- `src/api/analytics.ts` - AnalyticsApi
- `src/api/reference-data.ts` - ReferenceDataApi

✅ **Инструменты (8 модулей):**
- `src/tools/projects.ts` - 2 tools
- `src/tools/defects.ts` - 4 tools
- `src/tools/test-plans.ts` - 5 tools
- `src/tools/launches.ts` - 3 tools
- `src/tools/test-results.ts` - 3 tools
- `src/tools/test-cases.ts` - 21 tools
- `src/tools/analytics.ts` - 3 tools
- `src/tools/reference-data.ts` - 2 tools

✅ **Утилиты:**
- `src/utils/formatting.ts` - форматирование вывода (33+ функции)

### НЕ покрытые модули (5 файлов)
❌ **Инфраструктура:**
- `src/tools/register-all.ts` - функция регистрации всех tools (главная точка подключения)
- `src/index.ts` - entry point MCP сервера
- `src/utils/schemas.ts` - Zod схемы валидации

❌ **Типы (не содержат логику, но документируют контракты):**
- `src/types/common.ts` - общие типы
- `src/types/api-types.ts` - API типы

---

## 🔍 Детальный анализ пробелов в тестировании

### 1. КРИТИЧЕСКИЕ ПРОБЕЛЫ

#### 1.1 Отсутствуют интеграционные тесты
**Проблема:** Нет E2E тестов полного стека auth → http → api → tool
**Пример сценария без покрытия:**
```typescript
// Не протестирована цепочка:
AuthManager → HttpClient (с 401 retry) → API → Tool → форматирование
```
**Риск:** Проблемы могут быть в стыках компонентов, но не обнаружены
**Рекомендация:** Добавить 5-10 интеграционных тестов

#### 1.2 Оркестрация `registerAllTools` не протестирована
**Файл:** `src/tools/register-all.ts`
**Проблема:** Функция вызывает 8 регистраций tools без проверки
```typescript
registerAllTools(server) // Что если сервер === undefined?
// Что если регистрация повторится дважды?
// Какая будет последовательность вызовов?
```
**Пробелы:**
- Нет проверки, что все 43+ tools зарегистрированы
- Нет проверки на дубликаты при повторной регистрации
- Нет проверки, что все API объекты создано корректно

#### 1.3 Entry point не протестирован
**Файл:** `src/index.ts`
**Проблема:**
```typescript
// Сценарии без покрытия:
validateConfig() // Если выполнится неправильно → процесс умрёт
registerAllTools(server) // Без проверки результата
await server.connect(transport) // Async ошибки?
```

---

### 2. ПРОБЕЛЫ В ОБРАБОТКЕ ОШИБОК

#### 2.1 LaunchesApi.getStatistic() имеет молчаливый catch
**Файл:** `src/api/launches.ts:66-77`
**Проблема:** Метод возвращает пустой массив при ошибке
```typescript
async getStatistic(launchId: number): Promise<LaunchStatistic[]> {
  try {
    return await this.http.get(...);
  } catch {
    return [];  // ← Ошибка скрывается!
  }
}
```
**Что НЕ протестировано:**
- Был ли вообще сделан запрос?
- Какая именно ошибка произошла? (401 vs 500 vs timeout)
- Правильно ли логировать эту ошибку?

**Позитивный результат:** Тест на 68-77 линии проверяет, что возвращается `[]`
**Минусы:** Не проверяет логирование или другие побочные эффекты

#### 2.2 HttpClient 401 retry - граничные случаи
**Файл:** `src/client/http-client.ts`
**Что протестировано:**
- Успешный retry после 401 (тест на 125-142)
- Бесконечный цикл предотвращен (2 попытки, тест на 144-155)

**Что НЕ протестировано:**
- 401 с пустым телом ответа
- 401 на первый запрос, 503 на второй (ошибка на retry)
- 401, затем network timeout на retry
- Concurrent 401 errors (race condition при simultaneoustоне запросах)

---

### 3. ПРОБЕЛЫ В ГРАНИЧНЫХ СЛУЧАЯХ (Edge Cases)

#### 3.1 Конфигурация
**Файл:** `src/config.test.ts`
**Что есть:**
- Пусто TESTOPS_URL → ошибка
- Пусто TESTOPS_TOKEN → ошибка
- Оба заполнены → OK

**Что ОТСУТСТВУЕТ:**
```typescript
// Не протестированы:
- TESTOPS_URL = "not-a-url" (невалидный URL)
- TESTOPS_URL = "http://" (неполный URL)
- TESTOPS_PROJECT_ID = "999999999" (переполнение?)
- TESTOPS_PAGE_SIZE = 0, -1, 999999 (границы)
- TESTOPS_PAGE_SIZE = "abc" (не число)
- TESTOPS_READ_ONLY = "yes", "1", "TRUE" (разные форматы)
```

#### 3.2 TestCasesApi.updateCustomFields() - слияние полей
**Файл:** `src/api/test-cases.test.ts:228-261`
**Что протестировано:**
- Слияние новых и старых полей
- Пустой список текущих полей

**Что НЕ протестировано:**
```typescript
// Граничные случаи:
- updateCustomFields(tcId, projId, []) // Пустой массив обновлений?
  → Вернётся старые поля? Или они удалятся?

- updateCustomFields(tcId, projId, [
    { customField: { id: null } } // customField.id === null
  ])
  → Вернётся undefined, и фильтр его пропустит

- updateCustomFields(tcId, projId, [
    { customField: undefined } // customField === undefined
  ])
  → Вернётся undefined, и логика quebra
```

#### 3.3 Форматирование - пустые и null значения
**Файл:** `src/utils/formatting.test.ts`
**Что протестировано:** Много примеров с пустыми данными
**Что НЕ протестировано:**

```typescript
// Экстремальные случаи:
formatTestCase({
  id: Number.MAX_SAFE_INTEGER,
  name: null, // ← может быть?
  duration: -1, // ← отрицательная длительность
})

formatTestPlan({
  name: "",
  description: "",  // Пустые строки
})

// Очень большие объекты:
formatTestCases(page(
  Array(10000).fill({ id: 1, name: "x" })
))
```

---

### 4. НЕДОСТАТОЧНОЕ ПОКРЫТИЕ В ИНСТРУМЕНТАХ (Tools)

#### 4.1 Основные handler'ы есть, но неполные
**Пример:** `src/tools/test-cases.test.ts:115-150`
```typescript
// Есть тесты на:
✅ Успешный запрос с параметрами
✅ Параметр search передаётся через

// ОТСУТСТВУЮТ:
❌ Поведение при page < 0
❌ Поведение при size > maxInt
❌ projectId, которое не существует
❌ Поведение, если API вернул неполные данные
```

#### 4.2 Write-операции в tools - неполное тестирование
**Файл:** `src/tools/test-cases.ts:103-400+`
**Что есть:** Tool регистрация
**Что ОТСУТСТВУЕТ в тестах:**
- Успешное создание test case
- Успешное обновление scenario
- Успешный set-custom-fields с валидацией
- Ошибки при write-операциях (403 Forbidden)
- Rollback/recovery сценарии

---

### 5. КАЧЕСТВО МОКОВ

#### 5.1 Адекватность моков - СРЕДНЯЯ
**Хорошо:**
```typescript
// ✅ Правильная структура
function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}
```

**Проблемы:**
```typescript
// ❌ Недостаточная валидация
vi.mocked(api.list).mockResolvedValue({
  content: [], totalElements: 0, totalPages: 0, number: 0, size: 20
})
// Никто не проверяет, что returned объект имеет правильную структуру
// Никто не проверяет типы полей (number vs string?)

// ❌ Нет отрицательных сценариев в некоторых местах
vi.mocked(api.list).mockRejectedValue(...)
// Есть в основных тестах, но не везде консистентно
```

#### 5.2 Отсутствуют fixtures с реальными данными
**Проблема:** Все моки используют простейшие значения
```typescript
// Текущее:
{ id: 1, name: 'Login Test', projectId: 42 }

// Лучше было бы:
{
  id: 12345,
  name: 'User Authentication - Login Flow',
  projectId: 99,
  status: { name: 'Active' },
  testLayer: { name: 'API' },
  automated: true,
  tags: [{ name: 'smoke' }, { name: 'regression' }],
  // ... остальные поля реальной структуры
}
```

---

### 6. ХРУПКИЕ ТЕСТЫ (Brittle Tests)

#### 6.1 String matching в форматировании
**Файл:** `src/utils/formatting.test.ts:30-45`
```typescript
it('formats a list of projects', () => {
  expect(out).toContain('Found 2 project(s)');
  expect(out).toContain('[#1] Alpha (Public)');
  expect(out).toContain('[#2] Beta (Private)');
});
```
**Проблема:** Если кто-то измени формат с "Found 2" на "Found: 2", тест сломается
**Решение:** Использовать regex или parse output

#### 6.2 Зависимость от внутреннего устройства в tool-тестах
**Файл:** `src/tools/projects.test.ts:50`
```typescript
const handler = (server as any)._tools.get('list-projects')!.handler
```
**Проблема:** Тест завязан на `_tools` map, который является внутренней деталью
**Риск:** Если refactor переместит инструменты в другую структуру, тест сломается

---

## 🎯 Отсутствующие сценарии

### Сценарий 1: API возвращает 403 Forbidden
```typescript
// НИКАКОЙ тест не проверяет это:
ApiError 403 GET /api/testcase: Access Denied
→ Как tool это обработает?
→ Что получит пользователь?
```

### Сценарий 2: Невалидный JSON в ответе
```typescript
// ОТСУТСТВУЕТ тест:
API возвращает: "{ invalid json"
→ JSON.parse() бросит SyntaxError
→ Тест должен проверить, что error_handler это ловит
```

### Сценарий 3: Timeout запроса
```typescript
// ОТСУТСТВУЕТ тест:
Fetch timeout after 30s
→ Как HttpClient это обработает?
→ Будет ли retry на timeout?
```

### Сценарий 4: Очень большие paginated responses
```typescript
// ОТСУТСТВУЕТ тест:
list({ size: 999999 })
→ Не будет ли OutOfMemory?
→ Правильно ли работает streaming?
```

### Сценарий 5: Дублированная регистрация tools
```typescript
// ОТСУТСТВУЕТ тест:
registerAllTools(server)
registerAllTools(server) // вторично

→ Что будет? (409 Conflict? Overwrite?)
```

---

## 📈 Метрики качества

| Метрика | Оценка | Статус |
|---------|--------|--------|
| Покрытие основного кода | ~85% | ⚠️ ХОРОШО |
| Покрытие ошибок | ~60% | ⚠️ КРИТИЧНО |
| Интеграционные тесты | 0% | 🔴 ОТСУТСТВУЮТ |
| Граничные случаи | ~50% | ⚠️ КРИТИЧНО |
| Качество моков | ~70% | ⚠️ СРЕДНЕЕ |

---

## 🔧 Рекомендации по приоритетам

### ВЫСОКИЙ приоритет (P0):
1. **Добавить интеграционные тесты** (auth → http → api → tool)
   - Сложность: СРЕДНЯЯ (3-4 часа)
   - Важность: КРИТИЧНА
   - Пример: `auth.test-integration.ts`

2. **Покрыть register-all.ts**
   - Сложность: НИЗКАЯ (1 час)
   - Важность: ВЫСОКАЯ
   - Проверить: регистрация 43+ tools, отсутствие дубликатов

3. **Добавить тесты обработки ошибок HTTP (4xx, 5xx, timeout)**
   - Сложность: СРЕДНЯЯ (2-3 часа)
   - Важность: КРИТИЧНА
   - Пример: 403, 500, timeout, invalid JSON

### СРЕДНИЙ приоритет (P1):
4. **Покрыть граничные случаи конфигурации**
   - TESTOPS_PAGE_SIZE = 0/-1/999999
   - Невалидные URL форматы

5. **Дополнить тесты formatSpec для экстремальных значений**
   - Очень длинные строки
   - null/undefined в неожиданных местах

6. **Добавить отрицательные сценарии в tool handlers**
   - 403 Forbidden
   - 404 Not Found
   - Невалидные параметры (page < 0, size > maxInt)

### НИЗКИЙ приоритет (P2):
7. **Улучшить качество моков** (добавить реальные fixture'ы)
8. **Рефакторить хрупкие тесты** (string matching, internal _tools)
9. **Добавить E2E тесты для всего стека** (не обязательно в unit-тестах)

---

## 📋 Итоговый список функций БЕЗ покрытия

### Критичные:
- `registerAllTools()` - оркестрация всех tools
- `main()` - entry point

### Важные:
- `HttpClient.get/post/patch/delete()` - неполное покрытие ошибок
- `LaunchesApi.getStatistic()` - неполное покрытие error case
- `TestCasesApi.updateCustomFields()` - неполное покрытие edge cases
- `formatScenario()` - глубокие вложенные шаги не протестированы

### API validation (Zod schemas):
- `src/utils/schemas.ts` - projectIdSchema не имеет тестов

### Types (не требуют тестирования, но должны быть валидированы):
- `src/types/common.ts`
- `src/types/api-types.ts`

---

## ✅ Рекомендации по улучшению

### Короткие (можно сделать за день):
```typescript
// 1. Добавить register-all.test.ts
test('registerAllTools регистрирует все 43+ tools', () => {
  const toolNames = new Set<string>();
  server.registerTool = vi.fn((name) => toolNames.add(name));
  registerAllTools(server);
  expect(toolNames.size).toBe(43);
  // Проверить все известные tool names
});

// 2. Улучшить config.test.ts
test('TESTOPS_PAGE_SIZE должен быть в диапазоне [1, 100]', () => {
  vi.stubEnv('TESTOPS_PAGE_SIZE', '0');
  expect(() => validateConfig()).toThrow('Page size must be >= 1');
});
```

### Среднесрочные (1-2 дня):
```typescript
// 3. Интеграционный тест
test('full stack: auth → http → api → tool', async () => {
  const auth = new AuthManager(); // real auth
  const http = new HttpClient(auth);
  const api = new TestCasesApi(http);
  // Использовать реальный mock сервер или VCR cassettes
  const result = await api.list(projectId);
  expect(result.content).toBeDefined();
});

// 4. Тесты обработки ошибок
test('HttpClient обрабатывает 403 Forbidden', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 403,
    text: async () => 'Forbidden'
  });
  await expect(client.get('/api/data'))
    .rejects.toThrow('API error 403');
});
```

---

## 🎓 Выводы

**Общее состояние:** СРЕДНЕЕ (B-) ⚠️

✅ **Сильные стороны:**
- Хорошее покрытие основного пути выполнения
- Функциональные моки для большинства компонентов
- Достаточное тестирование инфраструктуры (auth, config)
- Обширное покрытие форматирования

⚠️ **Слабые стороны:**
- Почти нет интеграционных тестов
- Неполное покрытие ошибок и граничных случаев
- Отсутствуют тесты оркестрации и entry point
- Некоторые молчаливые обработки ошибок (getStatistic)

🎯 **Следующие шаги:**
1. Добавить интеграционные тесты (высокий ROI)
2. Покрыть register-all и index (критично для стабильности)
3. Дополнить тесты ошибок в HTTP слое
4. Улучшить граничные случаи в config и formatting
