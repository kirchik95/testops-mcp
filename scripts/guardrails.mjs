import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const allowedFetchFiles = new Set([
  path.join(srcRoot, 'client', 'auth.ts'),
  path.join(srcRoot, 'client', 'http-client.ts'),
]);
const allowedConsoleFiles = new Set([
  path.join(srcRoot, 'utils', 'logger.ts'),
]);
const writeToolGuards = new Map([
  ['src/tools/test-cases.ts', [
    'create-test-case',
    'update-test-case',
    'delete-test-case',
    'update-test-case-scenario',
    'set-test-case-issues',
    'set-test-case-members',
    'set-test-case-custom-fields',
    'set-test-case-relations',
    'set-test-case-requirements',
    'set-test-case-test-keys',
  ]],
  ['src/tools/test-plans.ts', ['create-test-plan', 'update-test-plan']],
  ['src/tools/defects.ts', ['create-defect', 'update-defect']],
  ['src/tools/test-results.ts', ['update-test-result']],
]);

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getReadOnlyRanges(source) {
  const ranges = [];
  const pattern = /if\s*\(!readOnly\)\s*\{/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const openBraceIndex = source.indexOf('{', match.index);
    let depth = 0;
    let closeBraceIndex = -1;

    for (let index = openBraceIndex; index < source.length; index += 1) {
      const char = source[index];
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;

      if (depth === 0) {
        closeBraceIndex = index;
        break;
      }
    }

    if (closeBraceIndex === -1) {
      throw new Error('Unable to parse readOnly guard block');
    }

    ranges.push([openBraceIndex, closeBraceIndex]);
  }

  return ranges;
}

function isInsideProtectedRange(index, ranges) {
  return ranges.some(([start, end]) => index > start && index < end);
}

function findCatchBlocks(source) {
  const blocks = [];
  const pattern = /catch\s*(?:\([^)]*\))?\s*\{/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const openBraceIndex = source.indexOf('{', match.index);
    let depth = 0;
    let closeBraceIndex = -1;

    for (let index = openBraceIndex; index < source.length; index += 1) {
      const char = source[index];
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;

      if (depth === 0) {
        closeBraceIndex = index;
        break;
      }
    }

    if (closeBraceIndex === -1) {
      throw new Error('Unable to parse catch block');
    }

    blocks.push(source.slice(match.index, closeBraceIndex + 1));
    pattern.lastIndex = closeBraceIndex + 1;
  }

  return blocks;
}

async function main() {
  const sourceFiles = await listSourceFiles(srcRoot);
  const violations = [];

  for (const absolutePath of sourceFiles) {
    const relativePath = path.relative(repoRoot, absolutePath);
    const source = await readFile(absolutePath, 'utf8');

    if (source.includes('fetch(') && !allowedFetchFiles.has(absolutePath)) {
      violations.push(`${relativePath}: direct fetch() is only allowed in src/client/auth.ts and src/client/http-client.ts`);
    }

    if (source.includes('console.') && !allowedConsoleFiles.has(absolutePath)) {
      violations.push(`${relativePath}: direct console.* usage is forbidden in src runtime code outside src/utils/logger.ts`);
    }

    if (relativePath.startsWith('src/api/') || relativePath.startsWith('src/client/')) {
      for (const catchBlock of findCatchBlocks(source)) {
        if (catchBlock.includes('guardrails:allow-lossy-catch')) continue;
        if (catchBlock.includes('throw ')) continue;
        violations.push(`${relativePath}: catch blocks must rethrow unless explicitly marked with guardrails:allow-lossy-catch`);
      }
    }

    const guardedTools = writeToolGuards.get(relativePath);
    if (guardedTools) {
      const protectedRanges = getReadOnlyRanges(source);
      for (const toolName of guardedTools) {
        const toolIndex = source.indexOf(`'${toolName}'`);
        if (toolIndex === -1) {
          violations.push(`${relativePath}: missing expected write tool registration for ${toolName}`);
          continue;
        }

        if (!isInsideProtectedRange(toolIndex, protectedRanges)) {
          violations.push(`${relativePath}: write tool ${toolName} must be registered inside if (!readOnly)`);
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Guardrail violations:\n- ${violations.join('\n- ')}`);
  }

  console.log(`Guardrails passed (${sourceFiles.length} source files checked).`);
}

main().catch((error) => {
  console.error(`guardrails failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
