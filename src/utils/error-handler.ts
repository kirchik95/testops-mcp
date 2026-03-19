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
