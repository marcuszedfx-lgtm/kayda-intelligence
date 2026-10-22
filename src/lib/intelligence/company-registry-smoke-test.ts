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
import { EMPTY_REGISTRY } from './registry-store';
import { fixtureRegistry } from '@/test/fixtures/registry-fixtures';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('');
console.log('==================================================');
console.log(' COMPANY REGISTRY TEST (isolated fixture)');
console.log('==================================================');
console.log('');

// ---------------------------------------------------------
// 1. Empty registry is an honest empty state
// ---------------------------------------------------------
assert(
  getRegisteredCompanies(EMPTY_REGISTRY).length === 0,
  'empty registry must yield zero companies',
);
assert(
  getMonitoredCompanies(EMPTY_REGISTRY).length === 0,
  'empty registry must yield zero monitored companies',
);
console.log('EMPTY REGISTRY STATUS: honest empty state');

// ---------------------------------------------------------
// 2. Companies from fixture (archived excluded)
// ---------------------------------------------------------
const companies = getRegisteredCompanies(fixtureRegistry);
console.log(`REGISTERED COMPANIES: ${companies.length}`);
assert(companies.length === 2, 'expected 2 non-archived companies');
assert(
  companies.every(
    (company) => company.status !== 'Archived',
  ),
  'archived companies must be excluded',
);

// ---------------------------------------------------------
// 3. Lookup
// ---------------------------------------------------------
const authority = getRegisteredCompanyById(
  'company-fixture-authority',
  fixtureRegistry,
);
assert(Boolean(authority), 'fixture authority lookup failed');
console.log('LOOKUP STATUS: success');

// ---------------------------------------------------------
// 4. Search
// ---------------------------------------------------------
const manufacturingSearch = searchRegisteredCompanies(
  'manufacturing',
  fixtureRegistry,
);
assert(
  manufacturingSearch.length > 0,
  'company search returned no matches',
);
console.log('SEARCH STATUS: success');

// ---------------------------------------------------------
// 5. Intelligence profile
// ---------------------------------------------------------
const manufacturerProfile = getCompanyIntelligenceProfile(
  'company-fixture-manufacturer',
  fixtureRegistry,
);
assert(
  Boolean(manufacturerProfile),
  'intelligence profile lookup failed',
);
assert(
  manufacturerProfile?.monitoringEnabled === true,
  'fixture manufacturer monitoring should be enabled',
);
console.log('PROFILE STATUS: success');

// ---------------------------------------------------------
// 6. Company -> Source
// ---------------------------------------------------------
const manufacturerSources = getCompanySourceRelationships(
  'company-fixture-manufacturer',
  fixtureRegistry,
);
assert(
  manufacturerSources.length >= 2,
  'expected the manufacturer to have at least 2 sources',
);
console.log('COMPANY -> SOURCE STATUS: success');

// ---------------------------------------------------------
// 7. Source -> Company
// ---------------------------------------------------------
const regulatorCompanies = getCompaniesForSource(
  'source-fixture-regulator',
  fixtureRegistry,
);
assert(
  regulatorCompanies.length >= 2,
  'expected the regulator source to inform multiple companies',
);
console.log('SOURCE -> COMPANY STATUS: success');

// ---------------------------------------------------------
// 8. Domain filter
// ---------------------------------------------------------
const tradeCompanies = getCompaniesByDomain(
  'Trade',
  fixtureRegistry,
);
assert(
  tradeCompanies.length > 0,
  'domain filtering failed for Trade',
);
console.log('DOMAIN FILTER STATUS: success');

// ---------------------------------------------------------
// 9. Role filter
// ---------------------------------------------------------
const suppliers = getCompaniesByRole(
  'Supplier',
  fixtureRegistry,
);
assert(
  suppliers.some(
    (company) =>
      company.id === 'company-fixture-manufacturer',
  ),
  'role filtering failed for Supplier',
);
console.log('ROLE FILTER STATUS: success');

// ---------------------------------------------------------
// 10. Monitored companies
// ---------------------------------------------------------
const monitored = getMonitoredCompanies(fixtureRegistry);
assert(
  monitored.length === 2,
  'expected exactly 2 monitored fixture companies',
);
console.log('MONITORING STATUS: success');

console.log('');
console.log('==================================================');
console.log(' COMPANY REGISTRY TEST PASSED');
console.log('==================================================');
console.log('');
