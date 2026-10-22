import { classifyIntelligenceArticle } from './classify';

/**
 * =========================================================
 * CLASSIFIER SMOKE TEST (K-05 regression suite)
 * =========================================================
 *
 * These tests encode the corrected classification rules:
 *
 * - Primary domain is TOPICAL only. Geography is context.
 * - No country or organisation may dominate classification.
 * - A newly encountered organisation is classified by what
 *   the article is ABOUT, not by where it is from.
 * - Geographic mentions never inflate relevance scores.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const GEOGRAPHIC_DOMAINS = ['Africa', 'Global'];

// ---------------------------------------------------------
// 1. Regulatory article mentioning a central bank
// ---------------------------------------------------------
const regulatory = classifyIntelligenceArticle({
  title: 'Bank of Zambia announces new foreign exchange regulations',
  summary:
    'The new rules may affect currency transactions, compliance requirements and settlement procedures.',
  sourceName: 'Kayda Intelligence Test',
});

console.log('1. Regulatory article:');
console.log(`   Primary domain: ${regulatory.primaryDomain}`);
console.log(`   Secondary: ${regulatory.secondaryDomains.join(', ') || 'none'}`);
console.log(`   Geography: ${regulatory.geographyContext?.join(', ') || 'none'}`);

assert(
  ['Regulation', 'FX', 'Banking'].includes(regulatory.primaryDomain),
  `regulatory article should classify topically, got: ${regulatory.primaryDomain}`,
);
assert(
  !GEOGRAPHIC_DOMAINS.includes(regulatory.primaryDomain),
  'geography must never be the primary domain',
);
assert(
  regulatory.geographyContext?.includes('zambia') === true,
  'geography context should detect the country mention generically',
);
assert(regulatory.relevanceScore >= 40, 'relevance score unexpectedly low');
assert(regulatory.impactScore >= 40, 'impact score unexpectedly low');

// ---------------------------------------------------------
// 2. Brand-new unknown organisation, classified by topic
// ---------------------------------------------------------
const unknownOrg = classifyIntelligenceArticle({
  title: 'Nimbus Agriculture of Kenya announces copper export partnership',
  summary:
    'The company is expanding commodity operations and improving agricultural logistics.',
});

console.log('2. Unknown organisation article:');
console.log(`   Primary domain: ${unknownOrg.primaryDomain}`);
console.log(`   Geography: ${unknownOrg.geographyContext?.join(', ') || 'none'}`);

assert(
  unknownOrg.primaryDomain === 'Commodities',
  `unknown-org article should classify by topic (Commodities), got: ${unknownOrg.primaryDomain}`,
);
assert(
  unknownOrg.geographyContext?.includes('kenya') === true,
  'geography context should detect Kenya without any code change',
);

// ---------------------------------------------------------
// 3. Geography-only article: no topical content
// ---------------------------------------------------------
const geographyOnly = classifyIntelligenceArticle({
  title: 'Zambia holds a national address this week',
  summary: 'The annual address covers the upcoming year.',
});

console.log('3. Geography-only article:');
console.log(`   Primary domain: ${geographyOnly.primaryDomain}`);
console.log(`   Geography: ${geographyOnly.geographyContext?.join(', ') || 'none'}`);

assert(
  geographyOnly.primaryDomain === 'Other',
  `geography-only article must fall back to Other, got: ${geographyOnly.primaryDomain}`,
);
assert(
  geographyOnly.geographyContext?.includes('zambia') === true,
  'geography context should still record the country mention',
);

// ---------------------------------------------------------
// 4. Commodity vocabulary still classifies under Commodities
// ---------------------------------------------------------
const commodity = classifyIntelligenceArticle({
  title: 'Raw sugar exports face ICUMSA grading changes',
  summary: 'Exporters must adapt to the new commodity grading standards.',
});

console.log('4. Commodity article:');
console.log(`   Primary domain: ${commodity.primaryDomain}`);

assert(
  commodity.primaryDomain === 'Commodities',
  `sugar/ICUMSA vocabulary should classify under Commodities, got: ${commodity.primaryDomain}`,
);

// ---------------------------------------------------------
// 5. No country relevance boost (K-05 regression)
// ---------------------------------------------------------
const withoutCountry = classifyIntelligenceArticle({
  title: 'Central bank raises interest rate',
  summary: 'The monetary policy committee announced the change today.',
});

const withCountry = classifyIntelligenceArticle({
  title: 'Central bank of Zambia raises interest rate',
  summary: 'The monetary policy committee announced the change today.',
});

console.log('5. Country-boost regression:');
console.log(`   Relevance without country: ${withoutCountry.relevanceScore}`);
console.log(`   Relevance with country: ${withCountry.relevanceScore}`);

assert(
  withoutCountry.relevanceScore === withCountry.relevanceScore,
  'a country mention must not change the relevance score',
);

console.log('');
console.log('✓ Classifier smoke test passed (K-05 regressions included).');
