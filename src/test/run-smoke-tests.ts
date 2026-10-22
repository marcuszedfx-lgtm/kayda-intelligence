import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — DETERMINISTIC TEST SUITE
 * =========================================================
 *
 * Runs every OFFLINE smoke test in its own process, so a
 * failure in one file is reported without hiding the rest.
 *
 * Excluded on purpose:
 *
 * - `live-adapter-smoke-test.ts` performs real outbound
 *   requests and requires a URL argument. Run it manually:
 *
 *     npx tsx src/lib/intelligence/live-adapter-smoke-test.ts <url> [RSS|Atom|API|Manual]
 *
 * - `live-ingestion` / database paths need a registry and a
 *   running PostgreSQL instance, neither of which is required
 *   to verify the code.
 *
 * The suite never reaches the network and never touches a
 * database: the connection check is only exercised on the
 * paths that are refused before connecting.
 * =========================================================
 */

const TESTS = [
  'src/lib/ai/provider-config-smoke-test.ts',
  'src/lib/ai/provider-factory-smoke-test.ts',
  'src/lib/ai/router-smoke-test.ts',
  'src/lib/ai/providers/openai-compatible-smoke-test.ts',
  'src/lib/intelligence/search/router-smoke-test.ts',
  'src/lib/db/connection-check-smoke-test.ts',
  'src/lib/db/port-guard-smoke-test.ts',
  'src/lib/db/workspace-mapping-smoke-test.ts',
  'src/lib/workspace/validation-smoke-test.ts',
  'src/lib/security/security-smoke-test.ts',
  'src/lib/security/request-context-smoke-test.ts',
  'src/lib/security/trusted-proxy-smoke-test.ts',
  'src/lib/intelligence/registry-store-smoke-test.ts',
  'src/lib/intelligence/classify-smoke-test.ts',
  'src/lib/intelligence/company-registry-smoke-test.ts',
  'src/lib/intelligence/company-intelligence-smoke-test.ts',
  'src/lib/intelligence/core-schema-smoke-test.ts',
  'src/lib/intelligence/decision-smoke-test.ts',
  'src/lib/intelligence/decision-queue-smoke-test.ts',
  'src/lib/intelligence/evidence-analysis-schema-smoke-test.ts',
  'src/lib/intelligence/evidence-analysis-smoke-test.ts',
  'src/lib/intelligence/evidence-analysis-grounding-smoke-test.ts',
  'src/lib/intelligence/evidence-analysis-provenance-smoke-test.ts',
  'src/lib/intelligence/ranking-smoke-test.ts',
  'src/lib/intelligence/retrieval-smoke-test.ts',
  'src/lib/intelligence/source-discovery-smoke-test.ts',
  'src/lib/intelligence/source-registry-smoke-test.ts',
  'src/lib/intelligence/source-transport-smoke-test.ts',
  'src/lib/intelligence/source-validation-smoke-test.ts',
  'src/lib/intelligence/engine-smoke-test.ts',
  'src/lib/intelligence/v15-foundation-smoke-test.ts',
] as const;

interface Outcome {
  test: string;
  ok: boolean;
  code: number | null;
}

const outcomes: Outcome[] = [];

for (const test of TESTS) {
  process.stdout.write(`\n▶ ${test}\n`);

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', path.join(process.cwd(), test)],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    },
  );

  const ok = result.status === 0;

  outcomes.push({ test, ok, code: result.status });

  if (!ok) {
    process.stdout.write(`\n✗ ${test} exited with ${result.status}\n`);
  }
}

const failed = outcomes.filter((outcome) => !outcome.ok);

console.log('\n==================================================');
console.log(` TEST SUMMARY — ${outcomes.length - failed.length}/${outcomes.length} passed`);
console.log('==================================================');

for (const outcome of outcomes) {
  console.log(`  ${outcome.ok ? '✓' : '✗'} ${outcome.test}`);
}

if (failed.length) {
  console.error(
    `\n${failed.length} test file(s) failed. This is not a passing suite.`,
  );
  process.exit(1);
}

console.log('\nAll deterministic smoke tests passed.');
