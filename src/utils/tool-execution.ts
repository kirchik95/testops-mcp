import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequestId, logEvent } from './logger.js';
import { runWithExecutionContext } from './runtime-context.js';

type RegisteredToolHandler = (...args: any[]) => Promise<any>;

function extractResultText(result: unknown): string | undefined {
  if (!result || typeof result !== 'object' || !('content' in result)) return undefined;
  const content = (result as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!Array.isArray(content)) return undefined;

  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function wrapToolHandler(toolName: string, handler: RegisteredToolHandler): RegisteredToolHandler {
  return async (...args: any[]) => {
    const toolRequestId = createRequestId('tool');
    const startedAt = Date.now();

    return runWithExecutionContext({ toolName, toolRequestId }, async () => {
      logEvent('info', 'tool.start', { toolName });

      const result = await handler(...args);
      const durationMs = Date.now() - startedAt;
      const isError = Boolean(result && typeof result === 'object' && 'isError' in result && result.isError === true);

      if (isError) {
        logEvent('error', 'tool.error', {
          toolName,
          durationMs,
          errorMessage: extractResultText(result),
        });
      } else {
        logEvent('info', 'tool.success', { toolName, durationMs });
      }

      return result;
    });
  };
}

export function createLoggedServer(server: McpServer): McpServer {
  return new Proxy(server, {
    get(target, property, receiver) {
      if (property === 'registerTool') {
        return (toolName: string, config: unknown, handler: RegisteredToolHandler) => {
          const originalRegisterTool = Reflect.get(target, property, receiver) as (
            name: string,
            configuration: unknown,
            cb: RegisteredToolHandler,
          ) => void;

          return originalRegisterTool.call(target, toolName, config, wrapToolHandler(toolName, handler));
        };
      }

      return Reflect.get(target, property, receiver);
    },
  }) as McpServer;
}
