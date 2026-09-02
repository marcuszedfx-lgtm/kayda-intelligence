import type {
  IntelligenceFeed,
  IntelligenceSource,
  IntelligenceSourceType,
} from '@/types/intelligence';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — SOURCE REGISTRY
 * =========================================================
 *
 * This registry is the central definition of external
 * intelligence sources used by Kayda Intelligence.
 *
 * IMPORTANT:
 *
 * A source is NOT the same thing as a company.
 *
 * A company may eventually have:
 *
 * - official website
 * - newsroom
 * - investor relations page
 * - RSS feed
 * - WordPress API
 * - government/regulatory records
 * - industry publications
 * - market sources
 * - research sources
 *
 * Step 5A establishes a clean registry so that future
 * company onboarding does not require scattering source
 * definitions throughout the application.
 *
 * Later steps will make this registry database-driven and
 * connect companies to multiple sources automatically.
 * =========================================================
 */

export interface RegisteredIntelligenceSource {
  id: string;
  name: string;
  sourceType: IntelligenceSourceType;
  publisher: string;
  credibility: number;
  active: boolean;

  /**
   * Canonical website.
   */
  websiteUrl: string;

  /**
   * Optional machine-readable feed.
   */
  feedUrl?: string;

  /**
   * How Kayda should retrieve information.
   */
  feedType: 'RSS' | 'Atom' | 'API' | 'Manual';

  /**
   * Optional descriptive tags.
   *
   * These will become important when automatic source
   * discovery and company intelligence profiles are added.
   */
  tags: string[];

  /**
   * Domains this source is especially relevant to.
   */
  domains: string[];
}

/**
 * =========================================================
 * REGISTERED SOURCES
 * =========================================================
 */

export const intelligenceSourceRegistry: RegisteredIntelligenceSource[] = [
  {
    id: 'source-zambia-sugar',
    name: 'Zambia Sugar Intelligence',
    sourceType: 'News',
    publisher: 'Zambia Sugar',
    credibility: 90,
    active: true,
    websiteUrl: 'https://zamsugar.co.zm/',
    feedType: 'Manual',
    tags: [
      'zambia-sugar',
      'sugar',
      'agriculture',
      'commodity',
      'manufacturing',
      'zambia',
    ],
    domains: [
      'Sugar',
      'Commodities',
      'Trade',
      'Zambia',
      'Business',
    ],
  },

  {
    id: 'source-lusaka-times',
    name: 'Lusaka Times',
    sourceType: 'News',
    publisher: 'Lusaka Times',
    credibility: 82,
    active: true,
    websiteUrl: 'https://www.lusakatimes.com/',
    feedType: 'Manual',
    tags: [
      'zambia',
      'lusaka',
      'business',
      'economy',
      'politics',
      'markets',
      'news',
    ],
    domains: [
      'Zambia',
      'Business',
      'Market',
      'Regulation',
      'Trade',
    ],
  },

  {
    id: 'source-zambian-regulatory',
    name: 'Zambian Regulatory Intelligence',
    sourceType: 'Regulator',
    publisher: 'Zambia Revenue Authority',
    credibility: 95,
    active: true,
    websiteUrl: 'https://www.zra.org.zm/',
    feedUrl: 'https://www.zra.org.zm/wp-json/wp/v2/posts',
    feedType: 'API',
    tags: [
      'zra',
      'tax',
      'customs',
      'trade',
      'imports',
      'exports',
      'compliance',
      'zambia',
      'regulation',
    ],
    domains: [
      'Regulation',
      'Trade',
      'Zambia',
      'Business',
    ],
  },
];

/**
 * =========================================================
 * REGISTRY HELPERS
 * =========================================================
 */

export function getRegisteredSources(): RegisteredIntelligenceSource[] {
  return intelligenceSourceRegistry.filter((source) => source.active);
}

export function getRegisteredSourceById(
  sourceId: string,
): RegisteredIntelligenceSource | undefined {
  return intelligenceSourceRegistry.find(
    (source) => source.id === sourceId,
  );
}

export function searchRegisteredSources(
  query: string,
): RegisteredIntelligenceSource[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getRegisteredSources();
  }

  return getRegisteredSources().filter((source) => {
    const searchableText = [
      source.id,
      source.name,
      source.publisher,
      source.sourceType,
      source.websiteUrl,
      ...source.tags,
      ...source.domains,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Convert the new registry format into the existing
 * IntelligenceSource structure.
 */
export function registeredSourceToIntelligenceSource(
  source: RegisteredIntelligenceSource,
): IntelligenceSource {
  return {
    id: source.id,
    name: source.name,
    sourceType: source.sourceType,
    publisher: source.publisher,
    credibility: source.credibility,
    active: source.active,
    feedUrl: source.feedUrl,
    websiteUrl: source.websiteUrl,
  };
}

/**
 * Convert the registry source into the existing
 * IntelligenceFeed structure.
 *
 * This keeps the current ingestion engine backward
 * compatible while we progressively upgrade the system.
 */
export function registeredSourceToFeed(
  source: RegisteredIntelligenceSource,
): IntelligenceFeed {
  return {
    id: `feed-${source.id.replace(/^source-/, '')}`,
    name: source.name,
    sourceType: source.sourceType,
    publisher: source.publisher,
    credibility: source.credibility,
    active: source.active,
    url: source.websiteUrl,
    feedUrl: source.feedUrl,
    feedType: source.feedType,
    sourceId: source.id,
    status: 'Active',
  };
}

/**
 * Return the current feed representation expected by
 * the existing live ingestion layer.
 */
export function getRegisteredIntelligenceFeeds(): IntelligenceFeed[] {
  return getRegisteredSources().map(registeredSourceToFeed);
}
