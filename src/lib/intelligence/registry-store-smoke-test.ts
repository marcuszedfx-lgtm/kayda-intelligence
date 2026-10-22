import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EMPTY_REGISTRY,
  loadRegistry,
  validateRegistry,
} from './registry-store';

function withTempRegistryFile(
  contents: string | null,
  run: (filePath: string) => void,
): void {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kayda-registry-'),
  );
  const filePath = path.join(dir, 'kayda-registry.json');

  try {
    if (contents !== null) {
      fs.writeFileSync(filePath, contents, 'utf8');
    }

    run(filePath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function run() {
  // 1. Missing file is an honest empty state, not an error.
  withTempRegistryFile(null, (filePath) => {
    const result = loadRegistry(filePath);

    assert.equal(result.exists, false);
    assert.deepEqual(result.registry, EMPTY_REGISTRY);
    assert.equal(result.errors.length, 0);
  });

  // 2. Malformed JSON yields empty registry + honest error,
  //    without echoing file contents (may hold secrets).
  withTempRegistryFile('{ not valid json', (filePath) => {
    const result = loadRegistry(filePath);

    assert.equal(result.exists, true);
    assert.deepEqual(result.registry, EMPTY_REGISTRY);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /not valid JSON/);
    assert.ok(!result.errors[0].includes('not valid json'));
  });

  // 3. Wrong root type.
  {
    const { registry, errors } = validateRegistry([
      'not',
      'an',
      'object',
    ]);
    assert.deepEqual(registry, EMPTY_REGISTRY);
    assert.equal(errors.length, 1);
  }

  // 4. Valid entries are kept; invalid entries are excluded
  //    and reported. Referential errors drop the offender.
  {
    const { registry, errors } = validateRegistry({
      sources: [
        {
          id: 'source-valid',
          name: 'Valid Source',
          sourceType: 'News',
          publisher: 'Valid Publisher',
          credibility: 60,
          active: true,
          websiteUrl: 'https://valid.example.com/',
          feedType: 'RSS',
          tags: [],
          domains: [],
        },
        {
          id: 'source-bad-feedtype',
          name: 'Bad FeedType Source',
          sourceType: 'News',
          publisher: 'Publisher',
          websiteUrl: 'https://bad.example.com/',
          feedType: 'Telepathy',
          tags: [],
          domains: [],
        },
      ],
      companies: [
        {
          id: 'company-valid',
          name: 'Valid Company',
          country: 'Exampleland',
          industry: 'Manufacturing',
          status: 'Monitoring',
          importance: 'High',
          roles: ['Supplier'],
        },
      ],
      companyProfiles: [
        {
          companyId: 'company-valid',
          monitoringEnabled: true,
          relevanceScore: 70,
          domains: ['Manufacturing'],
          keywords: ['valid'],
          countries: ['Exampleland'],
          commodities: [],
        },
        {
          companyId: 'company-missing',
          monitoringEnabled: true,
          relevanceScore: 70,
          domains: [],
          keywords: [],
          countries: [],
          commodities: [],
        },
      ],
      companySourceRelationships: [
        {
          id: 'rel-valid',
          companyId: 'company-valid',
          sourceId: 'source-valid',
          active: true,
          relevance: 'General coverage.',
        },
        {
          id: 'rel-bad-source',
          companyId: 'company-valid',
          sourceId: 'source-missing',
          active: true,
          relevance: 'Dangling source reference.',
        },
      ],
    });

    assert.equal(registry.sources.length, 1);
    assert.equal(registry.companies.length, 1);
    assert.equal(registry.companyProfiles.length, 1);
    assert.equal(registry.companySourceRelationships.length, 1);

    assert.ok(
      errors.some((error) => error.includes('feedType')),
      'invalid feedType must be reported',
    );
    assert.ok(
      errors.some((error) =>
        error.includes('company-missing'),
      ),
      'dangling profile companyId must be reported',
    );
    assert.ok(
      errors.some((error) => error.includes('source-missing')),
      'dangling relationship sourceId must be reported',
    );
  }

  // 5. Duplicate IDs are reported.
  {
    const source = {
      id: 'source-dupe',
      name: 'Dupe',
      sourceType: 'News',
      publisher: 'Publisher',
      websiteUrl: 'https://dupe.example.com/',
      feedType: 'Manual',
      tags: [],
      domains: [],
    };

    const { errors } = validateRegistry({
      sources: [source, { ...source }],
      companies: [],
      companyProfiles: [],
      companySourceRelationships: [],
    });

    assert.ok(
      errors.some((error) => error.includes('duplicate id')),
      'duplicate source ids must be reported',
    );
  }

  console.log('✓ Registry store smoke test passed.');
  console.log('  Missing file, malformed JSON, invalid and');
  console.log('  dangling records all degrade to honest');
  console.log('  empty states with precise errors.');
}

run().catch((error) => {
  console.error('✗ Registry store smoke test failed.');
  console.error(error);
  process.exit(1);
});
