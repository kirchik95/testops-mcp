import { AsyncLocalStorage } from 'node:async_hooks';

export interface ExecutionContext {
  toolName?: string;
  toolRequestId?: string;
}

const executionContextStorage = new AsyncLocalStorage<ExecutionContext>();

export function runWithExecutionContext<T>(context: ExecutionContext, fn: () => Promise<T>): Promise<T> {
  return executionContextStorage.run(context, fn);
}

export function getExecutionContext(): ExecutionContext {
  return executionContextStorage.getStore() ?? {};
}
