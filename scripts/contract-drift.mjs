import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { apiContracts, contractSignature, normalizePathTemplate } from './eval-support/contracts.mjs';

const repoRoot = process.cwd();
const apiDir = path.join(repoRoot, 'src', 'api');

const apiFiles = [
  'projects.ts',
  'test-cases.ts',
  'test-plans.ts',
  'launches.ts',
  'test-results.ts',
  'defects.ts',
  'analytics.ts',
  'reference-data.ts',
];

function extractContractsFromSource(source) {
  const contracts = [];
  const pattern = /this\.http\.(get|post|patch|delete)(?:<[^()]+>)?\((`[^`]+`|'[^']+')/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const method = match[1].toUpperCase();
    const rawLiteral = match[2];
    const rawPath = rawLiteral.slice(1, -1);
    contracts.push({
      method,
      path: normalizePathTemplate(rawPath),
    });
  }

  return contracts;
}

async function main() {
  const sourceContracts = [];

  for (const fileName of apiFiles) {
    const source = await readFile(path.join(apiDir, fileName), 'utf8');
    sourceContracts.push(...extractContractsFromSource(source));
  }

  const expected = new Set(apiContracts.map(contractSignature));
  const actual = new Set(sourceContracts.map(contractSignature));

  const missingFromRegistry = [...actual].filter((signature) => !expected.has(signature));
  const missingFromApi = [...expected].filter((signature) => !actual.has(signature));

  if (missingFromRegistry.length > 0 || missingFromApi.length > 0) {
    const problems = [];
    if (missingFromRegistry.length > 0) {
      problems.push(`Contracts present in src/api but missing from scripts/eval-support/contracts.mjs:\n- ${missingFromRegistry.join('\n- ')}`);
    }
    if (missingFromApi.length > 0) {
      problems.push(`Contracts present in scripts/eval-support/contracts.mjs but missing from src/api:\n- ${missingFromApi.join('\n- ')}`);
    }

    throw new Error(`Contract drift detected.\n${problems.join('\n')}`);
  }

  console.log(`Contract drift check passed (${actual.size} API contracts).`);
}

main().catch((error) => {
  console.error(`contract:drift failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
