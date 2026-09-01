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

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('==================================================');
console.log(' KAYDA INTELLIGENCE V1.5');
console.log(' STEP 5B.4 — COMPANY-AWARE INTELLIGENCE TEST');
console.log('==================================================');
console.log('');

console.log('=== COMPANY CONTEXT TEST ===');

const sugarContext = getCompanyIntelligenceContext(
  'company-zambia-sugar',
);

assert(Boolean(sugarContext), 'Zambia Sugar context missing');

if (sugarContext) {
  console.log(`COMPANY: ${sugarContext.company.name}`);
  console.log(`SOURCE COUNT: ${sugarContext.sourceIds.length}`);
  console.log(`RELEVANCE: ${sugarContext.profile.relevanceScore}`);
  console.log(`RISK: ${sugarContext.profile.riskLevel}`);
  console.log(
    `KEYWORDS: ${getCompanyProfileKeywords(sugarContext.profile).length}`,
  );
  console.log(
    `DOMAINS: ${getCompanyProfileDomains(sugarContext.profile).length}`,
  );

  assert(
    sugarContext.sourceIds.length >= 2,
    'Zambia Sugar should have at least two sources',
  );

  assert(
    sugarContext.profile.monitoringEnabled,
    'Zambia Sugar monitoring should be enabled',
  );
}

console.log('COMPANY CONTEXT STATUS: success');
console.log('');

console.log('=== SOURCE CONTEXT TEST ===');

const zraSourceContexts = getCompanyContextForSource(
  'source-zambian-regulatory',
);

console.log(
  `ZRA SOURCE COMPANY COUNT: ${zraSourceContexts.length}`,
);

console.log(
  `COMPANIES: ${zraSourceContexts
    .map((context) => context.company.name)
    .join(', ')}`,
);

assert(
  zraSourceContexts.length >= 2,
  'ZRA source should be linked to at least two companies',
);

console.log('SOURCE CONTEXT STATUS: success');
console.log('');

console.log('=== COMPANY RELEVANCE TEST ===');

const relevance = evaluateCompanyRelevance({
  companyId: 'company-zambia-sugar',
  sourceId: 'source-zambia-sugar',
  title: 'Zambia Sugar announces new sugar production initiative',
  summary:
    'The company is expanding sugar production and improving agricultural efficiency in Zambia.',
});

console.log(`COMPANY: ${relevance.companyName}`);
console.log(`MATCHED: ${relevance.matched}`);
console.log(`SCORE: ${relevance.score}`);
console.log(`CONFIDENCE: ${relevance.confidence}`);
console.log(
  `KEYWORD MATCHES: ${relevance.matchedKeywords.join(', ') || 'none'}`,
);
console.log(
  `DOMAIN MATCHES: ${relevance.matchedDomains.join(', ') || 'none'}`,
);
console.log(`REASON: ${relevance.reason}`);

assert(relevance.matched, 'Relevant Zambia Sugar article was not matched');
assert(relevance.score > 0, 'Relevance score should be greater than zero');

console.log('COMPANY RELEVANCE STATUS: success');
console.log('');

console.log('=== REGULATORY RELEVANCE TEST ===');

const regulatoryRelevance = evaluateCompanyRelevance({
  companyId: 'company-zambia-revenue-authority',
  sourceId: 'source-zambian-regulatory',
  title: 'ZRA announces new customs and import clearance requirements',
  summary:
    'The change affects customs, imports, exports, duty and compliance.',
});

console.log(`COMPANY: ${regulatoryRelevance.companyName}`);
console.log(`MATCHED: ${regulatoryRelevance.matched}`);
console.log(`SCORE: ${regulatoryRelevance.score}`);
console.log(
  `KEYWORD MATCHES: ${
    regulatoryRelevance.matchedKeywords.join(', ') || 'none'
  }`,
);
console.log(
  `DOMAIN MATCHES: ${
    regulatoryRelevance.matchedDomains.join(', ') || 'none'
  }`,
);

assert(
  regulatoryRelevance.matched,
  'Relevant ZRA regulatory article was not matched',
);

assert(
  regulatoryRelevance.score > 0,
  'ZRA relevance score should be greater than zero',
);

console.log('REGULATORY RELEVANCE STATUS: success');
console.log('');

console.log('=== CROSS-COMPANY EVALUATION TEST ===');

const results = evaluateAllRegisteredCompanies({
  sourceId: 'source-zambian-regulatory',
  title: 'ZRA customs changes may affect sugar imports and exports',
  summary:
    'New customs, tax and trade compliance requirements have been announced in Zambia.',
});

console.log(
  `MATCHED COMPANIES: ${results
    .map((result) => result.companyName)
    .join(', ') || 'none'}`,
);

assert(
  results.length >= 1,
  'Expected at least one company to match regulatory intelligence',
);

console.log('CROSS-COMPANY STATUS: success');
console.log('');

console.log('==================================================');
console.log(' COMPANY-AWARE INTELLIGENCE TEST PASSED');
console.log('==================================================');
