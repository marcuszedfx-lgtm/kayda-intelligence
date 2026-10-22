import {
  getRegisteredSources,
  getRegisteredSourceById,
  getRegisteredIntelligenceFeeds,
  searchRegisteredSources,
} from './source-registry';
import { EMPTY_REGISTRY } from './registry-store';
import { fixtureRegistry } from '@/test/fixtures/registry-fixtures';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('');
console.log('==================================================');
console.log(' SOURCE REGISTRY TEST (isolated fixture)');
console.log('==================================================');
console.log('');

// ---------------------------------------------------------
// 1. Empty registry is an honest empty state
// ---------------------------------------------------------
const emptySources = getRegisteredSources(EMPTY_REGISTRY);
assert(
  emptySources.length === 0,
  'empty registry must yield zero sources',
);
assert(
  getRegisteredIntelligenceFeeds(EMPTY_REGISTRY).length === 0,
  'empty registry must yield zero feeds',
);
console.log('EMPTY REGISTRY STATUS: honest empty state');

// ---------------------------------------------------------
// 2. Active sources from fixture
// ---------------------------------------------------------
const sources = getRegisteredSources(fixtureRegistry);
console.log(`ACTIVE SOURCES: ${sources.length}`);
assert(sources.length === 2, 'expected exactly 2 active sources');
assert(
  sources.every((source) => source.active),
  'inactive sources must be excluded',
);

// ---------------------------------------------------------
// 3. Lookup
// ---------------------------------------------------------
const regulator = getRegisteredSourceById(
  'source-fixture-regulator',
  fixtureRegistry,
);
assert(Boolean(regulator), 'fixture regulator lookup failed');
assert(
  regulator?.publisher === 'Fixture Authority',
  'lookup returned the wrong source',
);
console.log('LOOKUP STATUS: success');

// ---------------------------------------------------------
// 4. Search
// ---------------------------------------------------------
const regulationResults = searchRegisteredSources(
  'regulation',
  fixtureRegistry,
);
assert(
  regulationResults.length > 0,
  'source search returned no matches',
);
console.log('SEARCH STATUS: success');

// ---------------------------------------------------------
// 5. Feed compatibility
// ---------------------------------------------------------
const feeds = getRegisteredIntelligenceFeeds(fixtureRegistry);
assert(
  feeds.length === sources.length,
  'feed/source registry count mismatch',
);
assert(
  feeds.every((feed) => feed.status === 'Active'),
  'derived feeds must be Active',
);
console.log('FEED COMPATIBILITY STATUS: success');

console.log('');
console.log('==================================================');
console.log(' SOURCE REGISTRY TEST PASSED');
console.log('==================================================');
console.log('');
