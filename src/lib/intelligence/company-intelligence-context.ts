import {
  getCompanyIntelligenceProfile,
  getCompanySourceRelationships,
  getRegisteredCompanies,
  getRegisteredCompanyById,
} from './company-registry';
import type {
  CompanyIntelligenceProfile,
  CompanySourceRelationship,
  IntelligenceCompany,
} from '../../types/company-intelligence';
import type { KaydaRegistry } from './registry-store';

export interface CompanyIntelligenceContext {
  company: IntelligenceCompany;
  profile: CompanyIntelligenceProfile;
  relationships: CompanySourceRelationship[];
  sourceIds: string[];
}

export function getCompanyIntelligenceContext(
  companyId: string,
  registry?: KaydaRegistry,
): CompanyIntelligenceContext | undefined {
  const company = getRegisteredCompanyById(
    companyId,
    registry,
  );
  const profile = getCompanyIntelligenceProfile(
    companyId,
    registry,
  );

  if (!company || !profile) {
    return undefined;
  }

  const relationships = getCompanySourceRelationships(
    companyId,
    registry,
  );

  return {
    company,
    profile,
    relationships,
    sourceIds: relationships
      .filter(
        (relationship: CompanySourceRelationship) =>
          relationship.active,
      )
      .map(
        (relationship: CompanySourceRelationship) =>
          relationship.sourceId,
      ),
  };
}

export function getCompanyContextForSource(
  sourceId: string,
  registry?: KaydaRegistry,
): CompanyIntelligenceContext[] {
  const contexts: CompanyIntelligenceContext[] = [];

  for (const company of getRegisteredCompanies(registry)) {
    const context = getCompanyIntelligenceContext(
      company.id,
      registry,
    );

    if (
      context &&
      context.sourceIds.includes(sourceId)
    ) {
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
