import { classifyIntelligenceArticle } from './classify';

const result = classifyIntelligenceArticle({
  title: 'Bank of Zambia announces new foreign exchange regulations',
  summary:
    'The new rules may affect currency transactions, compliance requirements and settlement procedures.',
  sourceName: 'Kayda Intelligence Test',
});

if (result.primaryDomain !== 'Regulation' && result.primaryDomain !== 'FX') {
  throw new Error(
    `Unexpected primary domain: ${result.primaryDomain}`,
  );
}

if (result.relevanceScore < 40) {
  throw new Error(
    `Relevance score unexpectedly low: ${result.relevanceScore}`,
  );
}

if (result.impactScore < 40) {
  throw new Error(
    `Impact score unexpectedly low: ${result.impactScore}`,
  );
}

console.log('✓ V1.4 classifier smoke test passed.');
console.log(`  Domain: ${result.primaryDomain}`);
console.log(`  Relevance: ${result.relevanceScore}/100`);
console.log(`  Impact: ${result.impactScore}/100`);
console.log(`  Urgency: ${result.urgency}`);
console.log(`  Confidence: ${result.confidenceScore}/100`);
