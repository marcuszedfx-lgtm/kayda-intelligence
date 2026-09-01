/**
 * =========================================================
 * KAYDA INTELLIGENCE V1.5
 * STEP 5B — COMPANY INTELLIGENCE TYPES
 * =========================================================
 *
 * A Company is an intelligence entity.
 *
 * IMPORTANT:
 *
 * Company ≠ Business
 * Company ≠ Intelligence Source
 *
 * A Company represents an external organisation/entity that
 * Kayda may need to monitor.
 *
 * A Business represents an internal Kayda operating record.
 *
 * An Intelligence Source represents where information comes
 * from.
 *
 * The relationship will eventually become:
 *
 * COMPANY
 *    ↓
 * COMPANY ↔ SOURCE
 *    ↓
 * INTELLIGENCE SIGNAL
 *    ↓
 * KAYDA BUSINESS / DEAL / RISK
 * =========================================================
 */

export type CompanyStatus =
  | 'Active'
  | 'Monitoring'
  | 'Inactive'
  | 'Archived';

export type CompanyImportance =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low';

export type CompanyRole =
  | 'Supplier'
  | 'Buyer'
  | 'Customer'
  | 'Counterparty'
  | 'Competitor'
  | 'Regulator'
  | 'Bank'
  | 'Payment Provider'
  | 'Technology Provider'
  | 'Market Participant'
  | 'Partner'
  | 'Potential Partner'
  | 'Government Entity'
  | 'Industry Body'
  | 'Other';

/**
 * Core intelligence identity of a company.
 */
export interface IntelligenceCompany {
  id: string;
  name: string;

  /**
   * Optional legal/registered name.
   */
  legalName?: string;

  /**
   * Optional shorter/common trading name.
   */
  shortName?: string;

  description?: string;

  country: string;
  city?: string;

  industry: string;
  sector?: string;

  status: CompanyStatus;

  websiteUrl?: string;

  /**
   * How important this company is to Kayda's
   * intelligence operation.
   */
  importance: CompanyImportance;

  /**
   * How the company relates to Kayda's operations.
   */
  roles: CompanyRole[];
}

/**
 * Intelligence configuration attached to a company.
 *
 * This is intentionally separate from the core company
 * identity so monitoring configuration can evolve without
 * changing the company record itself.
 */
export interface CompanyIntelligenceProfile {
  companyId: string;

  /**
   * Whether Kayda should actively monitor this company.
   */
  monitoringEnabled: boolean;

  /**
   * Overall intelligence relevance to Kayda.
   * 0 = irrelevant
   * 100 = extremely relevant
   */
  relevanceScore: number;

  /**
   * Optional operational risk classification.
   */
  riskLevel?: 'Critical' | 'High' | 'Medium' | 'Low';

  /**
   * Intelligence domains associated with the company.
   *
   * Examples:
   * Sugar
   * Commodities
   * Trade
   * Regulation
   * Finance
   */
  domains: string[];

  /**
   * Terms used by the intelligence engine when matching
   * incoming information.
   */
  keywords: string[];

  /**
   * Countries relevant to the company's intelligence profile.
   */
  countries: string[];

  /**
   * Commodities/products relevant to monitoring.
   */
  commodities: string[];
}

/**
 * Relationship between an intelligence company and a
 * registered intelligence source.
 *
 * Many companies can use the same source.
 *
 * One company can have many sources.
 *
 * This creates a many-to-many relationship without coupling
 * the company registry to the source registry.
 */
export interface CompanySourceRelationship {
  id: string;

  companyId: string;
  sourceId: string;

  active: boolean;

  /**
   * Why this source is relevant to the company.
   */
  relevance: string;

  /**
   * Optional source-specific keywords used when monitoring
   * this company through this source.
   */
  keywords?: string[];
}
