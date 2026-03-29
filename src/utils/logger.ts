import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getExecutionContext } from './runtime-context.js';

export type LogLevel = 'error' | 'info' | 'debug';
export type LogFormat = 'json' | 'pretty';

export interface LogFields {
  [key: string]: unknown;
}

interface LogEntry extends LogFields {
  ts: string;
  level: LogLevel;
  event: string;
}

const logLevelPriority: Record<LogLevel, number> = {
  error: 0,
  info: 1,
  debug: 2,
};

const redactedKeys = new Set([
  'token',
  'testopsToken',
  'accessToken',
  'authorization',
  'authHeader',
  'authBody',
  'bearerToken',
]);

function sanitizeValue(key: string, value: unknown): unknown {
  if (redactedKeys.has(key)) {
    return '[REDACTED]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [nestedKey, sanitizeValue(nestedKey, nestedValue)])
    );
  }

  return value;
}

function sanitizeFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sanitizeValue(key, value)])
  );
}

export function createRequestId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function shouldLog(level: LogLevel): boolean {
  return logLevelPriority[level] <= logLevelPriority[config.logLevel];
}

export function formatLogEntry(entry: LogEntry, format: LogFormat): string {
  if (format === 'json') {
    return JSON.stringify(entry);
  }

  const { ts, level, event, ...fields } = entry;
  const fieldSuffix = Object.entries(fields)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');

  return fieldSuffix
    ? `${ts} [${level}] ${event} ${fieldSuffix}`
    : `${ts} [${level}] ${event}`;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (!shouldLog(level)) return;

  const contextFields = sanitizeFields({ ...getExecutionContext() });
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...contextFields,
    ...sanitizeFields(fields),
  };

  process.stderr.write(`${formatLogEntry(entry, config.logFormat)}\n`);
}
