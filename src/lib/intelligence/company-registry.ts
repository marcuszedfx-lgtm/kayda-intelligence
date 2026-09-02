/**
 * =========================================================
 * KAYDA INTELLIGENCE V1.5
 * STEP 5B — COMPANY REGISTRY
 * =========================================================
 *
 * The Company Registry is the central definition of external
 * organisations/entities that Kayda may monitor.
 *
 * IMPORTANT ARCHITECTURE:
 *
 * Business
 *   = internal Kayda operating record
 *
 * Company
 *   = external intelligence entity
 *
 * Source
 *   = origin of intelligence
 *
 * Therefore:
 *
 * COMPANY
 *    ↓
 * COMPANY ↔ SOURCE
 *    ↓
 * INTELLIGENCE SIGNAL
 *    ↓
 * BUSINESS / DEAL / PROJECT / RISK
 *
 * The registry is intentionally kept separate from the UI.
 * Future versions can move this data into PostgreSQL without
 * redesigning the intelligence layer.
 * =========================================================
 */

import type {
  CompanyIntelligenceProfile,
  CompanyRole,
  CompanySourceRelationship,
  IntelligenceCompany,
} from '@/types/company-intelligence';

/**
 * =========================================================
 * REGISTERED COMPANIES
 * =========================================================
 *
 * These are initial intelligence entities.
 *
 * This is a foundation registry, not yet a complete database
 * of every organisation relevant to Kayda.
 * =========================================================
 */

export const intelligenceCompanyRegistry: IntelligenceCompany[] = [
  {
    id: 'company-zambia-sugar',
    name: 'Zambia Sugar',
    shortName: 'Zambia Sugar',
    description:
      'Major Zambian sugar producer and agricultural manufacturing company.',
    country: 'Zambia',
    city: 'Mazabuka',
    industry: 'Agriculture',
    sector: 'Sugar & Manufacturing',
    status: 'Monitoring',
    websiteUrl: 'https://zamsugar.co.zm/',
    importance: 'High',
    roles: [
      'Supplier',
      'Market Participant',
      'Potential Partner',
    ],
  },

  {
    id: 'company-zambia-revenue-authority',
    name: 'Zambia Revenue Authority',
    shortName: 'ZRA',
    description:
      'Zambian government authority responsible for tax and customs administration.',
    country: 'Zambia',
    city: 'Lusaka',
    industry: 'Government',
    sector: 'Tax & Customs Regulation',
    status: 'Monitoring',
    websiteUrl: 'https://www.zra.org.zm/',
    importance: 'Critical',
    roles: [
      'Regulator',
      'Government Entity',
    ],
  },
];

/**
 * =========================================================
 * COMPANY INTELLIGENCE PROFILES
 * =========================================================
 *
 * Monitoring configuration is deliberately separated from
 * company identity.
 * =========================================================
 */

export const companyIntelligenceProfiles: CompanyIntelligenceProfile[] = [
  {
    companyId: 'company-zambia-sugar',
    monitoringEnabled: true,
    relevanceScore: 95,
    riskLevel: 'Medium',

    domains: [
      'Sugar',
      'Commodities',
      'Agriculture',
      'Manufacturing',
      'Trade',
      'Zambia',
      'Business',
    ],

    keywords: [
      'Zambia Sugar',
      'sugar',
      'sugar production',
      'sugar exports',
      'sugar imports',
      'VHP sugar',
      'ICUMSA',
      'Mazabuka',
      'commodity',
      'agriculture',
    ],

    countries: [
      'Zambia',
      'South Africa',
      'Zimbabwe',
      'Mozambique',
      'Botswana',
      'Namibia',
      'Malawi',
    ],

    commodities: [
      'Sugar',
      'VHP Sugar',
      'Brown Sugar',
      'White Sugar',
    ],
  },

  {
    companyId: 'company-zambia-revenue-authority',
    monitoringEnabled: true,
    relevanceScore: 100,
    riskLevel: 'Critical',

    domains: [
      'Regulation',
      'Tax',
      'Customs',
      'Trade',
      'Imports',
      'Exports',
      'Compliance',
      'Zambia',
      'Business',
    ],

    keywords: [
      'ZRA',
      'Zambia Revenue Authority',
      'customs',
      'tax',
      'VAT',
      'imports',
      'exports',
      'duty',
      'clearance',
      'compliance',
      'tariff',
      'trade',
    ],

    countries: [
      'Zambia',
    ],

    commodities: [
      'Sugar',
      'Commodities',
      'General Trade',
    ],
  },
];

/**
 * =========================================================
 * COMPANY ↔ SOURCE RELATIONSHIPS
 * =========================================================
 *
 * A company can have multiple intelligence sources.
 *
 * A source can monitor multiple companies.
 *
 * This creates the foundation for a many-to-many model.
 * =========================================================
 */

export const companySourceRelationships: CompanySourceRelationship[] = [
  {
    id: 'company-source-zambia-sugar-official',
    companyId: 'company-zambia-sugar',
    sourceId: 'source-zambia-sugar',
    active: true,
    relevance:
      'Official company information, products, announcements and operating developments.',
    keywords: [
      'Zambia Sugar',
      'sugar',
      'products',
      'production',
      'agriculture',
    ],
  },

  {
    id: 'company-source-zra-regulatory',
    companyId: 'company-zambia-revenue-authority',
    sourceId: 'source-zambian-regulatory',
    active: true,
    relevance:
      'Primary regulatory intelligence covering tax, customs, imports, exports and compliance.',
    keywords: [
      'ZRA',
      'customs',
      'tax',
      'imports',
      'exports',
      'clearance',
      'compliance',
    ],
  },

  /**
   * ZRA information may also materially affect companies
   * involved in trade.
   *
   * This relationship deliberately demonstrates why a source
   * must not be owned exclusively by one company.
   */
  {
    id: 'company-source-zambia-sugar-zra',
    companyId: 'company-zambia-sugar',
    sourceId: 'source-zambian-regulatory',
    active: true,
    relevance:
      'Regulatory and customs developments that may affect sugar trade, imports, exports and compliance.',
    keywords: [
      'sugar',
      'imports',
      'exports',
      'customs',
      'trade',
      'duty',
    ],
  },
];

/**
 * =========================================================
 * REGISTRY HELPERS
 * =========================================================
 */

export function getRegisteredCompanies(): IntelligenceCompany[] {
  return intelligenceCompanyRegistry.filter(
    (company) =>
      company.status !== 'Archived' &&
      company.status !== 'Inactive',
  );
}

export function getRegisteredCompanyById(
  companyId: string,
): IntelligenceCompany | undefined {
  return intelligenceCompanyRegistry.find(
    (company) => company.id === companyId,
  );
}

export function searchRegisteredCompanies(
  query: string,
): IntelligenceCompany[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getRegisteredCompanies();
  }

  return getRegisteredCompanies().filter((company) => {
    const searchableText = [
      company.id,
      company.name,
      company.legalName,
      company.shortName,
      company.description,
      company.country,
      company.city,
      company.industry,
      company.sector,
      company.status,
      company.importance,
      ...company.roles,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function getCompanyIntelligenceProfile(
  companyId: string,
): CompanyIntelligenceProfile | undefined {
  return companyIntelligenceProfiles.find(
    (profile) => profile.companyId === companyId,
  );
}

export function getCompanySourceRelationships(
  companyId: string,
): CompanySourceRelationship[] {
  return companySourceRelationships.filter(
    (relationship) =>
      relationship.companyId === companyId &&
      relationship.active,
  );
}

export function getCompaniesForSource(
  sourceId: string,
): IntelligenceCompany[] {
  const companyIds = new Set(
    companySourceRelationships
      .filter(
        (relationship) =>
          relationship.sourceId === sourceId &&
          relationship.active,
      )
      .map((relationship) => relationship.companyId),
  );

  return getRegisteredCompanies().filter((company) =>
    companyIds.has(company.id),
  );
}

export function getCompaniesByDomain(
  domain: string,
): IntelligenceCompany[] {
  const normalizedDomain = domain.trim().toLowerCase();

  if (!normalizedDomain) {
    return getRegisteredCompanies();
  }

  const matchingCompanyIds = new Set(
    companyIntelligenceProfiles
      .filter((profile) =>
        profile.domains.some(
          (item) =>
            item.toLowerCase() === normalizedDomain,
        ),
      )
      .map((profile) => profile.companyId),
  );

  return getRegisteredCompanies().filter((company) =>
    matchingCompanyIds.has(company.id),
  );
}

export function getCompaniesByRole(
  role: CompanyRole,
): IntelligenceCompany[] {
  return getRegisteredCompanies().filter((company) =>
    company.roles.includes(role),
  );
}

export function getMonitoredCompanies(): IntelligenceCompany[] {
  return getRegisteredCompanies().filter((company) => {
    const profile = getCompanyIntelligenceProfile(company.id);

    return profile?.monitoringEnabled === true;
  });
}
