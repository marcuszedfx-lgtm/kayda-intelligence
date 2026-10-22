import type { IntelligenceDomain } from '@/types/intelligence';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — CLASSIFICATION TAXONOMY
 * =========================================================
 *
 * This module defines the DEFAULT topical taxonomy used by
 * the article classifier.
 *
 * Design rules (non-negotiable):
 *
 * 1. The taxonomy is business-agnostic. It must never contain
 *    organisation names, company-specific terms, or terms that
 *    favour a particular business, industry vertical, or
 *    country as a PRIMARY classification.
 *
 * 2. Primary classification is TOPICAL ONLY. Geography is
 *    context, never a primary domain, because a country name
 *    appearing in an article says nothing about what kind of
 *    development it describes.
 *
 * 3. Country and region detection is generic: country names
 *    are derived from the ISO 3166-1 standard via Intl, so a
 *    newly encountered country is detected without any code
 *    change.
 *
 * 4. Organisation-specific vocabulary (keywords, commodities,
 *    aliases) belongs to per-company intelligence profiles in
 *    the runtime registry (see registry-store.ts), not here.
 * =========================================================
 */

export interface TopicalDomainRule {
  domain: IntelligenceDomain;
  weight: number;
  terms: string[];
}

/**
 * Topical domains eligible to be a primary classification.
 *
 * Commodity vocabulary (including sugar grades such as
 * ICUMSA) lives under Commodities: it describes WHAT an
 * article is about, not WHO it concerns.
 */
export const TOPICAL_DOMAIN_RULES: readonly TopicalDomainRule[] = [
  {
    domain: 'FX',
    weight: 18,
    terms: [
      'forex',
      'foreign exchange',
      'exchange rate',
      'currency',
      'fx market',
      'exchange control',
      'foreign currency',
    ],
  },
  {
    domain: 'USDT',
    weight: 20,
    terms: [
      'usdt',
      'stablecoin',
      'tether',
      'crypto',
      'cryptocurrency',
      'digital asset',
      'digital currency',
    ],
  },
  {
    domain: 'Payments',
    weight: 16,
    terms: [
      'mobile money',
      'momo',
      'payments',
      'payment system',
      'remittance',
      'settlement',
      'payment provider',
    ],
  },
  {
    domain: 'Banking',
    weight: 15,
    terms: [
      'bank',
      'banks',
      'banking',
      'central bank',
      'reserve bank',
      'interest rate',
      'monetary policy',
      'liquidity',
    ],
  },
  {
    domain: 'Trade',
    weight: 14,
    terms: [
      'export',
      'exports',
      'import',
      'imports',
      'trade',
      'customs',
      'tariff',
      'shipment',
      'shipping',
      'freight',
      'logistics',
      'port',
    ],
  },
  {
    domain: 'Commodities',
    weight: 13,
    terms: [
      'commodity',
      'commodities',
      'copper',
      'oil',
      'fuel',
      'agriculture',
      'grain',
      'fertilizer',
      'raw materials',
      'sugar',
      'icumsa',
      'refined sugar',
      'raw sugar',
      'sugar export',
      'sugar import',
    ],
  },
  {
    domain: 'Real Estate',
    weight: 12,
    terms: [
      'real estate',
      'property',
      'land',
      'housing',
      'construction',
      'commercial property',
      'residential property',
      'property market',
    ],
  },
  {
    domain: 'Technology',
    weight: 9,
    terms: [
      'technology',
      'software',
      'cloud',
      'cybersecurity',
      'automation',
      'digital transformation',
    ],
  },
  {
    domain: 'AI',
    weight: 14,
    terms: [
      'artificial intelligence',
      'machine learning',
      'generative ai',
      'agentic ai',
      'ai agent',
      'large language model',
    ],
  },
  {
    domain: 'Regulation',
    weight: 22,
    terms: [
      'regulation',
      'regulations',
      'regulator',
      'regulatory',
      'compliance',
      'licence',
      'license',
      'law',
      'legislation',
      'policy',
      'directive',
      'ban',
      'restriction',
      'sanction',
      'sanctions',
    ],
  },
  {
    domain: 'Business',
    weight: 6,
    terms: [
      'business',
      'company',
      'corporate',
      'enterprise',
      'market entry',
      'tender',
    ],
  },
  {
    domain: 'Learning',
    weight: 5,
    terms: [
      'training',
      'course',
      'certification',
      'skill development',
      'workshop',
    ],
  },
] as const;

/**
 * Domains that describe GEOGRAPHIC CONTEXT only.
 * They may appear in secondaryDomains but never as primary.
 */
export const GEOGRAPHIC_CONTEXT_DOMAINS: readonly IntelligenceDomain[] = [
  'Africa',
  'Global',
];

/**
 * Generic regional terms. Continent-scale geography is
 * recognised directly; individual country names are derived
 * from ISO 3166-1 below so no country list is hand-maintained.
 */
const REGION_TERMS: readonly string[] = [
  'africa',
  'african',
  'europe',
  'european',
  'asia',
  'asian',
  'north america',
  'south america',
  'oceania',
  'middle east',
  'global',
  'worldwide',
  'international',
];

/**
 * ISO 3166-1 alpha-2 codes (public standard technical data).
 * Used only to enumerate country names via Intl — never as a
 * source of business configuration.
 */
const ISO_3166_ALPHA2: readonly string[] = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UU UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

let cachedCountryTerms: string[] | undefined;

/**
 * Returns lowercased country/region display names derived
 * from ISO 3166-1 via Intl. Generic by construction: every
 * country in the world is detected the same way.
 */
export function getCountryTerms(): string[] {
  if (cachedCountryTerms) {
    return cachedCountryTerms;
  }

  const terms: string[] = [];

  try {
    const displayNames = new Intl.DisplayNames(['en'], {
      type: 'region',
    });

    for (const code of ISO_3166_ALPHA2) {
      const name = displayNames.of(code);

      if (name && name !== code) {
        terms.push(name.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim());
      }
    }
  } catch {
    // Intl region display names unavailable: geography
    // context degrades gracefully to REGION_TERMS only.
  }

  cachedCountryTerms = Array.from(new Set(terms));
  return cachedCountryTerms;
}

/**
 * Generic geographic context terms (continents + every ISO
 * country name). Used for context detection only.
 */
export function getGeographicContextTerms(): string[] {
  return [...REGION_TERMS, ...getCountryTerms()];
}

/**
 * Decision-queue domain groupings. Kept here as the single
 * source of truth so scoring logic cannot drift away from
 * the taxonomy.
 */
export const MARKET_DOMAINS: readonly IntelligenceDomain[] = [
  'FX',
  'USDT',
  'Banking',
  'Trade',
  'Commodities',
  'Real Estate',
  'Global',
];

export const OPERATIONAL_DOMAINS: readonly IntelligenceDomain[] = [
  'Payments',
  'Banking',
  'Trade',
  'Commodities',
  'Real Estate',
  'Regulation',
];

export const LEARNING_DOMAINS: readonly IntelligenceDomain[] = [
  'Technology',
  'AI',
  'Learning',
];
