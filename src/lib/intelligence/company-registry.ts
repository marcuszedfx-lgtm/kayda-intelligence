import type {
  CompanyIntelligenceProfile,
  CompanyRole,
  CompanySourceRelationship,
  IntelligenceCompany,
} from '@/types/company-intelligence';

import {
  loadRegistry,
  type KaydaRegistry,
} from './registry-store';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — COMPANY REGISTRY (FACADE)
 * =========================================================
 *
 * The registry of monitored companies (with their
 * intelligence profiles and company↔source relationships)
 * is USER-OWNED RUNTIME CONFIGURATION loaded from
 * data/kayda-registry.json (see registry-store.ts).
 *
 * This module embeds no company definitions. Kayda starts
 * with zero monitored companies; a new organisation is
 * added through the registry file (or the future
 * database-backed equivalent) — never through a code change.
 *
 * Architecture:
 *
 * Business   = internal Kayda operating record
 * Company    = external intelligence entity
 * Source     = origin of intelligence
 *
 * COMPANY ↔ SOURCE → INTELLIGENCE SIGNAL → BUSINESS/DEAL/RISK
 * =========================================================
 */

export function getRegisteredCompanies(
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  return registry.companies.filter(
    (company) =>
      company.status !== 'Archived' &&
      company.status !== 'Inactive',
  );
}

export function getRegisteredCompanyById(
  companyId: string,
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany | undefined {
  return registry.companies.find(
    (company) => company.id === companyId,
  );
}

export function searchRegisteredCompanies(
  query: string,
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getRegisteredCompanies(registry);
  }

  return getRegisteredCompanies(registry).filter((company) => {
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
  registry: KaydaRegistry = loadRegistry().registry,
): CompanyIntelligenceProfile | undefined {
  return registry.companyProfiles.find(
    (profile) => profile.companyId === companyId,
  );
}

export function getCompanySourceRelationships(
  companyId: string,
  registry: KaydaRegistry = loadRegistry().registry,
): CompanySourceRelationship[] {
  return registry.companySourceRelationships.filter(
    (relationship) =>
      relationship.companyId === companyId &&
      relationship.active,
  );
}

export function getCompaniesForSource(
  sourceId: string,
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  const companyIds = new Set(
    registry.companySourceRelationships
      .filter(
        (relationship) =>
          relationship.sourceId === sourceId &&
          relationship.active,
      )
      .map((relationship) => relationship.companyId),
  );

  return getRegisteredCompanies(registry).filter((company) =>
    companyIds.has(company.id),
  );
}

export function getCompaniesByDomain(
  domain: string,
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  const normalizedDomain = domain.trim().toLowerCase();

  if (!normalizedDomain) {
    return getRegisteredCompanies(registry);
  }

  const matchingCompanyIds = new Set(
    registry.companyProfiles
      .filter((profile) =>
        profile.domains.some(
          (item) =>
            item.toLowerCase() === normalizedDomain,
        ),
      )
      .map((profile) => profile.companyId),
  );

  return getRegisteredCompanies(registry).filter((company) =>
    matchingCompanyIds.has(company.id),
  );
}

export function getCompaniesByRole(
  role: CompanyRole,
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  return getRegisteredCompanies(registry).filter((company) =>
    company.roles.includes(role),
  );
}

export function getMonitoredCompanies(
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceCompany[] {
  return getRegisteredCompanies(registry).filter((company) => {
    const profile = getCompanyIntelligenceProfile(
      company.id,
      registry,
    );

    return profile?.monitoringEnabled === true;
  });
}
