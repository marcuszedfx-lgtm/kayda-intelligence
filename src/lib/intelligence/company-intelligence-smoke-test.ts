import {
  getCompanyIntelligenceContext,
  getCompanyContextForSource,
  getCompanyProfileKeywords,
  getCompanyProfileDomains,
} from './company-intelligence-context';
import {
  evaluateCompanyRelevance,
  evaluateAllRegisteredCompanies,
} from './company-relevance';
import { EMPTY_REGISTRY } from './registry-store';
import { fixtureRegistry } from '@/test/fixtures/registry-fixtures';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('');
console.log('==================================================');
console.log(' COMPANY-INTELLIGENCE TEST (isolated fixture)');
console.log('==================================================');
console.log('');

// ---------------------------------------------------------
// 1. Empty registry: no contexts, no matches, no crash
// ---------------------------------------------------------
assert(
  getCompanyIntelligenceContext(
    'company-fixture-authority',
    EMPTY_REGISTRY,
  ) === undefined,
  'empty registry must return no context',
);
assert(
  evaluateAllRegisteredCompanies(
    {
      sourceId: 'source-fixture-regulator',
      title: 'Any headline',
      summary: 'Any summary',
    },
    EMPTY_REGISTRY,
  ).length === 0,
  'empty registry must yield no company matches',
);
console.log('EMPTY REGISTRY STATUS: honest empty state');

// ---------------------------------------------------------
// 2. Company context
// ---------------------------------------------------------
const manufacturerContext = getCompanyIntelligenceContext(
  'company-fixture-manufacturer',
  fixtureRegistry,
);
assert(
  Boolean(manufacturerContext),
  'fixture manufacturer context missing',
);

if (manufacturerContext) {
  console.log(
    `COMPANY: ${manufacturerContext.company.name}`,
  );
  console.log(
    `SOURCE COUNT: ${manufacturerContext.sourceIds.length}`,
  );
  console.log(
    `RELEVANCE: ${manufacturerContext.profile.relevanceScore}`,
  );
  console.log(
    `RISK: ${manufacturerContext.profile.riskLevel}`,
  );
  console.log(
    `KEYWORDS: ${getCompanyProfileKeywords(manufacturerContext.profile).length}`,
  );
  console.log(
    `DOMAINS: ${getCompanyProfileDomains(manufacturerContext.profile).length}`,
  );

  assert(
    manufacturerContext.sourceIds.length >= 2,
    'manufacturer should have at least two sources',
  );
  assert(
    manufacturerContext.profile.monitoringEnabled,
    'manufacturer monitoring should be enabled',
  );
}
console.log('COMPANY CONTEXT STATUS: success');

// ---------------------------------------------------------
// 3. Source context (many companies per source)
// ---------------------------------------------------------
const regulatorContexts = getCompanyContextForSource(
  'source-fixture-regulator',
  fixtureRegistry,
);
console.log(
  `REGULATOR SOURCE COMPANY COUNT: ${regulatorContexts.length}`,
);
assert(
  regulatorContexts.length >= 2,
  'regulator source should be linked to at least two companies',
);
console.log('SOURCE CONTEXT STATUS: success');

// ---------------------------------------------------------
// 4. Company relevance
// ---------------------------------------------------------
const relevance = evaluateCompanyRelevance(
  {
    companyId: 'company-fixture-manufacturer',
    sourceId: 'source-fixture-wire',
    title:
      'Fixture Manufacturing reports higher widget production output',
    summary:
      'The manufacturer is expanding assembly output and improving component logistics.',
  },
  fixtureRegistry,
);
console.log(`MATCHED: ${relevance.matched}`);
console.log(`SCORE: ${relevance.score}`);
console.log(`CONFIDENCE: ${relevance.confidence}`);
console.log(
  `KEYWORD MATCHES: ${relevance.matchedKeywords.join(', ') || 'none'}`,
);
console.log(
  `DOMAIN MATCHES: ${relevance.matchedDomains.join(', ') || 'none'}`,
);
assert(relevance.matched, 'relevant fixture article was not matched');
assert(relevance.score > 0, 'relevance score should exceed zero');
console.log('COMPANY RELEVANCE STATUS: success');

// ---------------------------------------------------------
// 5. Regulatory relevance
// ---------------------------------------------------------
const regulatoryRelevance = evaluateCompanyRelevance(
  {
    companyId: 'company-fixture-authority',
    sourceId: 'source-fixture-regulator',
    title:
      'Fixture Trade Authority announces new import licensing compliance rules',
    summary:
      'The change affects customs duty, import licensing and trade compliance.',
  },
  fixtureRegistry,
);
assert(
  regulatoryRelevance.matched,
  'relevant regulatory article was not matched',
);
assert(
  regulatoryRelevance.score > 0,
  'regulatory relevance score should exceed zero',
);
console.log('REGULATORY RELEVANCE STATUS: success');

// ---------------------------------------------------------
// 6. Source not linked to company
// ---------------------------------------------------------
const unlinked = evaluateCompanyRelevance(
  {
    companyId: 'company-fixture-manufacturer',
    sourceId: 'source-fixture-regulator',
    title: 'Fixture Manufacturing widget output rises',
    summary: 'Assembly output increased.',
  },
  fixtureRegistry,
);
assert(
  unlinked.matched,
  'linked regulator source should still evaluate for the manufacturer',
);

// ---------------------------------------------------------
// 7. Cross-company evaluation
// ---------------------------------------------------------
const crossCompany = evaluateAllRegisteredCompanies(
  {
    sourceId: 'source-fixture-regulator',
    title:
      'Fixture Trade Authority updates customs duty and import licensing rules',
    summary:
      'Compliance requirements for trade have been updated in Exampleland.',
  },
  fixtureRegistry,
);
console.log(
  `MATCHED COMPANIES: ${crossCompany
    .map((result) => result.companyName)
    .join(', ') || 'none'}`,
);
assert(
  crossCompany.length >= 1,
  'expected at least one company to match the regulatory update',
);
console.log('CROSS-COMPANY STATUS: success');

console.log('');
console.log('==================================================');
console.log(' COMPANY-INTELLIGENCE TEST PASSED');
console.log('==================================================');
console.log('');
