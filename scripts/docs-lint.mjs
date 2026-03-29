import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  'docs/index.md',
  'docs/architecture.md',
  'docs/reliability.md',
  'docs/security.md',
  'docs/logging.md',
  'docs/evals.md',
  'docs/plans/agent-first-foundation.md',
];

async function ensureFileExists(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      throw new Error(`${relativePath} must be a file`);
    }
  } catch (error) {
    throw new Error(`Missing required documentation file: ${relativePath}`);
  }
}

async function main() {
  for (const relativePath of requiredFiles) {
    await ensureFileExists(relativePath);
  }

  const agentsPath = path.join(repoRoot, 'AGENTS.md');
  const agentsContent = await readFile(agentsPath, 'utf8');
  const lineCount = agentsContent.split('\n').length;
  if (lineCount > 120) {
    throw new Error(`AGENTS.md must stay short and actionable (found ${lineCount} lines, limit is 120)`);
  }

  if (!agentsContent.includes('docs/index.md')) {
    throw new Error('AGENTS.md must point readers to docs/index.md');
  }

  const evalsContent = await readFile(path.join(repoRoot, 'docs/evals.md'), 'utf8');
  if (!evalsContent.includes('npm run eval:matrix')) {
    throw new Error('docs/evals.md must document npm run eval:matrix');
  }

  const reliabilityContent = await readFile(path.join(repoRoot, 'docs/reliability.md'), 'utf8');
  if (!reliabilityContent.includes('TESTOPS_LOG_LEVEL') || !reliabilityContent.includes('TESTOPS_LOG_FORMAT')) {
    throw new Error('docs/reliability.md must document TESTOPS_LOG_LEVEL and TESTOPS_LOG_FORMAT');
  }

  console.log(`Documentation checks passed (${requiredFiles.length} files, AGENTS.md ${lineCount} lines).`);
}

main().catch((error) => {
  console.error(`docs:lint failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
