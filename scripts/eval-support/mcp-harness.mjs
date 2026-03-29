import { spawn } from 'node:child_process';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const repoRoot = process.cwd();
const serverEntry = path.join(repoRoot, 'build', 'index.js');

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function extractText(result) {
  if (!result.content || result.content.length === 0) return '';
  return result.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export function buildEnv(overrides) {
  const env = {
    ...process.env,
    ...Object.fromEntries(
      Object.entries(overrides)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ),
  };

  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
}

export async function withClient(envOverrides, fn) {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverEntry],
    cwd: repoRoot,
    env: buildEnv(envOverrides),
    stderr: 'pipe',
  });
  const stderrChunks = [];

  if (transport.stderr) {
    transport.stderr.on('data', (chunk) => {
      stderrChunks.push(String(chunk));
    });
  }

  const client = new Client({ name: 'eval-harness', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);
    const result = await fn(client, stderrChunks);
    return { result, stderr: stderrChunks.join('') };
  } finally {
    await client.close();
  }
}

export async function expectStartupFailure(envOverrides, expectedMessage) {
  await new Promise((resolve, reject) => {
    const child = spawn('node', [serverEntry], {
      cwd: repoRoot,
      env: buildEnv(envOverrides),
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      try {
        assert(code === 1, `Expected startup failure to exit with code 1, got ${code}`);
        assert(stderr.includes(expectedMessage), `Startup failure must include: ${expectedMessage}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function parseJsonStderr(stderr) {
  return stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function assertSecretsAbsent(stderr, secrets) {
  for (const secret of secrets) {
    assert(!stderr.includes(secret), `stderr output must not include secret value: ${secret}`);
  }
}
