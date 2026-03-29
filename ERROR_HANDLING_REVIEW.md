# Отчёт: Ревью обработки ошибок и граничных случаев

**Дата:** 2026-03-26
**Область анализа:** src/api/, src/client/, src/tools/
**Фокус:** Обработка HTTP-ошибок, невалидные данные, граничные случаи, таймауты, утечки ресурсов

---

## Критические проблемы

### 1. HTTP-клиент: Отсутствие timeout и retry-логики

**Файл:** `src/client/http-client.ts`

**Проблема:**
```typescript
const response = await fetch(url, { ...init, headers });
```

- **Нет timeout**: `fetch()` может зависнуть бесконечно, если сервер не отвечает
- **Нет retry**: Временные сетевые ошибки (ECONNRESET, ETIMEDOUT) приводят к немедленному отказу
- **Нет backoff**: 5xx ошибки не повторяются автоматически

**Последствия:**
MCP-сервер может зависнуть, ожидая ответа от TestOps. Инструменты станут невреспонсивны.

**Рекомендация:**
Добавить:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const response = await fetch(url, { ...init, headers, signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

Реализовать retry с exponential backoff для 5xx и сетевых ошибок.

---

### 2. HTTP-клиент: Небезопасная обработка response.text()

**Файл:** `src/client/http-client.ts:67-68`

```typescript
if (!response.ok) {
  const text = await response.text();
  throw new Error(`API error ${response.status} ${init.method} ${url}: ${text}`);
}
```

**Проблема:**
- `response.text()` может быть очень большой (мегабайты) и загрузить память
- Если response малформирован, `text()` может выбросить исключение, скрывающееся за основной ошибкой
- Нет ограничения на размер тела ошибки

**Рекомендация:**
```typescript
if (!response.ok) {
  let text = '';
  try {
    text = await response.text().then(t => t.slice(0, 1000)); //限制到 1KB
  } catch (e) {
    text = '[unable to read response body]';
  }
  throw new Error(`API error ${response.status}: ${text}`);
}
```

---

### 3. HTTP-клиент: response.json() без проверки

**Файл:** `src/client/http-client.ts:76`

```typescript
return (await response.json()) as T;
```

**Проблема:**
- `response.json()` может выбросить SyntaxError, если ответ не JSON
- Отсутствует валидация что полученный объект имеет ожидаемую структуру
- Type cast `as T` ничего не проверяет и скрывает проблемы

**Рекомендация:**
Добавить парсинг с обработкой ошибок:
```typescript
try {
  const data = await response.json();
  // Опционально: валидировать структуру через zod или подобное
  return data as T;
} catch (e) {
  throw new Error(`Invalid JSON response: ${e instanceof Error ? e.message : String(e)}`);
}
```

---

### 4. Аутентификация: Отсутствие обработки ошибок в getAccessToken()

**Файл:** `src/client/auth.ts:14-24`

```typescript
async getAccessToken(): Promise<string> {
  if (this.accessToken && Date.now() < this.tokenExpiresAt) {
    return this.accessToken;
  }
  if (!this.pendingToken) {
    this.pendingToken = this.fetchToken().finally(() => {
      this.pendingToken = null;
    });
  }
  return this.pendingToken;
}
```

**Проблема:**
- Если `fetchToken()` выбросит исключение, оно распространится в caller
- `finally` сбросит pendingToken даже при ошибке, но caller получит rejected Promise
- Второй вызов getAccessToken() во время ошибки первого создаст новый запрос вместо возврата pending Promise
- **Race condition:** если ошибка, следующий вызов не попадает в deduplicate логику

**Рекомендация:**
```typescript
private pendingToken: Promise<string> | null = null;
private lastTokenError: Error | null = null;

async getAccessToken(): Promise<string> {
  if (this.accessToken && Date.now() < this.tokenExpiresAt) {
    return this.accessToken;
  }

  if (this.pendingToken) {
    try {
      return await this.pendingToken;
    } catch {
      // Ошибка уже была залогирована в fetchToken
      throw this.lastTokenError || new Error('Token fetch failed');
    }
  }

  this.pendingToken = this.fetchToken()
    .catch(error => {
      this.lastTokenError = error;
      throw error;
    })
    .finally(() => {
      this.pendingToken = null;
    });

  return this.pendingToken;
}
```

---

### 5. Аутентификация: Отсутствие валидации response

**Файл:** `src/client/auth.ts:50-54`

```typescript
const data = (await response.json()) as TokenResponse;
this.accessToken = data.access_token;
const expiresIn = data.expires_in ?? 3600;
```

**Проблема:**
- Не проверяется что `data.access_token` существует и это string
- `data.access_token` может быть null, undefined, или пустой string
- Нет проверки что `expires_in` положительное число

**Рекомендация:**
```typescript
const data = (await response.json()) as TokenResponse;

if (!data.access_token || typeof data.access_token !== 'string') {
  throw new Error('Invalid token response: missing or invalid access_token');
}

if (data.expires_in !== undefined && (typeof data.expires_in !== 'number' || data.expires_in <= 0)) {
  throw new Error('Invalid token response: expires_in must be positive number');
}

this.accessToken = data.access_token;
const expiresIn = data.expires_in ?? 3600;
```

---

### 6. API-слой: Потеря ошибок в try/catch

**Файл:** `src/api/launches.ts:16-22`

```typescript
async getStatistic(id: number): Promise<TestStatusCount[]> {
  try {
    return await this.http.get<TestStatusCount[]>(`/api/launch/${id}/statistic`);
  } catch {
    return [];
  }
}
```

**Проблема:**
- Ошибка любого типа (HTTP 404, 500, timeout) молча игнорируется
- Caller не знает, что stat отсутствует: реальная ошибка или пустой результат?
- Усложняет отладку — ошибка исчезает без логирования
- Tool `get-launch` (строка 39-42) полагается на это и может выдать неправильные данные

**Рекомендация:**
```typescript
async getStatistic(id: number): Promise<TestStatusCount[]> {
  try {
    return await this.http.get<TestStatusCount[]>(`/api/launch/${id}/statistic`);
  } catch (error) {
    // Логировать или пробросить, но НЕ молча игнорировать
    console.warn(`Failed to get launch statistic for ${id}:`, error);
    // Если API опционален, можно вернуть пустой массив с комментарием
    return [];
  }
}
```

---

### 7. Tools: Небезопасное слияние custom fields

**Файл:** `src/api/test-cases.ts:76-80`

```typescript
private mergeCustomFields(
  current: CustomFieldValueWithCf[],
  updates: CustomFieldValueWithCf[]
): CustomFieldValueWithCf[] {
  const updatedFieldIds = new Set(updates.map(u => u.customField?.id).filter(Boolean));
  const kept = current.filter(c => !updatedFieldIds.has(c.customField?.id));
  return [...kept, ...updates];
}
```

**Проблема:**
- `u.customField?.id` может быть `undefined`
- `filter(Boolean)` не фильтрует `undefined`, он остаётся в Set
- Сравнение `!updatedFieldIds.has(undefined)` может дать неправильный результат
- Если `customField` отсутствует, слияние будет некорректным

**Рекомендация:**
```typescript
private mergeCustomFields(
  current: CustomFieldValueWithCf[],
  updates: CustomFieldValueWithCf[]
): CustomFieldValueWithCf[] {
  const updatedFieldIds = new Set(
    updates
      .map(u => u.customField?.id)
      .filter((id): id is number => id !== undefined && id !== null)
  );

  const kept = current.filter(c =>
    c.customField?.id !== undefined && !updatedFieldIds.has(c.customField.id)
  );

  return [...kept, ...updates];
}
```

---

### 8. Tools: updateCustomFields может упасть

**Файл:** `src/api/test-cases.ts:70-74`

```typescript
async updateCustomFields(
  testCaseId: number,
  projectId: number,
  fields: CustomFieldValueWithCf[]
): Promise<void> {
  const current = await this.getCustomFields(testCaseId, projectId);
  const merged = this.mergeCustomFields(current, fields);
  return this.http.post<void>(`/api/testcase/${testCaseId}/cfv`, merged);
}
```

**Проблема:**
- Если `getCustomFields()` выбросит ошибку (404, 500, timeout), всё падает
- Нет fallback если текущие поля недоступны
- Две отдельные операции (GET + POST) — race condition если другой процесс меняет поля

**Рекомендация:**
```typescript
async updateCustomFields(
  testCaseId: number,
  projectId: number,
  fields: CustomFieldValueWithCf[]
): Promise<void> {
  let current: CustomFieldValueWithCf[] = [];
  try {
    current = await this.getCustomFields(testCaseId, projectId);
  } catch (error) {
    console.warn(`Warning: could not fetch current fields, updating only provided fields: ${error}`);
    // Или пробросить ошибку, в зависимости от бизнес-логики
  }

  const merged = this.mergeCustomFields(current, fields);
  return this.http.post<void>(`/api/testcase/${testCaseId}/cfv`, merged);
}
```

---

## Средние проблемы

### 9. Error Handler: Недостаточная информация об ошибке

**Файл:** `src/utils/error-handler.ts`

```typescript
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  const wrapped = async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true as const,
      };
    }
  };
  return wrapped as T;
}
```

**Проблема:**
- Нет различия между типами ошибок (пользовательская vs серверная)
- Нет логирования на сервере — ошибка исчезает из логов
- User видит только `message`, но не stack trace для отладки
- HTTP статус код теряется

**Рекомендация:**
```typescript
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  const wrapped = async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Логировать на сервере
      console.error('[Tool Error]', error instanceof Error ? error.stack : error);

      // Отправить структурированную ошибку
      const message = error instanceof Error ? error.message : String(error);
      const isNetworkError = message.includes('API error') || message.includes('fetch');

      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${message}${isNetworkError ? ' (connection issue)' : ''}`
        }],
        isError: true as const,
      };
    }
  };
  return wrapped as T;
}
```

---

### 10. Config: Отсутствие валидации при инициализации

**Файл:** `src/config.ts:9-15`

```typescript
export function resolveProjectId(argsProjectId: number | undefined): number {
  const projectId = argsProjectId ?? config.projectId;
  if (projectId === undefined) {
    throw new Error('projectId is required. Either pass it as a parameter or set TESTOPS_PROJECT_ID environment variable.');
  }
  return projectId;
}
```

**Проблема:**
- `projectId` может быть отрицательным числом или 0 — ошибка будет видна только при API-вызове
- `config.testopsUrl` и `config.testopsToken` могут быть пустыми строками — `validateConfig()` вызывается, но может быть забыт
- Нет проверки что URL валиден

**Рекомендация:**
```typescript
export function resolveProjectId(argsProjectId: number | undefined): number {
  const projectId = argsProjectId ?? config.projectId;

  if (projectId === undefined) {
    throw new Error('projectId is required. Either pass it as a parameter or set TESTOPS_PROJECT_ID environment variable.');
  }

  if (projectId <= 0) {
    throw new Error(`Invalid projectId: ${projectId}. Must be positive number.`);
  }

  return projectId;
}

export function validateConfig(): void {
  if (!config.testopsUrl || config.testopsUrl.trim() === '') {
    throw new Error('TESTOPS_URL environment variable is required and must not be empty');
  }

  if (!config.testopsToken || config.testopsToken.trim() === '') {
    throw new Error('TESTOPS_TOKEN environment variable is required and must not be empty');
  }

  try {
    new URL(config.testopsUrl);
  } catch {
    throw new Error(`Invalid TESTOPS_URL: ${config.testopsUrl}`);
  }
}
```

---

### 11. JSON.stringify может выбросить исключение

**Файл:** `src/client/http-client.ts:24`

```typescript
body: body !== undefined ? JSON.stringify(body) : undefined,
```

**Проблема:**
- `JSON.stringify()` выбросит ошибку если объект содержит circular reference
- Очень большие объекты могут исчерпать память
- Функции и символы не сериализуются — без ошибки

**Рекомендация:**
```typescript
let bodyStr: string | undefined = undefined;
if (body !== undefined) {
  try {
    bodyStr = JSON.stringify(body);
  } catch (error) {
    throw new Error(
      `Failed to serialize request body: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

return this.request<T>(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: bodyStr,
});
```

---

## Низкие проблемы (граничные случаи)

### 12. Отсутствие проверки пустых массивов

**Файл:** `src/tools/test-cases.ts` (setMembers, setIssues, setRelations и т.д.)

```typescript
async setMembers(testCaseId: number, members: MemberDto[]): Promise<MemberDto[]> {
  return this.http.post<MemberDto[]>(`/api/testcase/${testCaseId}/members`, members);
}
```

**Проблема:**
- Пустой массив `[]` передаётся на сервер без проверки — может удалить всех членов
- Нет валидации что члены содержат `id` и `role.id`

**Рекомендация:**
Добавить валидацию на уровне tool handler:
```typescript
if (params.members.length === 0) {
  return {
    content: [{ type: 'text', text: 'Warning: empty members list. Specify at least one member.' }],
    isError: true
  };
}
```

---

### 13. Отсутствие валидации ID в URL

**Файл:** Все API файлы

```typescript
async getById(id: number): Promise<Project> {
  return this.http.get<Project>(`/api/project/${id}`);
}
```

**Проблема:**
- `id` может быть NaN, отрицательным, 0
- URL будет `"/api/project/NaN"` — ошибка на сервере

**Рекомендация:**
```typescript
async getById(id: number): Promise<Project> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid project ID: ${id}. Must be positive integer.`);
  }
  return this.http.get<Project>(`/api/project/${id}`);
}
```

---

### 14. Отсутствие проверки Page Response

**Файл:** Все API файлы с PageResponse

```typescript
async list(projectId: number, params?: { page?: number; size?: number }): Promise<PageResponse<Project>> {
  return this.http.get<PageResponse<Project>>('/api/project', params);
}
```

**Проблема:**
- Вернулся массив вместо PageResponse — crash при доступе к `result.content`
- `totalElements` может быть больше чем `content.length` — инконсистентность
- Отсутствует проверка что `content` это массив

**Рекомендация:**
Добавить структурную валидацию (Zod):
```typescript
const pageResponseSchema = z.object({
  content: z.array(z.any()),
  totalElements: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  number: z.number().int().min(0),
  size: z.number().int().min(1),
});

async list(...): Promise<PageResponse<Project>> {
  const response = await this.http.get<unknown>('/api/project', params);
  const validated = pageResponseSchema.parse(response);
  return validated as PageResponse<Project>;
}
```

---

### 15. Race Condition в get-launch

**Файл:** `src/tools/launches.ts:38-42`

```typescript
const result = await api.getById(params.id);
if (!result.statistic || result.statistic.length === 0) {
  const stat = await api.getStatistic(params.id);
  if (stat.length > 0) result.statistic = stat;
}
```

**Проблема:**
- Две отдельные операции без синхронизации
- Если statistic обновится между двумя вызовами, будет несогласованность
- `result` это reference объект — изменение может нарушить состояние

**Рекомендация:**
```typescript
const result = await api.getById(params.id);
if (!result.statistic || result.statistic.length === 0) {
  try {
    const stat = await api.getStatistic(params.id);
    if (stat.length > 0) {
      // Создать новый объект вместо мутации
      result = { ...result, statistic: stat };
    }
  } catch (error) {
    console.warn('Could not fetch additional statistic data', error);
  }
}
```

---

## Утечки ресурсов

### 16. Headers объект создаётся каждый раз

**Файл:** `src/client/http-client.ts:56`

```typescript
const headers = new Headers(init.headers);
headers.set('Authorization', `Bearer ${token}`);
```

**Проблема (минор):**
- Каждый запрос создаёт новый Headers object
- При миллионах запросов может быть заметно на GC

**Рекомендация:**
Использовать object вместо Headers в типе, если возможно.

---

## Резюме проблем по критичности

| # | Проблема | Критичность | Область |
|---|----------|------------|---------|
| 1 | Нет timeout/retry | **КРИТИЧНАЯ** | http-client |
| 2 | Большой response.text() | **ВЫСОКАЯ** | http-client |
| 3 | response.json() без проверки | **ВЫСОКАЯ** | http-client |
| 4 | Auth ошибки без обработки | **ВЫСОКАЯ** | auth |
| 5 | Валидация response в auth | **ВЫСОКАЯ** | auth |
| 6 | Silent catch в getStatistic | **ВЫСОКАЯ** | launches |
| 7 | Небезопасное merge fields | **ВЫСОКАЯ** | test-cases |
| 8 | updateCustomFields может упасть | **ВЫСОКАЯ** | test-cases |
| 9 | Error handler слабый | **СРЕДНЯЯ** | error-handler |
| 10 | Отсутствие валидации config | **СРЕДНЯЯ** | config |
| 11 | JSON.stringify ошибки | **СРЕДНЯЯ** | http-client |
| 12 | Нет проверки пустых массивов | **НИЗКАЯ** | tools |
| 13 | Нет валидации ID | **НИЗКАЯ** | api |
| 14 | Нет валидации PageResponse | **НИЗКАЯ** | api |
| 15 | Race condition в get-launch | **НИЗКАЯ** | tools |
| 16 | Headers resource leak | **МИНОР** | http-client |

---

## Рекомендации по приоритизации

**Спринт 1 (Критичные — неделя 1):**
- [x] #1: Добавить timeout и retry механизм в http-client
- [x] #4: Обработка ошибок аутентификации
- [x] #5: Валидация token response

**Спринт 2 (Высокие — неделя 2-3):**
- [x] #2: Ограничить размер response.text()
- [x] #6: Убрать silent catch или добавить логирование
- [x] #7-8: Исправить mergeCustomFields и updateCustomFields
- [x] #9: Улучшить error handler
- [x] #10: Добавить валидацию конфига

**Спринт 3 (Средние — неделя 4):**
- [ ] #11: Обработка JSON.stringify ошибок
- [ ] #14: Валидация PageResponse структуры

**Backlog (Низкие):**
- [ ] #12-13, #15-16: Граничные случаи и оптимизации

---

## Общие рекомендации

1. **Добавить логирование на критических путях** (auth, http ошибки)
2. **Использовать Zod для валидации всех API ответов** — типы не достаточно
3. **Добавить structured error types** вместо обычных Error strings
4. **Тестировать граничные случаи**: null/undefined responses, empty arrays, large payloads
5. **Документировать expected/unexpected ошибки** для каждого API метода
