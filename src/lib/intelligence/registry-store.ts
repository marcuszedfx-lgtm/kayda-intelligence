import fs from 'node:fs';
import path from 'node:path';

import type {
  CompanyIntelligenceProfile,
  CompanySourceRelationship,
  IntelligenceCompany,
} from '@/types/company-intelligence';
import type {
  RegisteredIntelligenceSource,
} from './source-registry';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — RUNTIME REGISTRY STORE
 * =========================================================
 *
 * The runtime registries (intelligence sources and monitored
 * companies) are USER-OWNED CONFIGURATION, not source code.
 *
 * - The registry lives in data/kayda-registry.json, which is
 *   gitignored: business configuration never enters git.
 * - config/intelligence-registry.example.json documents the
 *   shape with generic placeholders. It is never loaded.
 * - A missing registry is a valid, honest empty state: no
 *   sources and no companies are monitored until the user
 *   adds them.
 * - Invalid registry content is reported with precise errors
 *   and offending records are excluded — never silently
 *   coerced, never replaced with built-in examples.
 *
 * Adding a new organisation or source requires editing the
 * registry file (or the future database-backed equivalent).
 * It never requires a code change or redeployment.
 * =========================================================
 */

export interface KaydaRegistry {
  sources: RegisteredIntelligenceSource[];
  companies: IntelligenceCompany[];
  companyProfiles: CompanyIntelligenceProfile[];
  companySourceRelationships: CompanySourceRelationship[];
}

export interface RegistryLoadResult {
  registry: KaydaRegistry;
  errors: string[];
  filePath: string;
  exists: boolean;
}

export const EMPTY_REGISTRY: KaydaRegistry = {
  sources: [],
  companies: [],
  companyProfiles: [],
  companySourceRelationships: [],
};

export function getRegistryFilePath(): string {
  return path.join(
    process.cwd(),
    'data',
    'kayda-registry.json',
  );
}

/**
 * The registry location as it is reported to a client: relative
 * to the project root, with forward slashes.
 *
 * The absolute path is only ever used to open the file. An API
 * response never carries it, because it would publish the
 * operator's home directory and the layout of the machine.
 */
export function getRegistryDisplayPath(): string {
  const relative = path.relative(process.cwd(), getRegistryFilePath());

  return relative.split(path.sep).join('/') || 'data/kayda-registry.json';
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  label: string,
  errors: string[],
): string | undefined {
  const value = record[field];

  if (typeof value !== 'string' || !value.trim()) {
    errors.push(
      `${label}: field "${field}" must be a non-empty string.`,
    );
    return undefined;
  }

  return value.trim();
}

function requireStringArray(
  record: Record<string, unknown>,
  field: string,
  label: string,
  errors: string[],
): string[] | undefined {
  const value = record[field];

  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string')
  ) {
    errors.push(
      `${label}: field "${field}" must be an array of strings.`,
    );
    return undefined;
  }

  return value as string[];
}

function validateSource(
  value: unknown,
  index: number,
  errors: string[],
): RegisteredIntelligenceSource | undefined {
  const label = `sources[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${label}: must be an object.`);
    return undefined;
  }

  const id = requireString(value, 'id', label, errors);
  const name = requireString(value, 'name', label, errors);
  const sourceType = requireString(
    value,
    'sourceType',
    label,
    errors,
  );
  const publisher = requireString(
    value,
    'publisher',
    label,
    errors,
  );
  const websiteUrl = requireString(
    value,
    'websiteUrl',
    label,
    errors,
  );
  const feedType = requireString(
    value,
    'feedType',
    label,
    errors,
  );

  if (
    feedType &&
    !['RSS', 'Atom', 'API', 'Manual'].includes(feedType)
  ) {
    errors.push(
      `${label}: feedType must be one of RSS, Atom, API, Manual.`,
    );
  }

  const credibility =
    typeof value.credibility === 'number'
      ? value.credibility
      : 50;

  const active =
    typeof value.active === 'boolean' ? value.active : true;

  const tags = requireStringArray(value, 'tags', label, errors) ?? [];
  const domains =
    requireStringArray(value, 'domains', label, errors) ?? [];

  if (
    !id ||
    !name ||
    !sourceType ||
    !publisher ||
    !websiteUrl ||
    !feedType ||
    !['RSS', 'Atom', 'API', 'Manual'].includes(feedType)
  ) {
    return undefined;
  }

  const feedUrl =
    typeof value.feedUrl === 'string' && value.feedUrl.trim()
      ? value.feedUrl.trim()
      : undefined;

  return {
    id,
    name,
    sourceType: sourceType as RegisteredIntelligenceSource['sourceType'],
    publisher,
    credibility,
    active,
    websiteUrl,
    ...(feedUrl ? { feedUrl } : {}),
    feedType: feedType as RegisteredIntelligenceSource['feedType'],
    tags,
    domains,
  };
}

const COMPANY_STATUSES = [
  'Active',
  'Monitoring',
  'Inactive',
  'Archived',
];

const COMPANY_IMPORTANCE = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

function validateCompany(
  value: unknown,
  index: number,
  errors: string[],
): IntelligenceCompany | undefined {
  const label = `companies[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${label}: must be an object.`);
    return undefined;
  }

  const id = requireString(value, 'id', label, errors);
  const name = requireString(value, 'name', label, errors);
  const country = requireString(value, 'country', label, errors);
  const industry = requireString(
    value,
    'industry',
    label,
    errors,
  );
  const status = requireString(value, 'status', label, errors);
  const importance = requireString(
    value,
    'importance',
    label,
    errors,
  );
  const roles = requireStringArray(value, 'roles', label, errors);

  if (status && !COMPANY_STATUSES.includes(status)) {
    errors.push(
      `${label}: status must be one of ${COMPANY_STATUSES.join(', ')}.`,
    );
  }

  if (importance && !COMPANY_IMPORTANCE.includes(importance)) {
    errors.push(
      `${label}: importance must be one of ${COMPANY_IMPORTANCE.join(', ')}.`,
    );
  }

  if (
    !id ||
    !name ||
    !country ||
    !industry ||
    !status ||
    !importance ||
    !roles ||
    !COMPANY_STATUSES.includes(status) ||
    !COMPANY_IMPORTANCE.includes(importance)
  ) {
    return undefined;
  }

  const description =
    typeof value.description === 'string'
      ? value.description
      : undefined;
  const city =
    typeof value.city === 'string' ? value.city : undefined;
  const sector =
    typeof value.sector === 'string' ? value.sector : undefined;
  const websiteUrl =
    typeof value.websiteUrl === 'string'
      ? value.websiteUrl
      : undefined;
  const legalName =
    typeof value.legalName === 'string'
      ? value.legalName
      : undefined;
  const shortName =
    typeof value.shortName === 'string'
      ? value.shortName
      : undefined;

  return {
    id,
    name,
    ...(legalName ? { legalName } : {}),
    ...(shortName ? { shortName } : {}),
    ...(description ? { description } : {}),
    country,
    ...(city ? { city } : {}),
    industry,
    ...(sector ? { sector } : {}),
    status: status as IntelligenceCompany['status'],
    ...(websiteUrl ? { websiteUrl } : {}),
    importance: importance as IntelligenceCompany['importance'],
    roles: roles as IntelligenceCompany['roles'],
  };
}

function validateProfile(
  value: unknown,
  index: number,
  companyIds: Set<string>,
  errors: string[],
): CompanyIntelligenceProfile | undefined {
  const label = `companyProfiles[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${label}: must be an object.`);
    return undefined;
  }

  const companyId = requireString(
    value,
    'companyId',
    label,
    errors,
  );
  const domains = requireStringArray(
    value,
    'domains',
    label,
    errors,
  );
  const keywords = requireStringArray(
    value,
    'keywords',
    label,
    errors,
  );
  const countries = requireStringArray(
    value,
    'countries',
    label,
    errors,
  );
  const commodities = requireStringArray(
    value,
    'commodities',
    label,
    errors,
  );

  const monitoringEnabled =
    typeof value.monitoringEnabled === 'boolean'
      ? value.monitoringEnabled
      : true;

  const relevanceScore =
    typeof value.relevanceScore === 'number'
      ? value.relevanceScore
      : 50;

  if (companyId && !companyIds.has(companyId)) {
    errors.push(
      `${label}: companyId "${companyId}" does not match any registered company.`,
    );
    return undefined;
  }

  if (
    !companyId ||
    !domains ||
    !keywords ||
    !countries ||
    !commodities
  ) {
    return undefined;
  }

  const riskLevel =
    typeof value.riskLevel === 'string'
      ? value.riskLevel
      : undefined;

  return {
    companyId,
    monitoringEnabled,
    relevanceScore,
    ...(riskLevel
      ? {
          riskLevel:
            riskLevel as CompanyIntelligenceProfile['riskLevel'],
        }
      : {}),
    domains,
    keywords,
    countries,
    commodities,
  };
}

function validateRelationship(
  value: unknown,
  index: number,
  companyIds: Set<string>,
  sourceIds: Set<string>,
  errors: string[],
): CompanySourceRelationship | undefined {
  const label = `companySourceRelationships[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${label}: must be an object.`);
    return undefined;
  }

  const id = requireString(value, 'id', label, errors);
  const companyId = requireString(
    value,
    'companyId',
    label,
    errors,
  );
  const sourceId = requireString(
    value,
    'sourceId',
    label,
    errors,
  );
  const relevance = requireString(
    value,
    'relevance',
    label,
    errors,
  );

  const active =
    typeof value.active === 'boolean' ? value.active : true;

  if (companyId && !companyIds.has(companyId)) {
    errors.push(
      `${label}: companyId "${companyId}" does not match any registered company.`,
    );
    return undefined;
  }

  if (sourceId && !sourceIds.has(sourceId)) {
    errors.push(
      `${label}: sourceId "${sourceId}" does not match any registered source.`,
    );
    return undefined;
  }

  if (!id || !companyId || !sourceId || !relevance) {
    return undefined;
  }

  const keywords = Array.isArray(value.keywords)
    ? (value.keywords as string[])
    : undefined;

  return {
    id,
    companyId,
    sourceId,
    active,
    relevance,
    ...(keywords ? { keywords } : {}),
  };
}

function collectUniqueIds(
  records: Array<{ id: string }>,
  label: string,
  errors: string[],
): Set<string> {
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) {
      errors.push(
        `${label}: duplicate id "${record.id}" — only the first occurrence is used.`,
      );
      continue;
    }

    ids.add(record.id);
  }

  return ids;
}

/**
 * Validates untrusted registry content. Invalid records are
 * excluded and reported; the result is always usable.
 */
export function validateRegistry(
  data: unknown,
): { registry: KaydaRegistry; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(data)) {
    return {
      registry: EMPTY_REGISTRY,
      errors: [
        'Registry root must be an object with sources/companies/companyProfiles/companySourceRelationships arrays.',
      ],
    };
  }

  const rawSources = Array.isArray(data.sources)
    ? data.sources
    : [];
  const rawCompanies = Array.isArray(data.companies)
    ? data.companies
    : [];
  const rawProfiles = Array.isArray(data.companyProfiles)
    ? data.companyProfiles
    : [];
  const rawRelationships = Array.isArray(
    data.companySourceRelationships,
  )
    ? data.companySourceRelationships
    : [];

  const sources = rawSources
    .map((item, index) => validateSource(item, index, errors))
    .filter(
      (item): item is RegisteredIntelligenceSource =>
        item !== undefined,
    );

  collectUniqueIds(sources, 'sources', errors);

  const companies = rawCompanies
    .map((item, index) => validateCompany(item, index, errors))
    .filter(
      (item): item is IntelligenceCompany =>
        item !== undefined,
    );

  collectUniqueIds(companies, 'companies', errors);

  const companyIds = new Set(
    companies.map((company) => company.id),
  );
  const sourceIds = new Set(
    sources.map((source) => source.id),
  );

  const companyProfiles = rawProfiles
    .map((item, index) =>
      validateProfile(item, index, companyIds, errors),
    )
    .filter(
      (item): item is CompanyIntelligenceProfile =>
        item !== undefined,
    );

  const companySourceRelationships = rawRelationships
    .map((item, index) =>
      validateRelationship(
        item,
        index,
        companyIds,
        sourceIds,
        errors,
      ),
    )
    .filter(
      (item): item is CompanySourceRelationship =>
        item !== undefined,
    );

  return {
    registry: {
      sources,
      companies,
      companyProfiles,
      companySourceRelationships,
    },
    errors,
  };
}

/**
 * Loads the user-owned runtime registry.
 *
 * - File missing: honest empty registry, no error.
 * - File unreadable or malformed: empty registry plus
 *   precise errors (contents are never echoed — the file
 *   may hold sensitive business configuration).
 */
export function loadRegistry(
  filePath: string = getRegistryFilePath(),
): RegistryLoadResult {
  if (!fs.existsSync(filePath)) {
    return {
      registry: EMPTY_REGISTRY,
      errors: [],
      filePath,
      exists: false,
    };
  }

  let raw: string;

  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return {
      registry: EMPTY_REGISTRY,
      errors: [
        `Registry file could not be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      filePath,
      exists: true,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      registry: EMPTY_REGISTRY,
      errors: [
        `Registry file is not valid JSON (${
          error instanceof Error ? error.message : String(error)
        }).`,
      ],
      filePath,
      exists: true,
    };
  }

  const { registry, errors } = validateRegistry(parsed);

  return { registry, errors, filePath, exists: true };
}
