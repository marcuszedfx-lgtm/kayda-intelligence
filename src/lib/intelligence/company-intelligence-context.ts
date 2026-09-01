import {
  getCompanyIntelligenceProfile,
  getCompanySourceRelationships,
  getRegisteredCompanyById,
} from './company-registry';
import type {
  CompanyIntelligenceProfile,
  CompanySourceRelationship,
  IntelligenceCompany,
} from '../../types/company-intelligence';

export interface CompanyIntelligenceContext {
  company: IntelligenceCompany;
  profile: CompanyIntelligenceProfile;
  relationships: CompanySourceRelationship[];
  sourceIds: string[];
}

export function getCompanyIntelligenceContext(
  companyId: string,
): CompanyIntelligenceContext | undefined {
  const company = getRegisteredCompanyById(companyId);
  const profile = getCompanyIntelligenceProfile(companyId);

  if (!company || !profile) {
    return undefined;
  }

  const relationships = getCompanySourceRelationships(companyId);

  return {
    company,
    profile,
    relationships,
    sourceIds: relationships
      .filter((relationship: CompanySourceRelationship) => relationship.active)
      .map((relationship: CompanySourceRelationship) => relationship.sourceId),
  };
}

export function getCompanyContextForSource(
  sourceId: string,
): CompanyIntelligenceContext[] {
  const companyIds = [
    'company-zambia-sugar',
    'company-zambia-revenue-authority',
  ];

  const contexts: CompanyIntelligenceContext[] = [];

  for (const companyId of companyIds) {
    const context = getCompanyIntelligenceContext(companyId);

    if (context && context.sourceIds.includes(sourceId)) {
      contexts.push(context);
    }
  }

  return contexts;
}

export function getCompanyProfileKeywords(
  profile: CompanyIntelligenceProfile,
): string[] {
  return Array.from(
    new Set(
      profile.keywords
        .map((keyword: string) => keyword.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getCompanyProfileDomains(
  profile: CompanyIntelligenceProfile,
): string[] {
  return Array.from(
    new Set(
      profile.domains
        .map((domain: string) => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}
