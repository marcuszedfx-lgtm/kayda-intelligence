/**
 * =========================================================
 * KAYDA INTELLIGENCE V1.5
 * STEP 5B.3 — COMPANY REGISTRY SMOKE TEST
 * =========================================================
 */

import {
  getCompaniesByDomain,
  getCompaniesByRole,
  getCompaniesForSource,
  getCompanyIntelligenceProfile,
  getCompanySourceRelationships,
  getMonitoredCompanies,
  getRegisteredCompanies,
  getRegisteredCompanyById,
  searchRegisteredCompanies,
} from './company-registry';

console.log('==================================================');
console.log(' KAYDA INTELLIGENCE V1.5 — COMPANY REGISTRY TEST');
console.log('==================================================');
console.log('');

const companies = getRegisteredCompanies();

console.log(`REGISTERED COMPANIES: ${companies.length}`);
console.log('');

for (const company of companies) {
  console.log(`COMPANY: ${company.name}`);
  console.log(`ID: ${company.id}`);
  console.log(`INDUSTRY: ${company.industry}`);
  console.log(`COUNTRY: ${company.country}`);
  console.log(`STATUS: ${company.status}`);
  console.log(`IMPORTANCE: ${company.importance}`);
  console.log(`ROLES: ${company.roles.join(', ')}`);
  console.log(`WEBSITE: ${company.websiteUrl}`);
  console.log('--------------------------------------------------');
}

console.log('');
console.log('=== COMPANY LOOKUP TEST ===');

const zra = getRegisteredCompanyById(
  'company-zambia-revenue-authority',
);

if (!zra) {
  throw new Error('Company lookup failed for ZRA');
}

console.log(`LOOKUP: ${zra.name}`);
console.log('LOOKUP STATUS: success');

console.log('');
console.log('=== COMPANY SEARCH TEST ===');

const sugarSearch = searchRegisteredCompanies('sugar');

console.log(
  `SEARCH: sugar`,
);

console.log(
  `MATCHES: ${sugarSearch.map((company) => company.name).join(', ')}`,
);

if (
  !sugarSearch.some(
    (company) => company.id === 'company-zambia-sugar',
  )
) {
  throw new Error('Company search failed for Zambia Sugar');
}

console.log('SEARCH STATUS: success');

console.log('');
console.log('=== INTELLIGENCE PROFILE TEST ===');

const sugarProfile = getCompanyIntelligenceProfile(
  'company-zambia-sugar',
);

if (!sugarProfile) {
  throw new Error(
    'Intelligence profile lookup failed for Zambia Sugar',
  );
}

console.log(
  `PROFILE COMPANY: ${sugarProfile.companyId}`,
);

console.log(
  `MONITORING ENABLED: ${sugarProfile.monitoringEnabled}`,
);

console.log(
  `RELEVANCE SCORE: ${sugarProfile.relevanceScore}`,
);

console.log(
  `DOMAINS: ${sugarProfile.domains.join(', ')}`,
);

console.log(
  `KEYWORDS: ${sugarProfile.keywords.length}`,
);

console.log(
  `COMMODITIES: ${sugarProfile.commodities.join(', ')}`,
);

console.log('PROFILE STATUS: success');

console.log('');
console.log('=== COMPANY → SOURCE TEST ===');

const sugarSources = getCompanySourceRelationships(
  'company-zambia-sugar',
);

console.log(
  `ZAMBIA SUGAR SOURCE COUNT: ${sugarSources.length}`,
);

for (const relationship of sugarSources) {
  console.log(
    `${relationship.companyId} -> ${relationship.sourceId}`,
  );
}

if (sugarSources.length < 2) {
  throw new Error(
    'Expected Zambia Sugar to have at least 2 intelligence sources',
  );
}

console.log('COMPANY → SOURCE STATUS: success');

console.log('');
console.log('=== SOURCE → COMPANY TEST ===');

const zraCompanies = getCompaniesForSource(
  'source-zambian-regulatory',
);

console.log(
  `ZRA SOURCE COMPANY COUNT: ${zraCompanies.length}`,
);

console.log(
  `COMPANIES: ${zraCompanies.map((company) => company.name).join(', ')}`,
);

if (zraCompanies.length < 2) {
  throw new Error(
    'Expected ZRA regulatory source to serve multiple companies',
  );
}

console.log('SOURCE → COMPANY STATUS: success');

console.log('');
console.log('=== DOMAIN FILTER TEST ===');

const tradeCompanies = getCompaniesByDomain('Trade');

console.log(
  `DOMAIN: Trade`,
);

console.log(
  `MATCHES: ${tradeCompanies.map((company) => company.name).join(', ')}`,
);

if (tradeCompanies.length === 0) {
  throw new Error(
    'Domain filtering failed for Trade',
  );
}

console.log('DOMAIN FILTER STATUS: success');

console.log('');
console.log('=== ROLE FILTER TEST ===');

const suppliers = getCompaniesByRole('Supplier');

console.log(
  `ROLE: Supplier`,
);

console.log(
  `MATCHES: ${suppliers.map((company) => company.name).join(', ')}`,
);

if (
  !suppliers.some(
    (company) => company.id === 'company-zambia-sugar',
  )
) {
  throw new Error(
    'Role filtering failed for Supplier',
  );
}

console.log('ROLE FILTER STATUS: success');

console.log('');
console.log('=== MONITORED COMPANY TEST ===');

const monitoredCompanies = getMonitoredCompanies();

console.log(
  `MONITORED COMPANIES: ${monitoredCompanies.length}`,
);

console.log(
  `COMPANIES: ${monitoredCompanies
    .map((company) => company.name)
    .join(', ')}`,
);

if (monitoredCompanies.length === 0) {
  throw new Error(
    'No monitored companies returned',
  );
}

console.log('MONITORING STATUS: success');

console.log('');
console.log('==================================================');
console.log(' COMPANY REGISTRY TEST PASSED');
console.log('==================================================');
