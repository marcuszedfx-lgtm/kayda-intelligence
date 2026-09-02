import {
  getRegisteredSources,
  getRegisteredSourceById,
  getRegisteredIntelligenceFeeds,
  searchRegisteredSources,
} from './source-registry';

console.log('');
console.log('==================================================');
console.log(' KAYDA INTELLIGENCE V1.5 — SOURCE REGISTRY TEST');
console.log('==================================================');
console.log('');

const sources = getRegisteredSources();

console.log('ACTIVE SOURCES:', sources.length);
console.log('');

for (const source of sources) {
  console.log(`SOURCE: ${source.name}`);
  console.log(`ID: ${source.id}`);
  console.log(`TYPE: ${source.sourceType}`);
  console.log(`PUBLISHER: ${source.publisher}`);
  console.log(`CREDIBILITY: ${source.credibility}`);
  console.log(`WEBSITE: ${source.websiteUrl}`);
  console.log(`METHOD: ${source.feedType}`);
  console.log(`TAGS: ${source.tags.join(', ')}`);
  console.log(`DOMAINS: ${source.domains.join(', ')}`);
  console.log('--------------------------------------------------');
}

console.log('');
console.log('=== SOURCE LOOKUP TEST ===');

const zra = getRegisteredSourceById(
  'source-zambian-regulatory',
);

if (!zra) {
  console.error('ERROR: ZRA source lookup failed.');
  process.exit(1);
}

console.log('ZRA LOOKUP:', zra.name);
console.log('LOOKUP STATUS: success');

console.log('');
console.log('=== SOURCE SEARCH TEST ===');

const sugarResults = searchRegisteredSources('sugar');

console.log('SEARCH: sugar');
console.log(
  'MATCHES:',
  sugarResults.map((source) => source.name).join(', '),
);

if (sugarResults.length === 0) {
  console.error('ERROR: Sugar source search failed.');
  process.exit(1);
}

console.log('SEARCH STATUS: success');

console.log('');
console.log('=== FEED COMPATIBILITY TEST ===');

const feeds = getRegisteredIntelligenceFeeds();

console.log('REGISTERED FEEDS:', feeds.length);

if (feeds.length !== sources.length) {
  console.error(
    'ERROR: Feed/source registry count mismatch.',
  );
  process.exit(1);
}

for (const feed of feeds) {
  console.log(
    `${feed.name} -> ${feed.feedType} -> ${feed.status}`,
  );
}

console.log('');
console.log('==================================================');
console.log(' SOURCE REGISTRY TEST PASSED');
console.log('==================================================');
console.log('');
